"use client";
import { useState, useCallback, useEffect, useRef } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import * as d3 from "d3";
import { nodeTypes } from "@/types/nodeTypes";
import { edgeTypes } from "@/types/edgeTypes";
import { initialEdges, initialNodes } from "@/mock/mindmap";
import { getNodes } from "../api/getNodes";
import type { EdgeDto, NodeDto } from "../types";
import { rectCollide } from "../layout/rectCollide";
import { getRandomColorPair, DEFAULT_NODE_COLOR } from "../constants/colors";

// DB 저장 함수 (예시)
async function saveNodesToDB(nodes: Node[], edges: Edge[]) {
  console.log("Saving to DB:", { nodes, edges });
}

// TODO: uuid로 변경
function makeNodeId() {
  return `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

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

    if (children.length > 0 && children[0].data?.color) {
      return {
        bg: children[0].data.color as string,
        text: (children[0].data.textColor as string) || DEFAULT_NODE_COLOR.text,
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

function isStandaloneNode(nodeId: string, nodes: Node[], edges: Edge[]): boolean {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node || node.data?.isMain) return false;

  const hasParent = getParentId(nodeId, edges) !== null;
  const hasChildren = edges.some((edge) => edge.source === nodeId);
  return !hasParent && !hasChildren;
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

function getDescendantIds(nodeId: string, edges: Edge[]): Set<string> {
  const descendants = new Set<string>();
  const queue: string[] = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    for (const edge of edges) {
      if (edge.source === current && !descendants.has(edge.target)) {
        descendants.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  return descendants;
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

function getHandleSide(node: Node, referenceX: number): "left" | "right" {
  return node.position.x < referenceX ? "left" : "right";
}

function getEdgeSide(source: Node, target: Node): "left" | "right" {
  return target.position.x < source.position.x ? "left" : "right";
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
  side: "left" | "right",
  nodes: Node[],
  edges: Edge[],
  excludeNodeId?: string,
): { x: number; y: number } {
  const sourceWidth = sourceNode.width ?? NODE_WIDTH;

  // 연결 방향에 따라 X 좌표 계산
  const targetX =
    side === "right"
      ? sourceNode.position.x + sourceWidth + DEFAULT_NODE_DISTANCE
      : sourceNode.position.x - NODE_WIDTH - DEFAULT_NODE_DISTANCE;

  const siblingYs = edges
    .filter((edge) => edge.source === sourceNode.id && edge.target !== excludeNodeId)
    .map((edge) => nodes.find((node) => node.id === edge.target))
    .filter((node): node is Node => node !== undefined)
    .filter((node) => {
      const siblingSide = getEdgeSide(sourceNode, node);
      return siblingSide === side;
    })
    .map((node) => node.position.y);

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
  node: Node,
  role: "source" | "target",
  side: "left" | "right",
  edges: Edge[],
): string {
  const hasParent = getParentId(node.id, edges) !== null;
  const shouldUseBothHandles = node.data?.isMain || !hasParent;

  return shouldUseBothHandles ? `${role}-${side}` : `${role}-side`;
}

function buildEdgePresentation(edge: Edge, nodes: Node[], edges: Edge[]): Edge {
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  if (!source || !target) return edge;

  const side = getEdgeSide(source, target);
  const sourceHandle = resolveHandleId(source, "source", side, edges);
  const targetHandle = resolveHandleId(target, "target", side, edges);
  const sourceHandleX =
    source.position.x +
    (side === "right" ? (source.measured?.width ?? source.width ?? NODE_WIDTH) : 0);

  return {
    ...edge,
    type: "branch",
    sourceHandle,
    targetHandle,
    data: {
      ...edge.data,
      hubX: sourceHandleX + (side === "right" ? HUB_OFFSET : -HUB_OFFSET),
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
    console.log("[mirrorSubtree] before/after", diffs);
  }

  return next;
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
  focusedNodeId: string | null;
  onFocusComplete?: () => void;
}

function GraphCanvasInner({
  focusedNodeId,
  onFocusComplete,
}: GraphCanvasInnerProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const { screenToFlowPosition, setCenter } = useReactFlow();

  // D3 force simulation 관리
  const simulationRef = useRef<d3.Simulation<D3Node, undefined> | null>(null);
  const d3NodesRef = useRef<D3Node[]>([]);
  const isDraggingRef = useRef(false);
  const previousDragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isConnectingRef = useRef(false);

  /* =========================
     D3 Force Simulation 초기화
     ========================= */
  useEffect(() => {
    const simulation = d3
      .forceSimulation<D3Node>()
      .force("collide", rectCollide<D3Node>(NODE_PADDING))
      .alphaDecay(0.02) // 더 빠른 안정화
      .velocityDecay(0.4); // 움직임의 감쇠

    // tick 이벤트: d3의 계산 결과를 React Flow nodes에 반영
    simulation.on("tick", () => {
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
    simulation.on("end", () => {
      console.log("Simulation ended");
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
  const handleNodeDataChange = useCallback(
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
  const nodesWithCallbacks = nodes.map((node) => {
    const parentId = getParentId(node.id, edges);
    const parentNode = parentId
      ? nodes.find((item) => item.id === parentId)
      : undefined;

    const mainNode = getMainNodeForSubtree(node.id, nodes, edges);
    // 자신이 속한 그래프의 main 노드 찾기
    const referenceX = parentNode?.position.x ?? mainNode?.position.x ?? 0;

    // 부모가 없는 서브 노드는 양쪽에 핸들 표시
    const hasParent = parentId !== null;

    return {
      ...node,
      data: {
        ...node.data,
        handleSide: node.data?.isMain
          ? undefined
          : getHandleSide(node, referenceX),
        hasParent, // 부모 노드 존재 여부 전달
        showInputBox: selectedNodeId === node.id, // 선택된 노드에만 입력박스 표시
        isHovered: hoveredNodeId === node.id, // 드래그 중 hover된 노드 표시
        onChange: (nodeId: string, value: string) =>
          handleNodeDataChange(nodeId, { text: value }),
      },
    };
  });

  /* =========================
     React Flow handlers
     ========================= */
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    return setNodes((snapshot) => {
      return applyNodeChanges(changes, snapshot);
    });
  }, []);

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
  }, [nodes]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((snapshot) => {
      const removedEdges = changes
        .filter((change) => change.type === "remove")
        .map((change) => snapshot.find((edge) => edge.id === change.id))
        .filter((edge): edge is Edge => edge !== undefined);

      const updatedEdges = applyEdgeChanges(changes, snapshot);

      if (removedEdges.length > 0) {
        setNodes((currentNodes) => {
          let updatedNodes = currentNodes;

          removedEdges.forEach((edge) => {
            updatedNodes = updateSubtreeColors(
              edge.target,
              updatedNodes,
              updatedEdges,
              DEFAULT_NODE_COLOR,
            );
          });

          return updatedNodes;
        });
      }

      return updatedEdges;
    });
  }, []);

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

      // Source 노드가 부모가 있는 서브 노드인 경우, source-side 핸들만 허용
      const sourceParentId = getParentId(sourceNode.id, edges);
      if (!sourceNode.data?.isMain && sourceParentId !== null) {
        const sourceHandle = connection.sourceHandle;
        if (sourceHandle !== "source-side") {
          return false;
        }
      }

      // Target 노드가 부모가 있는 서브 노드인 경우, target-side 핸들만 허용
      const targetParentId = getParentId(targetNode.id, edges);
      if (!targetNode.data?.isMain && targetParentId !== null) {
        const targetHandle = connection.targetHandle;
        if (targetHandle !== "target-side") {
          return false;
        }
      }

      return true;
    },
    [nodes, edges],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      const sourceStandalone = isStandaloneNode(params.source, nodes, edges);
      const targetStandalone = isStandaloneNode(params.target, nodes, edges);
      const shouldAttachStandaloneToGraph =
        sourceStandalone !== targetStandalone;

      const sourceId = shouldAttachStandaloneToGraph
        ? sourceStandalone
          ? params.target
          : params.source
        : params.source;
      const targetId = shouldAttachStandaloneToGraph
        ? sourceStandalone
          ? params.source
          : params.target
        : params.target;

      setEdges((snapshot) => {
        if (isInvalidConnection(sourceId, targetId, snapshot)) {
          return snapshot;
        }
        const rawEdge: Edge = {
          id: `e-${sourceId}-${targetId}-${Date.now()}`,
          source: sourceId,
          target: targetId,
        };
        const nextEdge = buildEdgePresentation(
          rawEdge,
          nodes,
          [...snapshot, rawEdge],
        );

        return [...snapshot, nextEdge];
      });

      // 연결된 target 노드와 그 subtree의 색상을 source 노드 색상으로 업데이트
      setNodes((currentNodes) => {
        const sourceHasCustomColor = isCustomColorNode(sourceId, currentNodes);
        const targetHasCustomColor = isCustomColorNode(targetId, currentNodes);

        if (
          !shouldAttachStandaloneToGraph &&
          sourceHasCustomColor &&
          targetHasCustomColor
        ) {
          return currentNodes;
        }

        const graphColor = getGraphColor(sourceId, currentNodes, edges);
        return updateSubtreeColors(
          targetId,
          currentNodes,
          edges,
          graphColor,
        );
      });
    },
    [nodes, edges],
  );

  /* =========================
     핸들 드래그로 빈 공간에 새 노드 생성
     ========================= */
  const onConnectStart = useCallback(() => {
    isConnectingRef.current = true;
  }, []);

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: any) => {
      // 기존 노드에 연결되지 않았을 때 (빈 공간에 드롭)
      if (!connectionState.isValid) {
        // 마우스 위치 가져오기
        const { clientX, clientY } =
          "changedTouches" in event ? event.changedTouches[0] : event;

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
        const fromHandle = connectionState.fromHandle?.id || "";
        let side: "left" | "right";

        if (fromHandle.includes("left")) {
          // Main 노드의 왼쪽 핸들
          side = "left";
        } else if (fromHandle.includes("right")) {
          // Main 노드의 오른쪽 핸들
          side = "right";
        } else {
          // Sub 노드의 핸들 ("source-side") - 위치 기반으로 handleSide 계산
          const parentId = getParentId(sourceNode.id, edges);
          const parentNode = parentId
            ? nodes.find((n) => n.id === parentId)
            : undefined;
          const mainNode = getMainNodeForSubtree(sourceNode.id, nodes, edges);
          const referenceX = parentNode?.position.x ?? mainNode?.position.x ?? 0;
          side = getHandleSide(sourceNode, referenceX);
        }

        // source 노드 기준으로 적절한 거리에 위치 조정
        const adjustedPosition = adjustPositionRelativeToSource(
          sourceNode,
          originalPosition.y,
          side,
          nodes,
          edges,
        );

        // 새 노드 ID 생성
        const newNodeId = makeNodeId();

        // source 노드의 색상 가져오기
        const colorPair = getGraphColor(
          connectionState.fromNode.id,
          nodes,
          edges,
        );

        // 새 노드 생성
        const newNode: Node = {
          id: newNodeId,
          type: "textUpdater",
          position: adjustedPosition,
          data: {
            text: "새 노드",
            isMain: false,
            color: colorPair.bg,
            textColor: colorPair.text,
          },
        };

        // 노드와 엣지 동시 추가
        setNodes((nds) => [...nds, newNode]);
        setEdges((eds) => {
          const rawEdge: Edge = {
            id: `e-${connectionState.fromNode.id}-${newNodeId}-${Date.now()}`,
            source: connectionState.fromNode.id,
            target: newNodeId,
          };
          const newEdge = buildEdgePresentation(
            rawEdge,
            [...nodes, newNode],
            [...eds, rawEdge],
          );
          return [...eds, newEdge];
        });
      }

      // onPaneClick이 실행되지 않도록 약간의 딜레이 후 플래그 해제
      setTimeout(() => {
        isConnectingRef.current = false;
      }, 0);
    },
    [screenToFlowPosition, nodes, edges],
  );

  /* =========================
     Node click → toggle input box
     ========================= */
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // 같은 노드를 다시 클릭하면 닫기 (토글)
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  /* =========================
     Empty pane click → create node
     ========================= */
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      // 연결 드래그 중이면 노드 생성하지 않음
      if (isConnectingRef.current) return;

      // 입력박스가 열려 있으면 우선 닫고, 같은 클릭으로 노드 생성은 하지 않음
      if (selectedNodeId !== null) {
        setSelectedNodeId(null);
        return;
      }

      // (선택) 우클릭은 제외
      if (event.button !== 0) return;

      // (선택) Shift 눌렀을 때만 생성하고 싶으면:
      // if (!event.shiftKey) return;

      // wrapper 기준 좌표로 변환 (screenToFlowPosition은 clientX/Y 기반으로 처리)
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: makeNodeId(),
        type: "textUpdater",
        position,
        data: {
          text: "새 노드",
          isMain: false,
          color: DEFAULT_NODE_COLOR.bg,
          textColor: DEFAULT_NODE_COLOR.text,
        },
      };

      setNodes((prev) => [...prev, newNode]);
    },
    [screenToFlowPosition, selectedNodeId],
  );

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

      // 좌우 전환 시 서브트리 대칭 이동 (드래그 노드 기준, 반대편 핸들 방향)
      let didMirrorSubtree = false;
      const previousPosition = previousDragPositionRef.current; //드래그 노드
      if (previousPosition && !draggedNode.data?.isMain) {
        const mainNode = getMainNodeForSubtree(draggedNode.id, nodes, edges);
        if (mainNode) {
          const mainAxisX = mainNode.position.x + NODE_WIDTH / 2;
          const nodeWidth = draggedNode.width ?? NODE_WIDTH;
          const nodeHeight = draggedNode.height ?? NODE_HEIGHT;
          const beforeCenterX = previousPosition.x + nodeWidth / 2; //드래그 노드의 중앙값
          const afterCenterX = draggedNode.position.x + nodeWidth / 2;
          const beforeSide = beforeCenterX < mainAxisX ? "left" : "right";
          const afterSide = afterCenterX < mainAxisX ? "left" : "right";

          if (beforeSide !== afterSide) {
            const subtreeIds = getDescendantIds(draggedNode.id, edges);

            // 이전 프레임 드래그 노드의 중심점 (D3 좌표)
            const beforeDraggedCenterX = beforeCenterX;
            const beforeDraggedCenterY = previousPosition.y + nodeHeight / 2;

            // 현재 프레임 드래그 노드의 중심점 (D3 좌표)
            const afterDraggedCenterX = afterCenterX;
            const afterDraggedCenterY = draggedNode.position.y + nodeHeight / 2;

            d3NodesRef.current.forEach((d3Node) => {
              if (!subtreeIds.has(d3Node.id)) return;

              // 이전 프레임에서 드래그 노드와 자식 노드 사이의 거리
              const distanceX = (d3Node.x ?? 0) - beforeDraggedCenterX;
              const distanceY = (d3Node.y ?? 0) - beforeDraggedCenterY;

              // 현재 프레임 드래그 노드 기준으로 거리 유지 (x는 대칭, y는 동일)
              const mirroredCenterX = afterDraggedCenterX - distanceX;
              const mirroredCenterY = afterDraggedCenterY + distanceY;

              d3Node.x = mirroredCenterX;
              d3Node.y = mirroredCenterY;
              if (d3Node.fx != null) {
                d3Node.fx = mirroredCenterX;
              }
              if (d3Node.fy != null) {
                d3Node.fy = mirroredCenterY;
              }
            });
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
    },
    [nodes, edges],
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, draggedNode: Node) => {
      // hover된 노드가 있으면 연결 생성
      if (hoveredNodeId) {
        const newParent = nodes.find((n) => n.id === hoveredNodeId);
        if (
          newParent &&
          !isInvalidConnection(newParent.id, draggedNode.id, edges)
        ) {
          // 1. 기존 부모와의 연결 끊기
          const existingParentEdge = edges.find(
            (edge) => edge.target === draggedNode.id,
          );

          // 2. 드래그된 노드가 새 부모 노드의 어느 쪽에 있는지 확인
          const draggedCenterX =
            draggedNode.position.x + (draggedNode.width ?? NODE_WIDTH) / 2;
          const newParentCenterX =
            newParent.position.x + (newParent.width ?? NODE_WIDTH) / 2;
          const side: "left" | "right" =
            draggedCenterX < newParentCenterX ? "left" : "right";

          // 3. 드래그된 노드의 위치를 새 부모 노드 기준으로 조정
          const adjustedPosition = adjustPositionRelativeToSource(
            newParent,
            draggedNode.position.y,
            side,
            nodes,
            edges,
            draggedNode.id,
          );

          // 4. 드래그된 노드와 서브트리의 위치를 조정된 위치로 이동
          const deltaX = adjustedPosition.x - draggedNode.position.x;
          const deltaY = adjustedPosition.y - draggedNode.position.y;

          setNodes((currentNodes) => {
            const childrenIds = getDescendantIds(draggedNode.id, edges);
            const affectedNodeIds = new Set([draggedNode.id, ...childrenIds]);

            return currentNodes.map((node) => {
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

          // 5. 독립 노드(부모 없음)를 연결할 때는 서브트리 대칭 이동 필요
          if (!existingParentEdge) {
            // 조정된 위치의 중심점을 기준으로 서브트리 대칭 이동
            const adjustedCenterX =
              adjustedPosition.x + (draggedNode.width ?? NODE_WIDTH) / 2;

            // 서브트리 대칭 이동 (자식들만 이동, 드래그된 노드는 이미 위치 확정)
            setNodes((currentNodes) => {
              return mirrorSubtree(
                currentNodes,
                draggedNode.id,
                edges,
                adjustedCenterX,
              );
            });
          }

          // 6. 엣지 업데이트 (기존 부모 연결 끊고, 새 부모 연결)
          setEdges((prev) => {
            // 기존 부모 연결 제거
            const filtered = existingParentEdge
              ? prev.filter((edge) => edge.id !== existingParentEdge.id)
              : prev;

            // 새 부모 연결 추가
            const rawEdge: Edge = {
              id: `e-${newParent.id}-${draggedNode.id}-${Date.now()}`,
              source: newParent.id,
              target: draggedNode.id,
            };
            const newEdge = buildEdgePresentation(
              rawEdge,
              nodes,
              [...filtered, rawEdge],
            );

            return [...filtered, newEdge];
          });

          // 7. 드래그된 노드와 그 subtree의 색상을 새 부모 노드 색상으로 업데이트
          setNodes((currentNodes) => {
            const graphColor = getGraphColor(newParent.id, currentNodes, edges);
            return updateSubtreeColors(
              draggedNode.id,
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
    },
    [nodes, edges, hoveredNodeId],
  );

  /* =========================
     Persist
     ========================= */

  function convertToReactFlow(
    graphNodes: NodeDto[],
    graphEdges: EdgeDto[],
  ): {
    nodes: Node[];
    edges: Edge[];
  } {
    const nodes: Node[] = graphNodes.map((n) => ({
      id: n.nodeId,
      type: "textUpdater",
      position: n.position,
      data: {
        text: n.title,
        color: n.color,
        isMain: n.nodeType === "PROJECT",
        nodeType: n.nodeType,
      },
    }));

    const rawEdges: Edge[] = graphEdges.map((e) => ({
      id: e.edgeId,
      source: e.source,
      target: e.target,
      type: e.type ?? "branch",
      sourceHandle: e.sourceHandle ?? "source-side",
      targetHandle: e.targetHandle ?? "target-side",
      data: {},
    }));

    const edges: Edge[] = rawEdges.map((edge) =>
      buildEdgePresentation(edge, nodes, rawEdges),
    );

    return { nodes, edges };
  }

  // useEffect(() => {
  //   async function load() {
  //     const res = await getNodes();

  //     if (res.error) {
  //       console.error(res.error.message);
  //       return;
  //     }
  //     console.log("res: ", res);
  //     const graph = res.success.graphs[0];
  //     if (!graph) return;
  //     const graphNodes: NodeDto[] = graph.nodes;
  //     const { nodes, edges } = convertToReactFlow(graphNodes, graph.edges);
  //     console.log("nodes: ", nodes);
  //     console.log("edges: ", edges);
  //     setNodes(nodes);
  //     setEdges(edges);
  //   }

  //   load();
  // }, []);

  // useEffect(() => {
  //   saveNodesToDB(nodes, edges);
  // }, [nodes, edges]);

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
    <div className="w-full h-full bg-background">
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        isValidConnection={isValidConnection}
        fitView
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
      />
    </div>
  );
}

interface GraphCanvasProps {
  focusedNodeId?: string | null;
  onFocusComplete?: () => void;
}

export default function GraphCanvas({
  focusedNodeId = null,
  onFocusComplete,
}: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner
        focusedNodeId={focusedNodeId}
        onFocusComplete={onFocusComplete}
      />
    </ReactFlowProvider>
  );
}
