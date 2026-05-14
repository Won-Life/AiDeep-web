'use client';
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
  type DragEvent,
} from 'react';
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
  type Edge,
  ConnectionMode,
  ConnectionLineType,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import * as d3 from 'd3';
import { nodeTypes } from '@/types/nodeTypes';
import { edgeTypes } from '@/types/edgeTypes';
import {
  createMdNode,
  moveNode,
  deleteNode,
  updateNodeContent,
  EMPTY_LEXICAL_JSON,
} from '../api/nodes';
import { emitLivePosition, emitCursorMove } from '@/api/ws';
import { createEdge, deleteEdge } from '../api/edges';
import type { EdgeDto, NodeDto } from '../types';
import { rectCollide } from '../layout/rectCollide';
import { getRandomColorPair, DEFAULT_NODE_COLOR } from '../constants/colors';
import { getDescendantIds } from '../utils/graphUtils';
import { useCursors } from '@/hooks/useCursors';
import { useWorkspaceAwareness } from '@/hooks/useWorkspaceAwareness';
import { getCursorColor } from '@/utils/cursorColor';
import CursorOverlay from './CursorOverlay';
import { MdBody, type WorkspaceRole } from '@/api/types';

// TODO: 실제 노드 너비로 변경
const NODE_WIDTH = 200;
const NODE_HEIGHT = 48;
const NODE_PADDING = 0; // 완전히 부딪힐 때만 충돌
const HUB_OFFSET = 50;
const DEFAULT_NODE_DISTANCE = 100; // 노드 간 기본 거리

function getParentId(nodeId: string, edges: Edge[]): string | null {
  const incoming = edges.find((edge) => edge.target === nodeId);
  return incoming?.source ?? null;
}

function getAncestorIds(nodeId: string, edges: Edge[]): Set<string> {
  const ancestors = new Set<string>();
  let current = getParentId(nodeId, edges);
  while (current) {
    ancestors.add(current);
    current = getParentId(current, edges);
  }
  return ancestors;
}

function getMainNodeForSubtree(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
): Node | undefined {
  const currentNode = nodes.find((n) => n.id === nodeId);
  if (currentNode?.data?.isMain) return currentNode;

  const ancestors = getAncestorIds(nodeId, edges);
  for (const ancestorId of ancestors) {
    const ancestor = nodes.find((n) => n.id === ancestorId);
    if (ancestor?.data?.isMain) return ancestor;
  }

  return undefined;
}

function getGraphColor(
  parentNodeId: string,
  nodes: Node[],
  edges: Edge[],
): { bg: string; text: string } {
  const parentNode = nodes.find((n) => n.id === parentNodeId);

  if (parentNode?.data?.isMain) {
    const children = edges
      .filter((e) => e.source === parentNodeId)
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter((n): n is Node => n !== undefined);

    // 기본 색상이 아닌 커스텀 색상을 가진 첫 번째 자식의 색상을 사용
    const coloredChild = children.find((child) =>
      isCustomColorNode(child.id, nodes),
    );
    if (coloredChild) {
      return {
        bg: coloredChild.data.color as string,
        text:
          (coloredChild.data.textColor as string) || DEFAULT_NODE_COLOR.text,
      };
    }

    return getRandomColorPair();
  }

  if (parentNode?.data?.color) {
    return {
      bg: parentNode.data.color as string,
      text: (parentNode.data.textColor as string) || DEFAULT_NODE_COLOR.text,
    };
  }

  return getRandomColorPair();
}

function isCustomColorNode(nodeId: string, nodes: Node[]): boolean {
  const node = nodes.find((n) => n.id === nodeId);
  const color = node?.data?.color as string | undefined;
  return Boolean(color && color !== DEFAULT_NODE_COLOR.bg);
}

function updateSubtreeColors(
  rootId: string,
  nodes: Node[],
  edges: Edge[],
  colorPair: { bg: string; text: string },
): Node[] {
  const descendantIds = getDescendantIds(rootId, edges);
  const idsToUpdate = new Set([rootId, ...descendantIds]);

  return nodes.map((node) =>
    idsToUpdate.has(node.id) && !node.data?.isMain
      ? {
          ...node,
          data: {
            ...node.data,
            color: colorPair.bg,
            textColor: colorPair.text,
          },
        }
      : node,
  );
}

function areSiblings(aId: string, bId: string, edges: Edge[]): boolean {
  const parentA = getParentId(aId, edges);
  const parentB = getParentId(bId, edges);
  return parentA !== null && parentA === parentB;
}

function isInvalidConnection(
  sourceId: string,
  targetId: string,
  edges: Edge[],
): boolean {
  if (sourceId === targetId) return true;

  // 둘이 서로 연결되어 있는지 확인
  const targetParent = getParentId(targetId, edges);
  const sourceParent = getParentId(sourceId, edges);
  if (targetParent === sourceId || sourceParent === targetId) return true;

  return false;
}

function rectForNode(node: Node) {
  return {
    left: node.position.x,
    right: node.position.x + NODE_WIDTH,
    top: node.position.y,
    bottom: node.position.y + NODE_HEIGHT,
  };
}

function isOverlapping(a: Node, b: Node): boolean {
  const rectA = rectForNode(a);
  const rectB = rectForNode(b);

  return !(
    rectA.right + NODE_PADDING < rectB.left ||
    rectA.left > rectB.right + NODE_PADDING ||
    rectA.bottom + NODE_PADDING < rectB.top ||
    rectA.top > rectB.bottom + NODE_PADDING
  );
}

function canApplyMove(
  nodes: Node[],
  movingIds: Set<string>,
  delta: { x: number; y: number },
): boolean {
  const movingNodes = nodes.filter((node) => movingIds.has(node.id));
  const staticNodes = nodes.filter((node) => !movingIds.has(node.id));

  return movingNodes.every((node) => {
    const movedNode = {
      ...node,
      position: {
        x: node.position.x + delta.x,
        y: node.position.y + delta.y,
      },
    };

    return staticNodes.every((other) => !isOverlapping(movedNode, other));
  });
}

function findOverlapTarget(dragged: Node, nodes: Node[]): Node | null {
  for (const node of nodes) {
    if (node.id === dragged.id) continue;
    if (isOverlapping(dragged, node)) return node;
  }
  return null;
}

// AABB 테두리 간 최단 거리 기반으로 가장 가까운 유효한 노드 찾기
function findClosestNodeInRange(
  draggedNode: Node,
  nodes: Node[],
  edges: Edge[],
  threshold: number = 50, // 픽셀 단위 임계값
): Node | null {
  let closestNode: Node | null = null;
  let minDistance = threshold;

  // 드래그 중인 노드의 실제 크기
  const draggedWidth = draggedNode.width ?? NODE_WIDTH;
  const draggedHeight = draggedNode.height ?? NODE_HEIGHT;

  // 드래그 중인 노드의 AABB 경계 계산 (중심점 기준)
  const draggedCenterX = draggedNode.position.x + draggedWidth / 2;
  const draggedCenterY = draggedNode.position.y + draggedHeight / 2;
  const ax1 = draggedCenterX - draggedWidth / 2;
  const ay1 = draggedCenterY - draggedHeight / 2;
  const ax2 = draggedCenterX + draggedWidth / 2;
  const ay2 = draggedCenterY + draggedHeight / 2;

  for (const node of nodes) {
    if (node.id === draggedNode.id) continue;

    // 연결 유효성 체크
    if (isInvalidConnection(node.id, draggedNode.id, edges)) continue;

    // 대상 노드의 실제 크기
    const nodeWidth = node.width ?? NODE_WIDTH;
    const nodeHeight = node.height ?? NODE_HEIGHT;

    // 대상 노드의 AABB 경계 계산 (중심점 기준)
    const nodeCenterX = node.position.x + nodeWidth / 2;
    const nodeCenterY = node.position.y + nodeHeight / 2;
    const bx1 = nodeCenterX - nodeWidth / 2;
    const by1 = nodeCenterY - nodeHeight / 2;
    const bx2 = nodeCenterX + nodeWidth / 2;
    const by2 = nodeCenterY + nodeHeight / 2;

    // y축 범위가 겹치지 않으면 제외 (위아래로는 감지 안 함)
    if (ay2 < by1 || ay1 > by2) continue;

    // x축 방향 거리만 계산 (좌우 방향으로만 감지)
    const dx = Math.max(0, Math.max(ax1, bx1) - Math.min(ax2, bx2));
    const distance = dx;

    if (distance < minDistance) {
      minDistance = distance;
      closestNode = node;
    }
  }

  return closestNode;
}

function findNonOverlappingPosition(
  base: { x: number; y: number },
  nodes: Node[],
): { x: number; y: number } {
  const candidate = (x: number, y: number) =>
    ({
      id: '__drag_candidate__',
      position: { x, y },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      data: {},
    }) as Node;

  if (!nodes.some((node) => isOverlapping(candidate(base.x, base.y), node))) {
    return base;
  }

  const step = 16;
  const maxRadius = 12;
  for (let r = 1; r <= maxRadius; r += 1) {
    const radius = r * step;
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI / 4) * i;
      const x = base.x + Math.round(Math.cos(angle) * radius);
      const y = base.y + Math.round(Math.sin(angle) * radius);
      if (!nodes.some((node) => isOverlapping(candidate(x, y), node))) {
        return { x, y };
      }
    }
  }

  return base;
}

function getForcedOutboundSideForSubNodeInMainGraph(
  node: Node,
  nodes: Node[],
  edges: Edge[],
): 'left' | 'right' | null {
  if (node.data?.isMain) return null;

  const mainNode = getMainNodeForSubtree(node.id, nodes, edges);
  if (!mainNode) return null;

  const parentId = getParentId(node.id, edges);
  const parentNode = parentId
    ? nodes.find((n) => n.id === parentId)
    : undefined;
  const referenceX = parentNode?.position.x ?? mainNode.position.x;

  // root 노드의 반대 방향(바깥쪽)으로만 새 연결을 허용
  return getTargetSideRelativeToParent(node.position.x, referenceX);
}

function resolveSideFromEdgeHandle(
  edge: Edge,
  sourceNode: Node,
  targetNode: Node,
): 'left' | 'right' {
  if (edge.sourceHandle?.includes('left')) return 'left';
  if (edge.sourceHandle?.includes('right')) return 'right';

  return getTargetSideRelativeToParent(
    targetNode.position.x,
    sourceNode.position.x,
  );
}

function getTargetSideRelativeToParent(
  targetX: number,
  parentX: number,
): 'left' | 'right' {
  return targetX < parentX ? 'left' : 'right';
}

/**
 * Source 노드 기준으로 target 노드의 X/Y 좌표를 적절히 조정
 * X는 연결 방향 기준 고정 거리, Y는 같은 방향 형제 노드와 간격을 유지하도록 보정
 * @param sourceNode - 부모(source) 노드
 * @param originalY - 생성/드롭된 Y 좌표
 * @param side - 연결 방향 ("left" 또는 "right")
 * @param nodes - 현재 노드 목록
 * @param edges - 현재 엣지 목록
 * @param excludeNodeId - Y 충돌 검사에서 제외할 노드 ID (재연결 시 자기 자신 제외)
 */
function adjustPositionRelativeToSource(
  sourceNode: Node,
  originalY: number,
  side: 'left' | 'right',
  nodes: Node[],
  edges: Edge[],
  excludeNodeId?: string,
  targetNode?: Node | null,
): { x: number; y: number } {
  const sourceWidth = sourceNode?.width ?? NODE_WIDTH;
  const targetWidth = targetNode?.width ?? NODE_WIDTH;

  // 연결 방향에 따라 X 좌표 계산
  const targetX =
    side === 'right'
      ? sourceNode.position.x + sourceWidth + DEFAULT_NODE_DISTANCE
      : sourceNode.position.x - targetWidth - DEFAULT_NODE_DISTANCE;

  const siblingYs = edges
    .filter(
      (edge) => edge.source === sourceNode.id && edge.target !== excludeNodeId,
    )
    .map((edge) => {
      const targetNode = nodes.find((node) => node.id === edge.target);
      if (!targetNode) return null;
      return {
        node: targetNode,
        edgeSide: resolveSideFromEdgeHandle(edge, sourceNode, targetNode),
      };
    })
    .filter(
      (item): item is { node: Node; edgeSide: 'left' | 'right' } =>
        item !== null,
    )
    .filter((item) => item.edgeSide === side)
    .map((item) => item.node.position.y);

  const verticalGap = NODE_HEIGHT + 24;
  const isYAvailable = (y: number) =>
    siblingYs.every((siblingY) => Math.abs(siblingY - y) >= verticalGap);

  let targetY = originalY;
  if (!isYAvailable(targetY)) {
    for (let i = 1; i <= 20; i++) {
      const upperY = originalY - i * verticalGap;
      if (isYAvailable(upperY)) {
        targetY = upperY;
        break;
      }

      const lowerY = originalY + i * verticalGap;
      if (isYAvailable(lowerY)) {
        targetY = lowerY;
        break;
      }
    }
  }

  return {
    x: targetX,
    y: targetY,
  };
}

function resolveHandleId(
  role: 'source' | 'target',
  side: 'left' | 'right',
): string {
  // source 핸들: side 방향과 같은 방향에 위치 (예: side="right" → source-right)
  // target 핸들: source의 반대 방향에 위치 (예: side="right"이면 target이 source 오른쪽에 있으므로 → target-left)
  if (role === 'target') {
    return `target-${side === 'left' ? 'right' : 'left'}`;
  }
  return `source-${side}`;
}

function buildEdgePresentation(edge: Edge, nodes: Node[], edges: Edge[]): Edge {
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  if (!source || !target) return edge;

  const forcedSourceSide = getForcedOutboundSideForSubNodeInMainGraph(
    source,
    nodes,
    edges,
  );
  // target.data.handleSide는 topology 변경 시점(connect/drag-stop)에만 갱신되므로
  // 드래그 중 position이 바뀌어도 sourceHandle/targetHandle이 유지되도록 한다.
  const storedSide = target.data?.handleSide as 'left' | 'right' | undefined;
  const side =
    storedSide ??
    forcedSourceSide ??
    getTargetSideRelativeToParent(target.position.x, source.position.x);
  const sourceHandle = resolveHandleId('source', side);
  const targetHandle = resolveHandleId('target', side);
  const sourceHandleX =
    source.position.x +
    (side === 'right'
      ? (source.measured?.width ?? source.width ?? NODE_WIDTH)
      : 0);

  return {
    ...edge,
    type: 'branch',
    sourceHandle,
    targetHandle,
    data: {
      ...edge.data,
      hubX: sourceHandleX + (side === 'right' ? HUB_OFFSET : -HUB_OFFSET),
      hubY: source.position.y + NODE_HEIGHT / 2,
    },
  };
}

function mirrorSubtree(
  nodes: Node[],
  rootId: string,
  edges: Edge[],
  parentAxisX: number,
): Node[] {
  const subtreeIds = getDescendantIds(rootId, edges); // rootId 제외, 자식들만
  const beforePositions = new Map(
    nodes
      .filter((node) => subtreeIds.has(node.id))
      .map((node) => [node.id, { x: node.position.x, y: node.position.y }]),
  );

  const next = nodes.map((node) =>
    subtreeIds.has(node.id)
      ? {
          ...node,
          position: {
            x: parentAxisX * 2 - node.position.x - (node.width ?? NODE_WIDTH),
            y: node.position.y,
          },
        }
      : node,
  );

  if (subtreeIds.size > 0) {
    const diffs = next
      .filter((node) => subtreeIds.has(node.id))
      .map((node) => {
        const before = beforePositions.get(node.id);
        return {
          id: node.id,
          beforeX: before?.x,
          beforeY: before?.y,
          afterX: node.position.x,
          afterY: node.position.y,
        };
      });
    console.log('[mirrorSubtree] before/after', diffs);
  }

  return next;
}

function initializeHandleSides(nodes: Node[], edges: Edge[]): Node[] {
  return nodes.map((node) => {
    if (node.data?.isMain) return node;

    // Case 1: target 노드 (부모가 있음) → incoming edge의 sourceHandle로 방향 결정
    const incomingEdge = edges.find((e) => e.target === node.id);
    if (incomingEdge) {
      const side: 'left' | 'right' | undefined =
        incomingEdge.sourceHandle?.includes('right')
          ? 'right'
          : incomingEdge.sourceHandle?.includes('left')
            ? 'left'
            : undefined;
      return {
        ...node,
        data: { ...node.data, handleSide: side, hasParent: true },
      };
    }

    // Case 2: source 전용 노드 (부모 없음) → outgoing edges의 sourceHandle로 방향 결정
    const outgoingEdges = edges.filter((e) => e.source === node.id);
    if (outgoingEdges.length === 0) return node;

    const sides = outgoingEdges.map((e) =>
      e.sourceHandle?.includes('right')
        ? ('right' as const)
        : ('left' as const),
    );
    const allSame = sides.every((s) => s === sides[0]);
    return {
      ...node,
      data: { ...node.data, handleSide: allSame ? sides[0] : undefined },
    };
  });
}

// D3 force simulation용 노드 타입
interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphCanvasInnerProps {
  workspaceId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: WorkspaceRole;
  focusedNodeId: string | null;
  onFocusComplete?: () => void;
  nodes: Node[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
}

export function convertToReactFlow(
  graphNodes: NodeDto[],
  graphEdges: EdgeDto[],
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = graphNodes.map((n) => ({
    id: n.node_id,
    type: 'textUpdater',
    position: { x: n.position_x, y: n.position_y },
    data: {
      title: n.title,
      color: n.content?.color ?? DEFAULT_NODE_COLOR.bg,
      textColor: n.content?.textColor ?? DEFAULT_NODE_COLOR.text,
      isMain: n.node_type === 'PROJECT',
      nodeType: n.node_type,
    },
  }));

  const rawEdges: Edge[] = graphEdges.map((e) => ({
    id: e.edge_id,
    source: e.source_id,
    target: e.target_id,
    type: 'branch',
    sourceHandle: e.source_handle,
    targetHandle: e.target_handle,
    data: {},
  }));

  const nodesWithHandleSide = initializeHandleSides(nodes, rawEdges);

  const edges: Edge[] = rawEdges.map((edge) =>
    buildEdgePresentation(edge, nodesWithHandleSide, rawEdges),
  );

  return { nodes: nodesWithHandleSide, edges };
}

function GraphCanvasInner({
  workspaceId,
  currentUserId,
  currentUserName,
  currentUserRole,
  focusedNodeId,
  onFocusComplete,
  nodes,
  edges,
  setNodes,
  setEdges,
}: GraphCanvasInnerProps) {
  const [openNodeIds, setOpenNodeIds] = useState<string[]>([]);
  const [localFocusedNodeId, setLocalFocusedNodeId] = useState<string | null>(
    null,
  );
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(
    null,
  );
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [pendingArchiveNodeIds, setPendingArchiveNodeIds] = useState<string[]>(
    [],
  );

  const { screenToFlowPosition, setCenter } = useReactFlow();

  // ─── Workspace Awareness ─────────────────────────────────────────
  const cursorColor = getCursorColor(currentUserId);

  // Remote toggle: only open (add to openNodeIds + focus), never close
  const handleRemoteToggle = useCallback(
    (event: { nodeId: string | null; isOpen: boolean }) => {
      if (!event.isOpen || !event.nodeId) return;
      const nodeId = event.nodeId;
      setOpenNodeIds((prev) =>
        prev.includes(nodeId) ? prev : [...prev, nodeId],
      );
      setLocalFocusedNodeId(nodeId);
    },
    [],
  );

  const { nodeViewers, setFocusedNodeId } = useWorkspaceAwareness({
    workspaceId,
    userName: currentUserName,
    userColor: cursorColor,
    role: currentUserRole,
    onRemoteToggle: handleRemoteToggle,
  });

  // Sync localFocusedNodeId → awareness
  useEffect(() => {
    setFocusedNodeId(localFocusedNodeId);
  }, [localFocusedNodeId, setFocusedNodeId]);

  // viewport 저장 (debounce)
  const viewportSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedViewport = useRef<{ x: number; y: number; zoom: number } | null>(
    (() => {
      if (typeof window === 'undefined') return null;
      try {
        const raw = sessionStorage.getItem(`graph_viewport_${workspaceId}`);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })(),
  );

  const handleViewportChange = useCallback(
    (viewport: { x: number; y: number; zoom: number }) => {
      if (viewportSaveTimer.current) clearTimeout(viewportSaveTimer.current);
      viewportSaveTimer.current = setTimeout(() => {
        try {
          sessionStorage.setItem(
            `graph_viewport_${workspaceId}`,
            JSON.stringify(viewport),
          );
        } catch {}
      }, 300);
    },
    [workspaceId],
  );

  // D3 force simulation 관리
  const simulationRef = useRef<d3.Simulation<D3Node, undefined> | null>(null);
  const d3NodesRef = useRef<D3Node[]>([]);
  const isDraggingRef = useRef(false);
  const nodesRef = useRef<Node[]>(nodes);
  nodesRef.current = nodes;
  const contentSaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const previousDragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isConnectingRef = useRef(false);
  const lastLiveEmitRef = useRef(0);
  const LIVE_EMIT_INTERVAL = 50; // ms

  // ─── Cursor sharing ──────────────────────────────────────
  /*
    CONTEXT:
      본인 커서: 브라우저 기본 커서를 그대로 사용.
               WS round-trip을 거치면 필연적으로 지연이 발생하고, 손 아이콘 등 커스텀 상태를 오버레이로 그리는 복잡성 대비 실익이 없어 제거함.
      상대방 커서: WS로 수신한 위치를 CursorOverlay에서 PointerIcon + 이름 뱃지로 렌더링.
  */
  const cursors = useCursors(workspaceId, currentUserId);
  const lastCursorEmitRef = useRef(0);
  const CURSOR_EMIT_INTERVAL = 30; // ms

  // TODO: 워크스페이스에 혼자 있을 때는 emit을 끊는 최적화 가능 (현재는 항상 emit)
  const screenToFlowPositionRef = useRef(screenToFlowPosition);
  const cursorMetaRef = useRef({
    workspaceId,
    currentUserName,
    cursorColor,
  });

  useEffect(() => {
    screenToFlowPositionRef.current = screenToFlowPosition;
  }, [screenToFlowPosition]);

  useEffect(() => {
    cursorMetaRef.current = {
      workspaceId,
      currentUserName,
      cursorColor,
    };
  }, [workspaceId, currentUserName, cursorColor]);

  useEffect(() => {
    const handler = (event: PointerEvent) => {
      const { workspaceId, currentUserName, cursorColor } =
        cursorMetaRef.current;
      const flowPos = screenToFlowPositionRef.current({
        x: event.clientX,
        y: event.clientY,
      });

      const now = Date.now();
      if (now - lastCursorEmitRef.current < CURSOR_EMIT_INTERVAL) return;
      lastCursorEmitRef.current = now;
      emitCursorMove(
        workspaceId,
        flowPos.x,
        flowPos.y,
        currentUserName,
        cursorColor,
      );
    };
    // document 레벨 pointermove > 캔버스 외부로 드래그 및 다른 마우스 동작에서도 상대방 커서 추적 가능하도록
    document.addEventListener('pointermove', handler);
    return () => document.removeEventListener('pointermove', handler);
  }, []); // 마운트/언마운트 시 1회만 등록 — 최신 값은 ref로 접근

  // contentSaveTimers cleanup on unmount
  useEffect(() => {
    return () => {
      contentSaveTimers.current.forEach((timer) => clearTimeout(timer));
      contentSaveTimers.current.clear();
    };
  }, []);

  /* =========================
     D3 Force Simulation 초기화
     ========================= */
  useEffect(() => {
    const simulation = d3
      .forceSimulation<D3Node>()
      .force('collide', rectCollide<D3Node>(NODE_PADDING))
      .alphaDecay(0.02) // 더 빠른 안정화
      .velocityDecay(0.4); // 움직임의 감쇠

    // tick 이벤트: d3의 계산 결과를 React Flow nodes에 반영
    simulation.on('tick', () => {
      if (!isDraggingRef.current) return;

      const d3Nodes = d3NodesRef.current;
      if (d3Nodes.length === 0) return;

      setNodes((currentNodes) => {
        return currentNodes.map((node) => {
          const d3Node = d3Nodes.find((d) => d.id === node.id);
          if (!d3Node) return node;

          // D3는 중심점 기준, React Flow는 왼쪽 상단 기준이므로 변환
          const nodeWidth = node.width ?? NODE_WIDTH;
          const nodeHeight = node.height ?? NODE_HEIGHT;

          return {
            ...node,
            position: {
              x: (d3Node.x ?? node.position.x + nodeWidth / 2) - nodeWidth / 2,
              y:
                (d3Node.y ?? node.position.y + nodeHeight / 2) - nodeHeight / 2,
            },
          };
        });
      });
    });

    // alpha가 충분히 작아지면 시뮬레이션 멈춤
    simulation.on('end', () => {
      console.log('Simulation ended');
    });

    simulationRef.current = simulation;

    // cleanup
    return () => {
      simulation.stop();
    };
  }, []);

  /* =========================
     Node data update
     ========================= */
  const handleNodeViewChange = useCallback(
    (nodeId: string, newData: Record<string, unknown>) => {
      setNodes((snapshot) =>
        snapshot.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...newData } }
            : node,
        ),
      );
    },
    [],
  );

  const titleDebounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const handleClosePanel = useCallback((nodeId: string) => {
    setOpenNodeIds((prev) => prev.filter((id) => id !== nodeId));
    setLocalFocusedNodeId((prev) => (prev === nodeId ? null : prev));
  }, []);

  const handleFocusPanel = useCallback((nodeId: string) => {
    setLocalFocusedNodeId(nodeId);
  }, []);

  const handleTitleChange = useCallback(
    (nodeId: string, value: string) => {
      handleNodeViewChange(nodeId, { title: value });

      const existing = titleDebounceRef.current.get(nodeId);
      if (existing) clearTimeout(existing);

      titleDebounceRef.current.set(
        nodeId,
        setTimeout(() => {
          updateNodeContent(workspaceId, nodeId, { title: value }).catch(
            console.error,
          );
          titleDebounceRef.current.delete(nodeId);
        }, 500),
      );
    },
    [workspaceId, handleNodeViewChange],
  );
  const nodesWithCallbacks = nodes.map((node) => {
    const parentId = getParentId(node.id, edges);

    // 부모가 없는 서브 노드는 양쪽에 핸들 표시
    const hasParent = parentId !== null;

    const isContextMenuOpen = contextMenuNodeId === node.id;
    const isEditorOpen = openNodeIds.includes(node.id);

    return {
      ...node,
      zIndex: isContextMenuOpen ? 1000 : isEditorOpen ? 100 : undefined,
      data: {
        ...node.data,
        handleSide: node.data?.isMain ? undefined : node.data?.handleSide,
        hasParent, // 부모 노드 존재 여부 전달
        showInputBox: openNodeIds.includes(node.id), // 열린 노드에 입력박스 표시
        isContextMenuOpen, // 컨텍스트 메뉴 표시 여부
        panelZIndex: node.id === localFocusedNodeId ? 30 : 20, // 포커스된 패널이 위
        isHovered: hoveredNodeId === node.id, // 드래그 중 hover된 노드 표시
        workspaceId, // 전체화면 이동 시 사용
        viewers: nodeViewers[node.id] ?? [], // 현재 이 노드를 보고 있는 다른 유저들
        onClosePanel: handleClosePanel,
        onFocusPanel: handleFocusPanel,
        onChange: handleTitleChange,
      },
    };
  });

  /* =========================
     React Flow handlers
     ========================= */
  const requestArchiveForNodes = useCallback(
    (rootNodeIds: string[]) => {
      const subtreeNodeIds = new Set<string>();

      rootNodeIds.forEach((rootId) => {
        subtreeNodeIds.add(rootId);
        const descendants = getDescendantIds(rootId, edges);
        descendants.forEach((id) => subtreeNodeIds.add(id));
      });

      setPendingArchiveNodeIds(Array.from(subtreeNodeIds));
      setIsArchiveModalOpen(true);
    },
    [edges],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const removedNodeIds = changes
        .filter((change) => change.type === 'remove')
        .map((change) => change.id);

      if (removedNodeIds.length > 0) {
        requestArchiveForNodes(removedNodeIds);
      }

      const nonRemoveChanges = changes.filter(
        (change) => change.type !== 'remove',
      );
      if (nonRemoveChanges.length === 0) return;

      setNodes((snapshot) => applyNodeChanges(nonRemoveChanges, snapshot));
    },
    [requestArchiveForNodes],
  );

  const onBeforeDelete = useCallback(
    async ({ nodes: nodesToDelete }: { nodes: Node[]; edges: Edge[] }) => {
      if (nodesToDelete.length > 0) {
        requestArchiveForNodes(nodesToDelete.map((node) => node.id));
        return false;
      }

      return true;
    },
    [requestArchiveForNodes],
  );

  const handleCancelArchive = useCallback(() => {
    setIsArchiveModalOpen(false);
    setPendingArchiveNodeIds([]);
  }, []);

  const handleConfirmArchive = useCallback(async () => {
    if (pendingArchiveNodeIds.length === 0) {
      setIsArchiveModalOpen(false);
      return;
    }

    const idsToArchive = new Set(pendingArchiveNodeIds);

    // BE 삭제 API 호출 (병렬)
    try {
      await Promise.all(
        pendingArchiveNodeIds.map((nodeId) => deleteNode(workspaceId, nodeId)),
      );
    } catch (error) {
      console.error('[handleConfirmArchive] deleteNode failed', error);
      // 실패 시 모달만 닫고 로컬 state 유지
      setPendingArchiveNodeIds([]);
      setIsArchiveModalOpen(false);
      return;
    }

    // 로컬 state 즉시 업데이트
    setEdges((snapshot) =>
      snapshot.filter(
        (edge) =>
          !idsToArchive.has(edge.source) && !idsToArchive.has(edge.target),
      ),
    );
    setNodes((snapshot) =>
      snapshot.filter((node) => !idsToArchive.has(node.id)),
    );
    setHoveredNodeId((prev) => (prev && idsToArchive.has(prev) ? null : prev));
    setOpenNodeIds((prev) => prev.filter((id) => !idsToArchive.has(id)));
    setLocalFocusedNodeId((prev) =>
      prev && idsToArchive.has(prev) ? null : prev,
    );
    setPendingArchiveNodeIds([]);
    setIsArchiveModalOpen(false);
  }, [pendingArchiveNodeIds, workspaceId]);

  useEffect(() => {
    setEdges((snapshot) => {
      const updated = snapshot.map((edge) =>
        buildEdgePresentation(edge, nodes, snapshot),
      );
      const isSame =
        updated.length === snapshot.length &&
        updated.every((edge, index) => {
          const prev = snapshot[index];
          return (
            edge.type === prev.type &&
            edge.sourceHandle === prev.sourceHandle &&
            edge.targetHandle === prev.targetHandle &&
            edge.data?.hubX === prev.data?.hubX &&
            edge.data?.hubY === prev.data?.hubY
          );
        });
      return isSame ? snapshot : updated;
    });
  }, [nodes, edges.length]);

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removeChanges = changes.filter(
        (change) => change.type === 'remove',
      );
      const nonRemoveChanges = changes.filter(
        (change) => change.type !== 'remove',
      );

      if (isArchiveModalOpen) {
        if (nonRemoveChanges.length === 0) return;
        setEdges((snapshot) => applyEdgeChanges(nonRemoveChanges, snapshot));
        return;
      }

      // non-remove 변경은 즉시 적용
      if (nonRemoveChanges.length > 0) {
        setEdges((snapshot) => applyEdgeChanges(nonRemoveChanges, snapshot));
      }

      // remove 변경은 API 호출 성공 후에만 state 업데이트
      if (removeChanges.length > 0) {
        setEdges((snapshot) => {
          const removedEdges = removeChanges
            .map((change) => snapshot.find((edge) => edge.id === change.id))
            .filter((edge): edge is Edge => edge !== undefined);

          if (removedEdges.length === 0) return snapshot;

          Promise.all(
            removedEdges.map((edge) => deleteEdge(workspaceId, edge.id)),
          )
            .then(() => {
              setEdges((prev) => {
                const updatedEdges = applyEdgeChanges(removeChanges, prev);

                setNodes((currentNodes) => {
                  let updatedNodes = currentNodes;

                  removedEdges.forEach((edge) => {
                    const remainingParentId = getParentId(
                      edge.target,
                      updatedEdges,
                    );
                    const remainingParent = remainingParentId
                      ? updatedNodes.find((n) => n.id === remainingParentId)
                      : null;
                    const color = remainingParent
                      ? getGraphColor(
                          remainingParentId!,
                          updatedNodes,
                          updatedEdges,
                        )
                      : DEFAULT_NODE_COLOR;
                    updatedNodes = updateSubtreeColors(
                      edge.target,
                      updatedNodes,
                      updatedEdges,
                      color,
                    );

                    updateNodeContent(workspaceId, edge.target, {
                      color: color.bg,
                      textColor: color.text,
                      propagateToChildren: true,
                    }).catch((err) =>
                      console.error(
                        '[updateNodeContent after edge delete] failed',
                        err,
                      ),
                    );
                  });

                  return updatedNodes;
                });

                return updatedEdges;
              });
            })
            .catch((err) => {
              console.error('[deleteEdge] failed', err);
            });

          return snapshot; // API 응답 전까지 state 유지
        });
      }
    },
    [isArchiveModalOpen, workspaceId, setEdges, setNodes],
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      if (!connection.source || !connection.target) return false;

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return false;

      // 기존 유효성 체크
      if (isInvalidConnection(connection.source, connection.target, edges)) {
        return false;
      }

      // 같은 그래프 내 노드끼리는 연결 불가 (main ↔ 서브 재연결 방지)
      const sourceMain = getMainNodeForSubtree(connection.source, nodes, edges);
      const targetMain = getMainNodeForSubtree(connection.target, nodes, edges);
      if (sourceMain && targetMain && sourceMain.id === targetMain.id) {
        return false;
      }

      return true;
    },
    [nodes, edges],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);
      const sourceIsMain = sourceNode?.data?.isMain === true;
      const targetIsMain = targetNode?.data?.isMain === true;

      // 케이스 2: target은 main 그래프 하위, source는 어떤 main 그래프에도 속하지 않음
      const targetInMainGraph =
        getMainNodeForSubtree(params.target, nodes, edges) !== undefined;
      const sourceInMainGraph =
        getMainNodeForSubtree(params.source, nodes, edges) !== undefined;

      // 케이스 3: source는 엣지가 없는 단독 노드, target은 1개 이상 연결됨
      const sourceEdgeCount = edges.filter(
        (e) => e.source === params.source || e.target === params.source,
      ).length;
      const targetEdgeCount = edges.filter(
        (e) => e.source === params.target || e.target === params.target,
      ).length;

      const shouldSwap =
        // 케이스 1: main 노드는 항상 부모
        ((sourceIsMain || targetIsMain) && !sourceIsMain) ||
        // 케이스 2: main 그래프에 속한 노드가 부모
        (targetInMainGraph && !sourceInMainGraph) ||
        // 케이스 3: 1개 이상의 연결된 노드를 가지는 노드가 부모
        (sourceEdgeCount === 0 && targetEdgeCount > 0);

      const sourceId = shouldSwap ? params.target : params.source;
      const targetId = shouldSwap ? params.source : params.target;

      const srcNode = nodes.find((n) => n.id === sourceId);
      const tgtNode = nodes.find((n) => n.id === targetId);
      const targetNodeSideRelativeToParent =
        srcNode && tgtNode
          ? getTargetSideRelativeToParent(
              tgtNode.position.x,
              srcNode.position.x,
            )
          : 'right';
      // swap 후 source쪽 핸들 (loose mode: source-*, strict: source-* 또는 target-*)
      const rawSourceHandle = shouldSwap
        ? params.targetHandle
        : params.sourceHandle;
      // 핸들 이름에서 side 추출 — loose/strict/swap 조합 무관하게 'right'/'left' 포함 여부로 판별
      const sideFromHandle: 'left' | 'right' | null = rawSourceHandle?.includes(
        'right',
      )
        ? 'right'
        : rawSourceHandle?.includes('left')
          ? 'left'
          : null;
      const computedSide: 'left' | 'right' =
        sideFromHandle ?? targetNodeSideRelativeToParent;
      // 항상 올바른 source-*/target-* 형태로 정규화 (loose mode의 source-to-source 대응)
      const resolvedSourceHandle = `source-${computedSide}`;
      const resolvedTargetHandle = resolveHandleId('target', computedSide);

      // 연결된 target 노드 위치(및 subtree)와 색상을 source 기준으로 업데이트
      setNodes((currentNodes) => {
        const sourceNode = currentNodes.find((node) => node.id === sourceId);
        const targetNode = currentNodes.find((node) => node.id === targetId);

        let positionedNodes = currentNodes;
        if (sourceNode && targetNode) {
          const adjustedPosition = adjustPositionRelativeToSource(
            sourceNode,
            targetNode.position.y,
            computedSide,
            currentNodes,
            edges,
            targetNode.id,
            targetNode,
          );

          const deltaX = adjustedPosition.x - targetNode.position.x;
          const deltaY = adjustedPosition.y - targetNode.position.y;
          if (deltaX !== 0 || deltaY !== 0) {
            const childrenIds = getDescendantIds(targetNode.id, edges);
            const affectedNodeIds = new Set([targetNode.id, ...childrenIds]);
            positionedNodes = currentNodes.map((node) =>
              affectedNodeIds.has(node.id)
                ? {
                    ...node,
                    position: {
                      x: node.position.x + deltaX,
                      y: node.position.y + deltaY,
                    },
                  }
                : node,
            );
          }

          // 연결 방향이 확정된 시점에 handleSide를 node.data에 저장
          positionedNodes = positionedNodes.map((node) =>
            node.id === targetId
              ? { ...node, data: { ...node.data, handleSide: computedSide } }
              : node,
          );
        }

        const sourceHasCustomColor = isCustomColorNode(sourceId, currentNodes);
        const targetHasCustomColor = isCustomColorNode(targetId, currentNodes);

        if (!shouldSwap && sourceHasCustomColor && targetHasCustomColor) {
          return positionedNodes;
        }

        const graphColor = getGraphColor(sourceId, positionedNodes, edges);
        return updateSubtreeColors(
          targetId,
          positionedNodes,
          edges,
          graphColor,
        );
      });

      // 색상 전파 여부 판단 (setNodes 내부 로직과 동일 조건)
      const sourceHasCustomColor = isCustomColorNode(sourceId, nodes);
      const targetHasCustomColor = isCustomColorNode(targetId, nodes);
      const shouldSkipColor =
        !shouldSwap && sourceHasCustomColor && targetHasCustomColor;
      const colorToPropagate = shouldSkipColor
        ? null
        : getGraphColor(sourceId, nodes, edges);
      createEdge(
        workspaceId,
        sourceId,
        targetId,
        resolvedSourceHandle,
        resolvedTargetHandle,
      )
        .then(({ edgeId }) => {
          setEdges((snapshot) => {
            if (snapshot.some((e) => e.id === edgeId)) return snapshot;
            const rawEdge: Edge = {
              id: edgeId,
              source: sourceId,
              target: targetId,
            };
            return [
              ...snapshot,
              buildEdgePresentation(rawEdge, nodes, [...snapshot, rawEdge]),
            ];
          });

          if (colorToPropagate) {
            updateNodeContent(workspaceId, targetId, {
              color: colorToPropagate.bg,
              textColor: colorToPropagate.text,
              propagateToChildren: true,
            }).catch((err) => console.error('[updateNodeColor] failed', err));
          }
        })
        .catch((err) => console.error('[createEdge] failed', err));
    },
    [nodes, edges, workspaceId],
  );

  /* =========================
     핸들 드래그로 빈 공간에 새 노드 생성
     ========================= */
  const onConnectStart = useCallback(() => {
    isConnectingRef.current = true;
  }, []);

  const onConnectEnd = useCallback(
    async (event: MouseEvent | TouchEvent, connectionState: any) => {
      // 기존 노드에 연결되지 않았을 때 (빈 공간에 드롭)
      if (!connectionState.isValid) {
        // 마우스 위치 가져오기
        const { clientX, clientY } =
          'changedTouches' in event ? event.changedTouches[0] : event;

        // flow 좌표로 변환
        const originalPosition = screenToFlowPosition({
          x: clientX,
          y: clientY,
        });

        // source 노드 찾기
        const sourceNode = nodes.find(
          (n) => n.id === connectionState.fromNode.id,
        );
        if (!sourceNode) return;

        // 어느 핸들에서 연결이 시작되었는지 확인
        const fromHandle = connectionState.fromHandle?.id || '';
        let side: 'left' | 'right';

        const forcedSourceSide = getForcedOutboundSideForSubNodeInMainGraph(
          sourceNode,
          nodes,
          edges,
        );

        if (forcedSourceSide) {
          side = forcedSourceSide;
        } else if (fromHandle.includes('left')) {
          side = 'left';
        } else if (fromHandle.includes('right')) {
          side = 'right';
        } else {
          const parentId = getParentId(sourceNode.id, edges);
          const parentNode = parentId
            ? nodes.find((n) => n.id === parentId)
            : undefined;
          const mainNode = getMainNodeForSubtree(sourceNode.id, nodes, edges);
          const referenceX =
            parentNode?.position.x ?? mainNode?.position.x ?? 0;
          side = getTargetSideRelativeToParent(
            sourceNode.position.x,
            referenceX,
          );
        }

        // source 노드 기준으로 적절한 거리에 위치 조정
        const adjustedPosition = adjustPositionRelativeToSource(
          sourceNode,
          originalPosition.y,
          side,
          nodes,
          edges,
        );

        // source 노드의 색상 가져오기
        const colorPair = getGraphColor(
          connectionState.fromNode.id,
          nodes,
          edges,
        );

        try {
          // API: 노드 생성 → 실제 UUID 획득
          const { nodeId: realNodeId } = await createMdNode(
            workspaceId,
            '새 노드',
            adjustedPosition,
            {
              markdownBody: '',
              jsonBody: EMPTY_LEXICAL_JSON,
              color: colorPair.bg,
              textColor: colorPair.text,
            },
          );

          // 실제 UUID로 로컬 노드 추가
          const newNode: Node = {
            id: realNodeId,
            type: 'textUpdater',
            position: adjustedPosition,
            data: {
              title: '',
              isMain: false,
              color: colorPair.bg,
              textColor: colorPair.text,
            },
          };

          setNodes((nds) => {
            if (nds.some((n) => n.id === realNodeId)) return nds;
            return [...nds, newNode];
          });
          // API: BE가 발급한 edgeId로 엣지 추가
          const { edgeId } = await createEdge(
            workspaceId,
            connectionState.fromNode.id,
            realNodeId,
            fromHandle || `source-${side}`,
            `target-${side === 'left' ? 'right' : 'left'}`,
          );
          setEdges((eds) => {
            if (eds.some((e) => e.id === edgeId)) return eds;
            const rawEdge: Edge = {
              id: edgeId,
              source: connectionState.fromNode.id,
              target: realNodeId,
            };
            return [
              ...eds,
              buildEdgePresentation(
                rawEdge,
                [...nodes, newNode],
                [...eds, rawEdge],
              ),
            ];
          });
        } catch (err) {
          console.error('[onConnectEnd] node/edge creation failed', err);
        }
      }

      // onPaneClick이 실행되지 않도록 약간의 딜레이 후 플래그 해제
      setTimeout(() => {
        isConnectingRef.current = false;
      }, 0);
    },
    [screenToFlowPosition, nodes, edges, workspaceId],
  );

  /* =========================
     Node right-click → open context menu
     ========================= */
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenuNodeId(node.id);
    },
    [],
  );

  /* =========================
     Node click → toggle input box
     ========================= */
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setOpenNodeIds((prev) => {
      if (prev.includes(node.id)) {
        // 이미 열려 있으면 포커스만 이동
        return prev;
      }
      return [...prev, node.id];
    });
    setLocalFocusedNodeId(node.id);
  }, []);

  /* =========================
     Empty pane click → create node
     ========================= */
  const onPaneClick = useCallback(
    async (event: React.MouseEvent) => {
      // 연결 드래그 중이면 노드 생성하지 않음
      if (isConnectingRef.current) return;

      // 컨텍스트 메뉴가 열려 있으면 닫기
      if (contextMenuNodeId) {
        setContextMenuNodeId(null);
        return;
      }

      // (선택) 우클릭은 제외
      if (event.button !== 0) return;

      // wrapper 기준 좌표로 변환 (screenToFlowPosition은 clientX/Y 기반으로 처리)
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      try {
        const colorPair = getRandomColorPair();
        const body = {
          markdownBody: '',
          jsonBody: EMPTY_LEXICAL_JSON,
          color: colorPair.bg,
          textColor: colorPair.text,
        } as MdBody;

        const { nodeId } = await createMdNode(workspaceId, '', position, body);

        const newNode: Node = {
          id: nodeId,
          type: 'textUpdater',
          position,
          data: {
            title: '',
            isMain: false,
            color: colorPair.bg,
            textColor: colorPair.text,
          },
        };

        setNodes((prev) => {
          if (prev.some((n) => n.id === nodeId)) return prev;
          return [...prev, newNode];
        });
      } catch (err) {
        console.error('[onPaneClick] createMdNode failed', err);
      }
    },
    [screenToFlowPosition, workspaceId, contextMenuNodeId],
  );

  const onDragOver = useCallback(
    (event: DragEvent) => {
      const types = Array.from(event.dataTransfer.types);
      if (!types.includes('application/resource-subitem')) return;

      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const draggedPreview: Node = {
        id: '__drag_preview__',
        type: 'textUpdater',
        position,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        data: {},
      };

      const closestNode = findClosestNodeInRange(draggedPreview, nodes, edges);
      const isInvalid =
        closestNode &&
        isInvalidConnection(closestNode.id, draggedPreview.id, edges);
      setHoveredNodeId(isInvalid ? null : (closestNode?.id ?? null));
    },
    [screenToFlowPosition, nodes, edges],
  );

  const onDrop = useCallback(
    async (event: DragEvent) => {
      const raw = event.dataTransfer.getData('application/resource-subitem');
      if (!raw) return;
      event.preventDefault();

      let payload: { id: string; name: string; markdownBody?: string; jsonBody?: string } | null = null;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      if (!payload?.name) return;

      const basePosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const targetParent =
        hoveredNodeId && nodes.find((node) => node.id === hoveredNodeId);
      const shouldConnect =
        targetParent && !isInvalidConnection(targetParent.id, '__new__', edges);

      // root 노드 → 위치 기반, depth>0 노드 → 부모의 handleSide 계승
      const dropSide: 'left' | 'right' | undefined =
        shouldConnect && targetParent
          ? getParentId(targetParent.id, edges) !== null
            ? ((targetParent.data?.handleSide as
                | 'left'
                | 'right'
                | undefined) ??
              getTargetSideRelativeToParent(
                basePosition.x,
                targetParent.position.x,
              ))
            : getTargetSideRelativeToParent(
                basePosition.x,
                targetParent.position.x,
              )
          : undefined;

      const position =
        shouldConnect && targetParent && dropSide
          ? adjustPositionRelativeToSource(
              targetParent,
              basePosition.y,
              dropSide,
              nodes,
              edges,
            )
          : findNonOverlappingPosition(basePosition, nodes);

      const colorPair = shouldConnect
        ? getGraphColor(targetParent.id, nodes, edges)
        : DEFAULT_NODE_COLOR;

      let nodeId: string;
      try {
        const res = await createMdNode(workspaceId, payload.name, position, {
          markdownBody: payload.markdownBody ?? '',
          jsonBody: payload.jsonBody ?? EMPTY_LEXICAL_JSON,
          color: colorPair.bg,
          textColor: colorPair.text,
        });
        nodeId = res.nodeId;
      } catch (err) {
        console.error('[onDrop] createMdNode failed', err);
        setHoveredNodeId(null);
        return;
      }

      const newNode: Node = {
        id: nodeId,
        type: 'textUpdater',
        position,
        data: {
          title: payload.name,
          isMain: false,
          color: colorPair.bg,
          textColor: colorPair.text,
        },
      };

      setNodes((prev) => [...prev, newNode]);

      if (shouldConnect && targetParent && dropSide) {
        createEdge(
          workspaceId,
          targetParent.id,
          nodeId,
          `source-${dropSide}`,
          `target-${dropSide === 'left' ? 'right' : 'left'}`,
        )
          .then(({ edgeId }) => {
            setEdges((prev) => {
              if (prev.some((e) => e.id === edgeId)) return prev;
              const rawEdge: Edge = {
                id: edgeId,
                source: targetParent.id,
                target: nodeId,
              };
              return [
                ...prev,
                buildEdgePresentation(
                  rawEdge,
                  [...nodes, newNode],
                  [...prev, rawEdge],
                ),
              ];
            });
          })
          .catch((err) => console.error('[onDrop] createEdge failed', err));
      }

      setHoveredNodeId(null);
    },
    [
      screenToFlowPosition,
      setNodes,
      setEdges,
      nodes,
      edges,
      hoveredNodeId,
      workspaceId,
    ],
  );

  const onDragLeave = useCallback((event: DragEvent) => {
    const types = Array.from(event.dataTransfer.types);
    if (!types.includes('application/resource-subitem')) return;
    setHoveredNodeId(null);
  }, []);

  const onNodeDragStart = useCallback(
    (event: React.MouseEvent, draggedNode: Node) => {
      // hover 상태 초기화
      setHoveredNodeId(null);

      // D3 force simulation 시작
      isDraggingRef.current = true;

      // 드래그 노드와 자식들을 함께 고정
      const childrenIds = getDescendantIds(draggedNode.id, edges);
      const fixedNodeIds = new Set([draggedNode.id, ...childrenIds]);

      // React Flow nodes에서 d3 노드 데이터 추출
      const d3Nodes: D3Node[] = nodes.map((n) => ({
        id: n.id,
        x: n.position.x + (n.width ?? NODE_WIDTH) / 2, // 중심점으로 변환
        y: n.position.y + (n.height ?? NODE_HEIGHT) / 2,
        width: n.width ?? NODE_WIDTH,
        height: n.height ?? NODE_HEIGHT,
        // 드래그 노드와 그 자식들은 모두 고정
        fx: fixedNodeIds.has(n.id)
          ? n.position.x + (n.width ?? NODE_WIDTH) / 2
          : null,
        fy: fixedNodeIds.has(n.id)
          ? n.position.y + (n.height ?? NODE_HEIGHT) / 2
          : null,
      }));

      d3NodesRef.current = d3Nodes;

      // 시뮬레이션에 노드 데이터 주입 및 reheat
      const simulation = simulationRef.current;
      if (simulation) {
        simulation.nodes(d3Nodes);
        simulation.alpha(1).alphaTarget(0.3).restart();
      }

      // 드래그 시작 시 현재 위치 저장 (delta 계산용)
      previousDragPositionRef.current = {
        x: draggedNode.position.x,
        y: draggedNode.position.y,
      };
    },
    [nodes, edges],
  );

  const onNodeDrag = useCallback(
    (event: React.MouseEvent, draggedNode: Node) => {
      // 드래그 중에 가까운 노드 찾기
      const closestNode = findClosestNodeInRange(draggedNode, nodes, edges);
      // 이미 연결된 노드는 hover 효과 제외
      const isInvalid =
        closestNode &&
        isInvalidConnection(closestNode.id, draggedNode.id, edges);
      setHoveredNodeId(isInvalid ? null : (closestNode?.id ?? null));

      // 좌우 전환 시 서브트리 대칭 이동 + 노드/엣지 핸들 및 hub 정보 업데이트
      // dragged node 자체는 사용자가 드래그하는 위치를 따라가므로 위치 변경 없음
      let didMirrorSubtree = false;
      const previousPosition = previousDragPositionRef.current;
      if (previousPosition && !draggedNode.data?.isMain) {
        const mainNode = getMainNodeForSubtree(draggedNode.id, nodes, edges);
        const isDirectChildOfMain =
          mainNode && getParentId(draggedNode.id, edges) === mainNode.id;
        if (mainNode && isDirectChildOfMain) {
          const mainAxisX = mainNode.position.x + NODE_WIDTH / 2;
          const nodeWidth = draggedNode.width ?? NODE_WIDTH;
          const nodeHeight = draggedNode.height ?? NODE_HEIGHT;
          const beforeCenterX = previousPosition.x + nodeWidth / 2;
          const afterCenterX = draggedNode.position.x + nodeWidth / 2;
          const afterCenterY = draggedNode.position.y + nodeHeight / 2;
          const beforeSide = beforeCenterX < mainAxisX ? 'left' : 'right';
          const afterSide = afterCenterX < mainAxisX ? 'left' : 'right';

          if (beforeSide !== afterSide) {
            const newSide: 'left' | 'right' = afterSide;
            const subtreeIds = getDescendantIds(draggedNode.id, edges);
            const beforeDraggedCenterY = previousPosition.y + nodeHeight / 2;

            // 1. 서브트리 노드들: dragged node 기준 거리 유지 + 방향 반전
            const newSubtreeCenters = new Map<
              string,
              { x: number; y: number }
            >();

            d3NodesRef.current.forEach((d3Node) => {
              if (!subtreeIds.has(d3Node.id)) return;
              const distanceX = (d3Node.x ?? 0) - beforeCenterX; // 이전 프레임 subtree 노드 - dragged 사이 거리
              const distanceY = (d3Node.y ?? 0) - beforeDraggedCenterY;
              const newCenterX = afterCenterX - distanceX;
              const newCenterY = afterCenterY + distanceY;
              d3Node.x = newCenterX;
              d3Node.y = newCenterY;
              if (d3Node.fx != null) d3Node.fx = newCenterX;
              if (d3Node.fy != null) d3Node.fy = newCenterY;
              newSubtreeCenters.set(d3Node.id, {
                x: newCenterX,
                y: newCenterY,
              });
            });

            // 2. handleSide 업데이트: dragged node + 서브트리 모두 newSide로
            setNodes((currentNodes) =>
              currentNodes.map((node) => {
                if (node.id === draggedNode.id || subtreeIds.has(node.id)) {
                  return {
                    ...node,
                    data: { ...node.data, handleSide: newSide },
                  };
                }
                return node;
              }),
            );

            // 3. 엣지 업데이트
            const newSourceHandle = resolveHandleId('source', newSide);
            const newTargetHandle = resolveHandleId('target', newSide);

            setEdges((currentEdges) =>
              currentEdges.map((edge) => {
                // mainNode와 draggedNode 사이 엣지 정보 업데이트: source 노드는 mainNode (위치 불변), 사용하는 source handle side만 바뀜
                if (
                  edge.source === mainNode.id &&
                  edge.target === draggedNode.id
                ) {
                  const srcWidth = mainNode.width ?? NODE_WIDTH;
                  // position.x 기준: right → position.x + width, left → position.x
                  const srcHandleX =
                    mainNode.position.x + (newSide === 'right' ? srcWidth : 0);
                  return {
                    ...edge,
                    sourceHandle: newSourceHandle,
                    targetHandle: newTargetHandle,
                    data: {
                      ...edge.data,
                      hubX:
                        srcHandleX +
                        (newSide === 'right' ? HUB_OFFSET : -HUB_OFFSET),
                      hubY: mainNode.position.y + NODE_HEIGHT / 2,
                    },
                  };
                }

                // 서브트리 엣지: sourceHandle/targetHandle은 newSide 재사용,
                // hubX/Y는 이동한 source의 새 center 기반으로 재계산
                const isSourceDragged = edge.source === draggedNode.id;
                const isSourceInSubtree = subtreeIds.has(edge.source);
                if (isSourceDragged || isSourceInSubtree) {
                  const srcCenter = isSourceDragged
                    ? { x: afterCenterX, y: afterCenterY }
                    : newSubtreeCenters.get(edge.source);
                  if (!srcCenter) return edge;

                  const srcNode = nodes.find((n) => n.id === edge.source);
                  const srcWidth = srcNode?.width ?? NODE_WIDTH;
                  // d3 center → position.x: centerX - width/2
                  // right handle: position.x + width = centerX + width/2
                  // left handle: position.x = centerX - width/2
                  const srcHandleX =
                    srcCenter.x +
                    (newSide === 'right' ? srcWidth / 2 : -srcWidth / 2);
                  return {
                    ...edge,
                    sourceHandle: newSourceHandle,
                    targetHandle: newTargetHandle,
                    data: {
                      ...edge.data,
                      hubX:
                        srcHandleX +
                        (newSide === 'right' ? HUB_OFFSET : -HUB_OFFSET),
                      hubY: srcCenter.y,
                    },
                  };
                }

                return edge;
              }),
            );

            didMirrorSubtree = true;
          }
        }
      }

      // 부모가 움직인 거리(delta) 계산
      const delta = previousDragPositionRef.current
        ? {
            x: draggedNode.position.x - previousDragPositionRef.current.x,
            y: draggedNode.position.y - previousDragPositionRef.current.y,
          }
        : { x: 0, y: 0 };

      // 현재 위치를 다음 계산을 위해 저장
      previousDragPositionRef.current = {
        x: draggedNode.position.x,
        y: draggedNode.position.y,
      };

      // D3 시뮬레이션에서 드래그 중인 노드의 고정 위치 업데이트
      const d3Node = d3NodesRef.current.find((n) => n.id === draggedNode.id);
      if (d3Node) {
        d3Node.fx =
          draggedNode.position.x + (draggedNode.width ?? NODE_WIDTH) / 2;
        d3Node.fy =
          draggedNode.position.y + (draggedNode.height ?? NODE_HEIGHT) / 2;
      }

      // 자식 노드들도 delta만큼 이동 (대칭 이동한 프레임은 제외, Alt 키 누르면 단독 이동)
      if (!didMirrorSubtree && !event.altKey) {
        const childrenIds = getDescendantIds(draggedNode.id, edges);

        childrenIds.forEach((childId) => {
          const d3ChildNode = d3NodesRef.current.find((n) => n.id === childId);
          if (d3ChildNode && d3ChildNode.fx != null && d3ChildNode.fy != null) {
            // 기존 fx/fy에 delta를 더해서 부모와 함께 이동
            d3ChildNode.fx += delta.x;
            d3ChildNode.fy += delta.y;
          }
        });
      }

      // WS: 실시간 위치 브로드캐스트 (50ms throttle)
      const now = Date.now();
      if (now - lastLiveEmitRef.current >= LIVE_EMIT_INTERVAL) {
        lastLiveEmitRef.current = now;
        emitLivePosition(
          workspaceId,
          draggedNode.id,
          draggedNode.position.x,
          draggedNode.position.y,
        );
      }
    },
    [nodes, edges, workspaceId],
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, draggedNode: Node) => {
      // hover-snap 발생 시 adjustedPosition을 추적하여 moveNode에 전달
      let finalPosition = draggedNode.position;

      // hover된 노드가 있으면 연결 생성
      if (hoveredNodeId) {
        const newParent = nodes.find((n) => n.id === hoveredNodeId);
        const draggedIsMain = draggedNode.data?.isMain === true;
        if (
          newParent &&
          !isInvalidConnection(
            draggedIsMain ? draggedNode.id : newParent.id,
            draggedIsMain ? newParent.id : draggedNode.id,
            edges,
          )
        ) {
          // source/target 역할 결정: main 노드가 드래그된 경우 항상 source
          const parentNode = draggedIsMain ? draggedNode : newParent;
          const childNode = draggedIsMain ? newParent : draggedNode;

          // 1. 기존 부모와의 연결 끊기 (childNode 기준)
          const existingParentEdge = edges.find(
            (edge) => edge.target === childNode.id,
          );

          // 2. 연결 방향 결정
          // 부모 노드가 root인 경우: 자식 노드의 위치 기준 (부모 좌우 어디에 있나)
          // 부모 노드가 depth>0 인 경우: 자식 노드는 부모 노드의 handleSide 계승 (같은 방향으로 뻗어나감)
          const parentHasParent = getParentId(parentNode.id, edges) !== null;
          const sideRelativeToParent: 'left' | 'right' = parentHasParent
            ? ((parentNode.data?.handleSide as 'left' | 'right' | undefined) ??
              getTargetSideRelativeToParent(
                childNode.position.x,
                parentNode.position.x,
              ))
            : getTargetSideRelativeToParent(
                childNode.position.x,
                parentNode.position.x,
              );

          // 3. childNode 위치를 parentNode 기준으로 조정
          const adjustedPosition = adjustPositionRelativeToSource(
            parentNode,
            childNode.position.y,
            sideRelativeToParent,
            nodes,
            edges,
            childNode.id,
            childNode,
          );

          // draggedNode가 child인 경우에만 finalPosition 갱신
          if (!draggedIsMain) {
            finalPosition = adjustedPosition;
          }

          // 4. childNode와 서브트리의 위치를 조정된 위치로 이동
          const deltaX = adjustedPosition.x - childNode.position.x;
          const deltaY = adjustedPosition.y - childNode.position.y;

          setNodes((currentNodes) => {
            const childrenIds = getDescendantIds(childNode.id, edges);
            const affectedNodeIds = new Set([childNode.id, ...childrenIds]);

            return currentNodes.map((node) => {
              if (node.id === childNode.id) {
                return {
                  ...node,
                  position: {
                    x: node.position.x + deltaX,
                    y: node.position.y + deltaY,
                  },
                  data: { ...node.data, handleSide: sideRelativeToParent },
                };
              }
              if (affectedNodeIds.has(node.id)) {
                return {
                  ...node,
                  position: {
                    x: node.position.x + deltaX,
                    y: node.position.y + deltaY,
                  },
                };
              }
              return node;
            });
          });

          // 5. 서브트리 대칭 이동이 필요한지 확인 후 실행
          const childrenIds = getDescendantIds(childNode.id, edges);
          if (childrenIds.size > 0) {
            const adjustedCenterX =
              adjustedPosition.x + (childNode.width ?? NODE_WIDTH) / 2;

            const childNodes = nodes.filter((n) => childrenIds.has(n.id));
            const avgChildCenterX =
              childNodes.reduce(
                (sum, n) =>
                  sum + n.position.x + deltaX + (n.width ?? NODE_WIDTH) / 2,
                0,
              ) / childNodes.length;

            const needsMirror =
              sideRelativeToParent === 'right'
                ? avgChildCenterX < adjustedCenterX
                : avgChildCenterX > adjustedCenterX;

            if (needsMirror) {
              setNodes((currentNodes) =>
                mirrorSubtree(
                  currentNodes,
                  childNode.id,
                  edges,
                  adjustedCenterX,
                ),
              );
            }
          }

          // 6. 엣지 업데이트 (기존 부모 연결 끊고, 새 부모 연결)
          // 기존 부모 연결 먼저 제거
          setEdges((prev) =>
            existingParentEdge
              ? prev.filter((edge) => edge.id !== existingParentEdge.id)
              : prev,
          );

          // API: BE가 발급한 edgeId로 새 부모 연결 추가
          const dragStopColor = getGraphColor(parentNode.id, nodes, edges);
          createEdge(
            workspaceId,
            parentNode.id,
            childNode.id,
            `source-${sideRelativeToParent}`,
            `target-${sideRelativeToParent === 'left' ? 'right' : 'left'}`,
          )
            .then(({ edgeId }) => {
              setEdges((prev) => {
                if (prev.some((e) => e.id === edgeId)) return prev;
                const rawEdge: Edge = {
                  id: edgeId,
                  source: parentNode.id,
                  target: childNode.id,
                };
                return [
                  ...prev,
                  buildEdgePresentation(rawEdge, nodes, [...prev, rawEdge]),
                ];
              });

              updateNodeContent(workspaceId, childNode.id, {
                color: dragStopColor.bg,
                textColor: dragStopColor.text,
                propagateToChildren: true,
              }).catch((err) =>
                console.error('[updateNodeColor drag] failed', err),
              );
            })
            .catch((err) =>
              console.error('[createEdge re-parent] failed', err),
            );

          // 7. childNode 서브트리 색상을 parentNode 색상으로 업데이트
          setNodes((currentNodes) => {
            const graphColor = getGraphColor(
              parentNode.id,
              currentNodes,
              edges,
            );
            return updateSubtreeColors(
              childNode.id,
              currentNodes,
              edges,
              graphColor,
            );
          });
        }
      }

      // D3 시뮬레이션 종료: fx, fy 해제 및 alphaTarget(0) 설정
      isDraggingRef.current = false;

      // 드래그 노드와 자식들의 fx, fy 모두 해제
      const childrenIds = getDescendantIds(draggedNode.id, edges);
      const allNodesToRelease = [draggedNode.id, ...childrenIds];

      allNodesToRelease.forEach((nodeId) => {
        const d3Node = d3NodesRef.current.find((n) => n.id === nodeId);
        if (d3Node) {
          d3Node.fx = null;
          d3Node.fy = null;
        }
      });

      const simulation = simulationRef.current;
      if (simulation) {
        simulation.alphaTarget(0);
      }

      // hover 상태 초기화
      setHoveredNodeId(null);

      // 드래그 위치 초기화
      previousDragPositionRef.current = null;

      // API: 드래그된 노드 위치 저장 (hover-snap 시 adjustedPosition 사용)
      moveNode(workspaceId, draggedNode.id, {
        x: finalPosition.x,
        y: finalPosition.y,
      }).catch((err) => console.error('[moveNode] failed', err));

      // API: 함께 이동된 자식 노드들 위치 저장
      const draggedChildrenIds = getDescendantIds(draggedNode.id, edges);
      draggedChildrenIds.forEach((childId) => {
        const d3Child = d3NodesRef.current.find((n) => n.id === childId);
        if (d3Child?.fx != null && d3Child?.fy != null) {
          const childNode = nodes.find((n) => n.id === childId);
          const childWidth = childNode?.width ?? NODE_WIDTH;
          const childHeight = childNode?.height ?? NODE_HEIGHT;
          moveNode(workspaceId, childId, {
            x: d3Child.fx - childWidth / 2,
            y: d3Child.fy - childHeight / 2,
          }).catch((err) =>
            console.error(`[moveNode child ${childId}] failed`, err),
          );
        }
      });
    },
    [nodes, edges, hoveredNodeId, workspaceId],
  );

  useEffect(() => {
    if (focusedNodeId) {
      const node = nodes.find((n) => n.id === focusedNodeId);
      onFocusComplete?.();

      if (node) {
        const x = node.position.x + (node.width ?? NODE_WIDTH) / 2;
        const y = node.position.y + (node.height ?? NODE_HEIGHT) / 2;
        setCenter(x, y, { zoom: 1, duration: 800 });
      }
    }
  }, [focusedNodeId, nodes, setCenter]);

  return (
    <div className="relative w-full h-full bg-background">
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onBeforeDelete={onBeforeDelete}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragLeave={onDragLeave}
        isValidConnection={isValidConnection}
        onViewportChange={handleViewportChange}
        {...(savedViewport.current
          ? { defaultViewport: savedViewport.current }
          : { fitView: true })}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
      />
      <CursorOverlay cursors={cursors} />
      {isArchiveModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[360px] rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <p className="text-base font-semibold">보관하시겠습니까?</p>
            <p className="mt-2 text-sm text-muted">
              선택한 노드와 하위 서브 노드가 함께 보관 처리됩니다. (총{' '}
              {pendingArchiveNodeIds.length}개)
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelArchive}
                className="rounded-md border border-border px-3 py-1.5 text-sm"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface GraphCanvasProps {
  workspaceId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: WorkspaceRole;
  focusedNodeId?: string | null;
  onFocusComplete?: () => void;
  nodes: Node[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
}

export default function GraphCanvas({
  workspaceId,
  currentUserId,
  currentUserName,
  currentUserRole,
  focusedNodeId = null,
  onFocusComplete,
  nodes,
  edges,
  setNodes,
  setEdges,
}: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner
        workspaceId={workspaceId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserRole={currentUserRole}
        focusedNodeId={focusedNodeId}
        onFocusComplete={onFocusComplete}
        nodes={nodes}
        edges={edges}
        setNodes={setNodes}
        setEdges={setEdges}
      />
    </ReactFlowProvider>
  );
}
