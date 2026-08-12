'use client';
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
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
  type FinalConnectionState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ZoomControl from '@/components/ui/ZoomControl';
import GraphUsageGuide from '@/components/ui/GraphUsageGuide';
import * as d3 from 'd3';
import { nodeTypes } from '@/types/nodeTypes';
import { edgeTypes } from '@/types/edgeTypes';
import {
  createMdNode,
  createProjectNode,
  moveNode,
  deleteNode,
  updateNodeContent,
  EMPTY_LEXICAL_JSON,
} from '../api/nodes';
import { emitLivePosition, emitCursorMove } from '@/api/ws';
import { createEdge, deleteEdge, updateEdge } from '../api/edges';
import type { EdgeDto, NodeDto } from '../types';
import { rectCollide } from '../layout/rectCollide';
import { getRandomColorPair, DEFAULT_NODE_COLOR } from '../constants/colors';
import {
  getDescendantIds,
  getSameColorDescendantIds,
  applyDepthOnEdgeCreate,
  applyDepthOnEdgeDelete,
  isRootNode,
  computeCollapseState,
  buildChildrenMap,
  buildCollapseButtons,
  type CollapseSide,
  type CollapsedSides,
} from '../utils/graphUtils';
import { useCursors } from '@/hooks/useCursors';
import { useWorkspaceAwareness } from '@/hooks/useWorkspaceAwareness';
import { getCursorColor } from '@/utils/cursorColor';
import CursorOverlay from './CursorOverlay';
import { MdBody, type WorkspaceRole } from '@/api/types';

// TODO: 실제 노드 너비로 변경
const NODE_WIDTH = 200;
// 제목 없는 신규 서브 노드의 실측 폭 근사치 — "서브 노드" 플레이스홀더 + 패딩 기준.
// 엣지 드래그 생성(좌측 방향)에서 NODE_WIDTH(200) 폴백이 거리를 과도하게 벌리는 것 방지 (#215)
const EMPTY_SUB_NODE_WIDTH = 90;
const NODE_HEIGHT = 48;
const NODE_PADDING = 0; // 완전히 부딪힐 때만 충돌
const HUB_OFFSET = 25; // Figma 메인 화면 디자인 실측: 엣지 elbow 수평 거리 25px
const DEFAULT_NODE_DISTANCE = 64; // Figma 메인 화면 디자인 실측: 부모-자식 수평 빈 간격 64px

function getParentId(nodeId: string, edges: Edge[]): string | null {
  const incoming = edges.find((edge) => edge.target === nodeId);
  return incoming?.source ?? null;
}

function getAncestorIds(nodeId: string, edges: Edge[]): Set<string> {
  const ancestors = new Set<string>();
  let current = getParentId(nodeId, edges);
  // 방문 체크로 순환에서 무한 루프 방지 (§10-4/10-5). 정상 트리에선 부모가 null이
  // 되며 끝나지만, 레거시·경합으로 순환 엣지가 남으면 !has 조건이 루프를 끊는다.
  while (current && !ancestors.has(current)) {
    ancestors.add(current);
    current = getParentId(current, edges);
  }
  return ancestors;
}

/*
 * CONTEXT
 * - Problem      : 그래프 기준 노드(대칭 축·같은 그래프 판정·방향 기준점)를 isMain 조상
 *                  탐색으로 찾아서, 메인 노드 없는 그래프(일반 노드 루트)에서는 undefined가
 *                  되어 해당 로직이 전부 무력화됐다 (#146).
 * - Why          : root 판별 단일 기준인 depth === 0(isRootNode, #99)으로 조상 체인을
 *                  탐색한다. 메인 노드는 항상 depth 0이므로 기존 메인 그래프 동작은 불변.
 * - Alternatives : 엣지 스캔으로 "부모 없는 조상" 탐색 — #99에서 root 판별을 depth 단일
 *                  기준으로 통일했으므로 기각 (두 기준 공존 시 WS 수신 타이밍에 분기).
 * - Trade-offs   : depth가 서버와 어긋난 노드는 오판 가능 — 아래 Edge Case fallback으로 방어.
 * - Edge Case    : 서버 deleteNode가 depth를 전파하지 않아(Aideep_backend#64) depth≠0인
 *                  채 루트가 된 노드가 존재할 수 있다 → 조상 체인에 depth 0이 없으면
 *                  체인 끝(부모 없는 노드)을 루트로 간주한다.
 */
function getRootNodeForSubtree(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
): Node | undefined {
  const currentNode = nodes.find((n) => n.id === nodeId);
  if (!currentNode) return undefined;
  if (isRootNode(currentNode)) return currentNode;

  // getAncestorIds는 가까운 부모 → 최상위 순으로 삽입된 Set — 순회 후 last = 체인 끝
  let last: Node = currentNode;
  for (const ancestorId of getAncestorIds(nodeId, edges)) {
    const ancestor = nodes.find((n) => n.id === ancestorId);
    if (!ancestor) continue;
    if (isRootNode(ancestor)) return ancestor;
    last = ancestor;
  }
  return last;
}

// main(PROJECT) 노드는 생성 시점(onPaneContextMenu)에 이미 실제 그래프 색을 data.color에
// 저장하므로(화면은 isMain이라 항상 흰색으로 그려짐), 별도 분기 없이 본인 색을 그대로 쓴다.
function getGraphColor(
  parentNodeId: string,
  nodes: Node[],
): { bg: string; text: string } {
  const parentNode = nodes.find((n) => n.id === parentNodeId);

  if (parentNode?.data?.color) {
    return {
      bg: parentNode.data.color as string,
      text: (parentNode.data.textColor as string) || DEFAULT_NODE_COLOR.text,
    };
  }

  return getRandomColorPair();
}

function colorOfNodeIn(nodes: Node[]) {
  return (id: string) =>
    nodes.find((n) => n.id === id)?.data?.color as string | undefined;
}

/*
 * CONTEXT
 * - Problem      : 크로스 그래프 엣지(색이 다른 노드 간 연결)가 있으면 서브트리 이동·색 전파·
 *                  삭제 캐스케이드가 경계를 넘어 다른 그래프의 노드까지 끌고 간다.
 * - Why          : 이동/전파/삭제 대상을 루트의 그래프 색과 같은 색의 자손으로 제한한다.
 *                  main 노드도 생성 시점에 그래프 색을 data.color에 저장하므로(표시만 흰색)
 *                  본인 색을 기준색으로 그대로 쓴다.
 * - Alternatives : 서버 그래프 ID·크로스 엣지 플래그 — getSameColorDescendantIds CONTEXT 참고.
 * - Edge Case    : 그래프 색을 알 수 없으면 전체 자손 순회로 폴백.
 */
function getSameGraphDescendantIds(
  rootNode: Node,
  nodes: Node[],
  edges: Edge[],
): Set<string> {
  const colorOf = colorOfNodeIn(nodes);
  const rootColor = colorOf(rootNode.id);

  if (!rootColor) return getDescendantIds(rootNode.id, edges);
  return getSameColorDescendantIds(rootNode.id, edges, rootColor, colorOf);
}

// 색을 칠할 노드 집합: 루트 + 같은 그래프(같은 색) 자손, main 노드 제외.
// 로컬 페인트(updateSubtreeColors)와 서버 저장 PATCH가 반드시 같은 집합을 쓰도록 공용.
// 서버의 propagateToChildren 전파는 그래프 색 경계를 모르고 크로스 그래프 엣지 너머까지
// 덮어쓰므로(Aideep_backend#51) 사용하지 않고, 이 집합에 노드별 PATCH로 저장한다.
function getRecolorTargetIds(
  rootId: string,
  nodes: Node[],
  edges: Edge[],
): string[] {
  const rootColor = colorOfNodeIn(nodes)(rootId);
  // 색상 경계(다른 그래프)를 넘어 전파하지 않는다
  const descendantIds = rootColor
    ? getSameColorDescendantIds(rootId, edges, rootColor, colorOfNodeIn(nodes))
    : getDescendantIds(rootId, edges);
  return [rootId, ...descendantIds].filter(
    (id) => !nodes.find((n) => n.id === id)?.data?.isMain,
  );
}

// 대칭이동(미러)은 서브트리를 축 반대편으로 보내는데, 색이 다른(다른 그래프) 직계
// 자식은 함께 이동하지 않으므로 연결 방향 규칙이 꼬인다 → 대칭이동 시점에 그 크로스
// 그래프 엣지를 끊는다. 불변식: 같은 그래프의 자식은 항상 부모와 같은 색
// (legacy 무색 노드는 2026-07-05 데이터 정리로 소거 — 색 다름 = 크로스 그래프 확정)
function findCrossColorChildEdges(
  mirroredIds: Iterable<string>,
  nodes: Node[],
  edges: Edge[],
): Edge[] {
  const colorOf = colorOfNodeIn(nodes);
  const ids = new Set(mirroredIds);
  // source/target 정규화(isMain·엣지 수 우선) 때문에 크로스 그래프 엣지는 다른 그래프
  // 쪽이 source일 수도 있다 → 방향 무관하게 한쪽 끝이 미러 집합에 속하면 검사한다.
  // 양쪽 다 집합 안이면 같은 서브트리(같은 색)라 색 비교에서 걸러진다.
  return edges.filter((edge) => {
    if (!ids.has(edge.source) && !ids.has(edge.target)) return false;
    const srcColor = colorOf(edge.source);
    const tgtColor = colorOf(edge.target);
    // 한쪽 색이 미확정(색 없는 legacy main 등)이면 크로스 그래프로 단정하지 않는다
    // — 오판 시 자기 그래프의 엣지를 끊어 서브트리가 고아가 된다 (Aideep_backend#52 전까지 방어)
    if (srcColor === undefined || tgtColor === undefined) return false;
    return srcColor !== tgtColor;
  });
}

function updateSubtreeColors(
  rootId: string,
  nodes: Node[],
  edges: Edge[],
  colorPair: { bg: string; text: string },
): Node[] {
  const idsToUpdate = new Set(getRecolorTargetIds(rootId, nodes, edges));

  return nodes.map((node) =>
    idsToUpdate.has(node.id)
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

function isInvalidConnection(
  sourceId: string,
  targetId: string,
  nodes: Node[],
  edges: Edge[],
): boolean {
  if (sourceId === targetId) return true;

  // 프로젝트(main) 노드끼리는 직접 연결 불가 — 모든 연결 경로(핸들 드래그·노드 드래그·드롭)가 이 함수를 거친다
  const sourceIsMain = nodes.find((n) => n.id === sourceId)?.data?.isMain;
  const targetIsMain = nodes.find((n) => n.id === targetId)?.data?.isMain;
  if (sourceIsMain && targetIsMain) return true;

  // 둘이 서로 연결되어 있는지 확인
  const targetParent = getParentId(targetId, edges);
  const sourceParent = getParentId(sourceId, edges);
  if (targetParent === sourceId || sourceParent === targetId) return true;

  // 순환 방지 (§10-4/10-5): source→target 엣지는 source를 부모로 만든다. source가
  // 이미 target의 자손이면 target→…→source→target 순환이 생겨 getAncestorIds가
  // 폭주하므로(과거 탭 정지 원인) 연결 자체를 막는다. 모든 경로가 이 함수를 거치므로
  // 핸들 드래그(isValidConnection)·편입(onNodeDragStop)·hover 감지가 한 번에 차단된다.
  if (getDescendantIds(targetId, edges).has(sourceId)) return true;

  return false;
}

/**
 * 핸들 드래그 연결의 실제 부모/자식 방향을 결정한다.
 * onConnect와 isValidConnection이 같은 규칙을 공유해야 단일 부모 검사가
 * swap 케이스(단독 노드 편입, main 노드가 target)에서 어긋나지 않는다.
 */
function resolveConnectionDirection(
  source: string,
  target: string,
  nodes: Node[],
  edges: Edge[],
): {
  sourceId: string;
  targetId: string;
  shouldSwap: boolean;
  bothInGraphs: boolean;
} {
  const sourceIsMain = nodes.find((n) => n.id === source)?.data?.isMain === true;
  const targetIsMain = nodes.find((n) => n.id === target)?.data?.isMain === true;

  const sourceEdgeCount = edges.filter(
    (e) => e.source === source || e.target === source,
  ).length;
  const targetEdgeCount = edges.filter(
    (e) => e.source === target || e.target === target,
  ).length;

  const shouldSwap =
    // 케이스 1: main(프로젝트) 노드는 항상 부모
    ((sourceIsMain || targetIsMain) && !sourceIsMain) ||
    // 케이스 2: 단독 노드가 그래프에 연결되면 그래프 쪽이 부모
    (sourceEdgeCount === 0 && targetEdgeCount > 0);

  return {
    sourceId: shouldSwap ? target : source,
    targetId: shouldSwap ? source : target,
    shouldSwap,
    // 두 노드 모두 기존 그래프(1개 이상의 연결)에 속함 → 색상·위치 유지, 연결만 생성
    bothInGraphs: sourceEdgeCount > 0 && targetEdgeCount > 0,
  };
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
  hiddenIds: Set<string>, // 접힘으로 숨겨진 노드 — 시각 피드백 없는 hover/드롭 대상 방지 위해 후보에서 제외
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
    if (hiddenIds.has(node.id)) continue; // 접힌 서브트리의 숨겨진 노드는 hover/드롭 후보 제외

    // 연결 유효성 체크
    if (isInvalidConnection(node.id, draggedNode.id, nodes, edges)) continue;

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

function getForcedOutboundSideForSubNode(
  node: Node,
  nodes: Node[],
  edges: Edge[],
): 'left' | 'right' | null {
  if (isRootNode(node)) return null;

  const rootNode = getRootNodeForSubtree(node.id, nodes, edges);
  if (!rootNode) return null;

  const parentId = getParentId(node.id, edges);
  const parentNode = parentId
    ? nodes.find((n) => n.id === parentId)
    : undefined;
  const referenceX = parentNode?.position.x ?? rootNode.position.x;

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
  // React Flow v12는 실측 크기를 node.measured에 담는다 — node.width(명시값)는 대부분
  // undefined라 NODE_WIDTH(200) 폴백이 서브 노드 실폭(~100px)을 크게 웃돌아
  // 엣지 드래그 생성 시 노드 간 거리가 과도해진다 (#215)
  const sourceWidth =
    sourceNode?.measured?.width ?? sourceNode?.width ?? NODE_WIDTH;
  const targetWidth =
    targetNode?.measured?.width ?? targetNode?.width ?? NODE_WIDTH;

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

/*
 * CONTEXT
 * - Problem      : 비-root 노드는 source-{handleSide} 핸들 하나만 렌더링하므로, 서브트리
 *                  방향이 바뀌는 지점(재부모화·트리 병합)에서 자손 handleSide·내부 엣지
 *                  핸들을 함께 갱신하지 않으면 엣지가 존재하지 않는 핸들을 가리켜
 *                  React Flow 에러 #008로 렌더링에서 탈락한다.
 * - Why          : D3 대칭이동 경로(방향 반전 시 서브트리 전체 handleSide + 엣지 핸들
 *                  동시 갱신)와 동일한 규칙을 나머지 두 경로에도 적용한다. 서버는 노드
 *                  handleSide 개념이 없고 엣지 핸들만 저장하므로, 로컬 갱신분을 PATCH
 *                  /edge/:edgeId로 동반 저장해야 새로고침 후에도 일관된다.
 * - Alternatives : buildEdgePresentation에서 렌더링 시점 보정 — 데이터 모순을 화면에서만
 *                  가리고 서버엔 그대로 남아 다른 클라이언트·재접속에서 재발, 기각.
 * - Trade-offs   : 서브트리 내부 엣지 수만큼 PATCH 요청 발생 (엣지별 실패는 로그만,
 *                  로컬 상태는 이미 일관 — 실패분은 새로고침 시 다시 어긋날 수 있음).
 * - Edge Case    : 크로스 색 엣지는 같은 그래프 자손 집합에 포함되지 않아 정규화 대상에서
 *                  자연 제외된다 (대칭이동 절단 로직이 별도 처리).
 */
function subtreeInternalEdgeFilter(
  rootId: string,
  subtreeIds: Set<string>,
): (edge: Edge) => boolean {
  return (edge) =>
    (edge.source === rootId || subtreeIds.has(edge.source)) &&
    subtreeIds.has(edge.target);
}

// 서브트리 내부 엣지 핸들의 서버 저장분 갱신 — 이미 새 방향인 엣지는 건너뛴다
function persistSubtreeEdgeHandles(
  workspaceId: string,
  edges: Edge[],
  isInternal: (edge: Edge) => boolean,
  side: 'left' | 'right',
): void {
  const sourceHandle = resolveHandleId('source', side);
  const targetHandle = resolveHandleId('target', side);
  edges
    .filter(isInternal)
    .filter(
      (e) => e.sourceHandle !== sourceHandle || e.targetHandle !== targetHandle,
    )
    .forEach((e) => {
      updateEdge(workspaceId, e.id, { sourceHandle, targetHandle })
        .catch(
          (err) => console.error(`[updateEdge subtree ${e.id}] failed`, err),
        );
    });
}

/*
 * CONTEXT
 * - Problem      : 서버 PATCH /node/:id/move는 해당 노드를 절대 좌표로 저장하면서 DB 기준
 *                  delta를 모든 자손에게도 전파한다(node.service.updateNodePosition).
 *                  클라이언트가 드래그 종료 시 부모·자식 각각의 절대 좌표를 병렬 PATCH하면,
 *                  자식 요청이 부모보다 먼저 처리되는 순서에서 자식 = 최종 좌표 + 부모 delta로
 *                  이중 이동된다 (새로고침 시 서브트리만 밀려 보이는 증상).
 * - Why          : root만 PATCH하고 서버 전파 결과를 로컬에서 시뮬레이션한 뒤, 로컬 최종
 *                  위치와 어긋나는 자손만 root 응답 이후 순차 보정한다. 일반 드래그(순수
 *                  평행이동)는 요청 1건, Alt 단독 이동·대칭이동·크로스 그래프 자손처럼
 *                  전파 결과가 로컬과 다른 노드만 추가 PATCH가 나간다.
 * - Alternatives : ① 전 노드 순차 저장 — 항상 자손 수만큼 왕복, 대부분 불필요.
 *                  ② 자식 전송 완전 제거 — Alt 단독 이동·대칭이동에서 서버 전파값이 로컬과
 *                  달라 새로고침 시 어긋남, 기각.
 * - Trade-offs   : 서버 전파 규칙(전체 자손, 색 경계 무시)이 바뀌면 시뮬레이션도 함께
 *                  바꿔야 한다. 보정은 순차 await라 어긋난 자손이 많으면(대칭이동) 왕복 누적.
 * - Edge Case    : root PATCH 실패 시 서버 전파도 없었던 것이므로 보정 전체를 건너뛴다.
 *                  보정 PATCH도 각자 자손에게 delta를 전파하므로 시뮬레이션에 누적 반영한다.
 */
async function saveDragPositions(
  workspaceId: string,
  roots: Array<{ id: string; final?: { x: number; y: number } }>,
  latestNodes: Node[],
  edges: Edge[],
  startPositions: Map<string, { x: number; y: number }>,
): Promise<void> {
  const posOf = (id: string): { x: number; y: number } | undefined => {
    const node = latestNodes.find((n) => n.id === id);
    return node ? { x: node.position.x, y: node.position.y } : undefined;
  };

  for (const root of roots) {
    const rootFinal = root.final ?? posOf(root.id);
    if (!rootFinal) continue;

    try {
      await moveNode(workspaceId, root.id, rootFinal);
    } catch (err) {
      console.error('[moveNode] failed', err);
      continue; // root 실패 = 서버 전파도 없음 — 자손 보정 스킵
    }

    // 서버 전파 시뮬레이션: 자손 = 드래그 시작 위치 + root delta (색 경계 무시 — 서버 selectAllDescendantIds와 동일)
    const descendantIds = getDescendantIds(root.id, edges);
    const serverPos = new Map<string, { x: number; y: number }>();
    descendantIds.forEach((id) => {
      const start = startPositions.get(id);
      if (start) serverPos.set(id, { ...start });
    });
    const rootStart = startPositions.get(root.id);
    if (rootStart) {
      const dx = rootFinal.x - rootStart.x;
      const dy = rootFinal.y - rootStart.y;
      serverPos.forEach((p) => {
        p.x += dx;
        p.y += dy;
      });
    }

    // BFS 순서(조상 → 자손)로 어긋난 자손만 보정 — 보정 자체의 자손 전파도 누적 반영
    for (const childId of descendantIds) {
      const final = posOf(childId);
      const expected = serverPos.get(childId);
      if (!final || !expected) continue;
      if (
        Math.abs(expected.x - final.x) < 0.5 &&
        Math.abs(expected.y - final.y) < 0.5
      ) {
        continue;
      }
      try {
        await moveNode(workspaceId, childId, final);
      } catch (err) {
        console.error(`[moveNode child ${childId}] failed`, err);
        continue;
      }
      const cdx = final.x - expected.x;
      const cdy = final.y - expected.y;
      getDescendantIds(childId, edges).forEach((id) => {
        const p = serverPos.get(id);
        if (p) {
          p.x += cdx;
          p.y += cdy;
        }
      });
      serverPos.set(childId, { ...final });
    }
  }
}

function buildEdgePresentation(edge: Edge, nodes: Node[], edges: Edge[]): Edge {
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  if (!source || !target) return edge;

  const forcedSourceSide = getForcedOutboundSideForSubNode(
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
  subtreeIds: Set<string>, // root 제외, 함께 이동하는(같은 그래프) 자식들만
  parentAxisX: number,
): Node[] {
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

  return next;
}

function initializeHandleSides(nodes: Node[], edges: Edge[]): Node[] {
  return nodes.map((node) => {
    if (node.data?.isMain) return node;

    // root 판별은 depth === 0 (issue #99) — 핸들 방향만 incoming edge에서 유도
    const hasParent = !isRootNode(node);

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
        data: { ...node.data, handleSide: side, hasParent },
      };
    }

    // Case 2: 부모 없는 non-main 노드
    return { ...node, data: { ...node.data, hasParent } };
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
  ghost?: boolean;
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
      depth: n.depth ?? 0,
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
  const [myOpenEditorNodeIds, setMyOpenEditorNodeIds] = useState<string[]>([]);
  const [workingOnEditorNodeId, setWorkingOnEditorNodeId] = useState<string | null>(
    null,
  );
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  // 접기/펼치기 — 로컬 뷰 상태. 서버 저장·협업 공유 없음, 새로고침 시 초기화 (스펙: docs/superpowers/specs/2026-08-12-node-collapse-design.md)
  const [collapsedMap, setCollapsedMap] = useState<
    Map<string, CollapsedSides>
  >(new Map());
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(
    null,
  );
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isArchiveDeleting, setIsArchiveDeleting] = useState(false);
  const [pendingArchiveNodeIds, setPendingArchiveNodeIds] = useState<string[]>(
    [],
  );

  const { screenToFlowPosition, setCenter } = useReactFlow();

  // ─── Workspace Awareness ─────────────────────────────────────────
  const cursorColor = getCursorColor(currentUserId);

  // aggregateOpenNodeIds(협업자 열린 에디터 합집합)는 당분간 소비하지 않는다 —
  // 같은 계정 다중 탭에서 다른 탭이 연 에디터가 내 탭에 떠서 닫을 수 없는 문제.
  // 에디터 패널 렌더링은 내 탭의 myOpenEditorNodeIds만 사용 (협업자 에디터 표시 기능 비활성화).
  const { nodeViewers, setOpenEditorNodeId, setAwarenessOpenNodeIds } = useWorkspaceAwareness({
    workspaceId,
    userName: currentUserName,
    userColor: cursorColor,
    role: currentUserRole,
  });

  // Sync workingOnEditorNodeId → awareness (viewer 뱃지용)
  useEffect(() => {
    setOpenEditorNodeId(workingOnEditorNodeId);
  }, [workingOnEditorNodeId, setOpenEditorNodeId]);

  // Sync myOpenEditorNodeIds → awareness (내가 연 패널 목록 전파용)
  useEffect(() => {
    // CONTEXT: 
    // awareness 는 기본적으로 map 형태로, workspaceId 를 key 값으로 가지며 각 workspace 내에서 참여자 별로 데이터를 저장하는 것이 best practice 이다. (예: awareness.getStates()[clientId] = { user: { name, color }, openEditorNodeId, openNodeIds } 형태)
    // 그래서 각 참여자 별로 연 패널 목록을 따로 관리하고 공유함으로서, 각 사용자가 워크스페이스를 떠나면 해당 사용자만 열어뒀던 패널들은 자동으로 닫히도록 할 수 있다. 
    // 별도의 연결 상태 관리가 필요 없이 awareness 로 참여자의 연결 상태를 관리 가능하므로, 내가 떠나면 내 상태가 사라지게 구현한다.
    setAwarenessOpenNodeIds(myOpenEditorNodeIds);
  }, [myOpenEditorNodeIds, setAwarenessOpenNodeIds]);

  // viewport 저장 (debounce)
  const viewportSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedViewport] = useState<{ x: number; y: number; zoom: number } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(`graph_viewport_${workspaceId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

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

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  const contentSaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const previousDragPositionRef = useRef<{ x: number; y: number } | null>(null);
  // 드래그 시작 시점 전체 노드 위치 스냅샷 — 서버 move의 자손 delta 전파 시뮬레이션 기준값
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );
  // 드래그 시작 시점 엣지 핸들 스냅샷 — 드래그 중 좌우 반전으로 로컬에서만 바뀐
  // 핸들을 드래그 종료 시 diff로 골라 서버에 저장하기 위한 기준값
  const dragStartEdgeHandlesRef = useRef<
    Map<string, { source?: string | null; target?: string | null }>
  >(new Map());
  const isConnectingRef = useRef(false);
  const isMultiDragRef = useRef(false);
  // 뷰포트 중앙 좌표 계산용 캔버스 래퍼 (#204 보이는 생성 버튼)
  const wrapperRef = useRef<HTMLDivElement>(null);
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
        const moved: Array<{
          id: string;
          from: { x: number; y: number };
          to: { x: number; y: number };
        }> = [];
        const next = currentNodes.map((node) => {
          const d3Node = d3Nodes.find((d) => d.id === node.id);
          if (!d3Node) return node;

          // D3는 중심점 기준, React Flow는 왼쪽 상단 기준이므로 변환
          const nodeWidth = node.width ?? NODE_WIDTH;
          const nodeHeight = node.height ?? NODE_HEIGHT;

          const newPosition = {
            x: (d3Node.x ?? node.position.x + nodeWidth / 2) - nodeWidth / 2,
            y: (d3Node.y ?? node.position.y + nodeHeight / 2) - nodeHeight / 2,
          };
          if (
            Math.abs(newPosition.x - node.position.x) > 0.5 ||
            Math.abs(newPosition.y - node.position.y) > 0.5
          ) {
            moved.push({ id: node.id, from: node.position, to: newPosition });
          }

          return {
            ...node,
            position: newPosition,
          };
        });
        if (moved.length > 0) {
        }
        return next;
      });
    });

    // alpha가 충분히 작아지면 시뮬레이션 멈춤
    simulation.on('end', () => {
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
    [setNodes],
  );

  const titleDebounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const handleClosePanel = useCallback((nodeId: string) => {
    setMyOpenEditorNodeIds((prev) => prev.filter((id) => id !== nodeId));
    setWorkingOnEditorNodeId((prev) => (prev === nodeId ? null : prev));
  }, []);

  const handleForwardPanel = useCallback((nodeId: string) => {
    setWorkingOnEditorNodeId(nodeId);
  }, []);

  const handleCloseAllPanels = useCallback(() => {
    setMyOpenEditorNodeIds([]);
    setWorkingOnEditorNodeId(null);
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
  const handleToggleNodeType = (nodeId: string) => {
    const target = nodes.find((n) => n.id === nodeId);
    if (!target) return;
    const toProject = !target.data?.isMain;
    const nextType = toProject ? 'PROJECT' : 'DATA';

    // 낙관적 로컬 반영
    setNodes((prev) =>
      prev.map((node) =>
        node.id !== nodeId
          ? node
          : {
              ...node,
              data: { ...node.data, isMain: toProject, nodeType: nextType },
            },
      ),
    );
    setContextMenuNodeId(null);

    // 서버 영속화 — PATCH /workspace/:id/node/:nodeId(updateNodeMeta)가 nodeType을 저장하고
    // 협업자에게 WS NODE_UPDATE(patch.nodeType)로 전파한다(수신은 useWorkspaceWS handleNodeUpdate).
    // 실패 시 낙관적 토글을 되돌린다(rollback): isMain은 색 저장·연결 방향·main↔main 금지 등
    // 그래프 규칙의 입력이라, 저장 실패 상태로 두면 그 위에서 규칙이 오염된다 — 무롤백인
    // 색/제목 PATCH(§6, :1283)와 다른 선택.
    updateNodeContent(workspaceId, nodeId, { nodeType: nextType }).catch(
      (err) => {
        console.error('[updateNodeContent nodeType toggle] failed', err);
        // target은 토글 전 스냅샷 — 그때의 isMain/nodeType으로 복원
        setNodes((prev) =>
          prev.map((node) =>
            node.id !== nodeId
              ? node
              : {
                  ...node,
                  data: {
                    ...node.data,
                    isMain: target.data?.isMain,
                    nodeType: target.data?.nodeType,
                  },
                },
          ),
        );
      },
    );
  };

  const handleToggleCollapse = (nodeId: string, side: CollapseSide) => {
    const target = nodes.find((n) => n.id === nodeId);
    if (!target) return;
    setCollapsedMap((prev) => {
      const next = new Map(prev);
      const sides = { ...(next.get(nodeId) ?? {}) };
      if (isRootNode(target)) {
        sides[side] = !sides[side];
      } else {
        // 비루트는 방향 무관 단일 접힘 — 재부모화로 handleSide가 반전된 stale 키가
        // 있어도 클릭 한 번으로 펼쳐지도록 양쪽을 지우고 다시 세운다
        const wasCollapsed = Boolean(sides.left || sides.right);
        delete sides.left;
        delete sides.right;
        if (!wasCollapsed) sides[side] = true;
      }
      if (!sides.left && !sides.right) next.delete(nodeId);
      else next.set(nodeId, sides);
      return next;
    });
  };

  // 키보드 Backspace 삭제(onBeforeDelete)와 동일 플로우: 확인 모달 → 서브트리 삭제 + WS 동기화
  const handleDeleteNode = (nodeId: string) => {
    setContextMenuNodeId(null);
    requestArchiveForNodes([nodeId]);
  };

  const collapseState = useMemo(
    () => computeCollapseState(nodes, edges, collapsedMap),
    [nodes, edges, collapsedMap],
  );

  const collapseChildrenMap = buildChildrenMap(edges);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const nodesWithCallbacks = nodes.map((node) => {
    // 부모가 없는 서브 노드는 양쪽에 핸들 표시 — root 판별은 depth === 0 (issue #99)
    const hasParent = !isRootNode(node);

    const isContextMenuOpen = contextMenuNodeId === node.id;
    const isEditorOpen = myOpenEditorNodeIds.includes(node.id);

    return {
      ...node,
      zIndex: isContextMenuOpen ? 1000 : isEditorOpen ? 100 : undefined,
      hidden: collapseState.hiddenIds.has(node.id),
      data: {
        ...node.data,
        handleSide: node.data?.isMain ? undefined : node.data?.handleSide,
        hasParent, // 부모 노드 존재 여부 전달
        showInputBox: myOpenEditorNodeIds.includes(node.id), // 열린 노드에 입력박스 표시 (내 탭 기준)
        isContextMenuOpen, // 컨텍스트 메뉴 표시 여부
        panelZIndex: node.id === workingOnEditorNodeId ? 30 : 20, // 포커스된 패널이 위
        isHovered: hoveredNodeId === node.id, // 드래그 중 hover된 노드 표시
        workspaceId, // 전체화면 이동 시 사용
        viewers: nodeViewers[node.id] ?? [], // 현재 이 노드를 보고 있는 다른 유저들
        onToggleNodeType: handleToggleNodeType,
        onDeleteNode: handleDeleteNode,
        onClosePanel: handleClosePanel,
        onForwardPanel: handleForwardPanel,
        onChange: handleTitleChange,
        collapseButtons: buildCollapseButtons(
          node,
          collapseChildrenMap,
          nodeById,
          collapsedMap,
          collapseState,
        ),
        onToggleCollapse: handleToggleCollapse,
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
        // 삭제 캐스케이드도 그래프 경계(색 경계)에서 멈춘다 — 크로스 그래프 엣지로
        // 이어진 상대 그래프의 노드는 삭제 대상에서 제외. 두 그래프를 잇던 엣지는
        // 서버가 노드 삭제 시 해당 노드의 엣지를 함께 지우므로(deleteEdgesByNodeId)
        // 남지 않고, 상대 그래프는 자기 그래프의 루트로 독립한다.
        const rootNode = nodes.find((n) => n.id === rootId);
        const descendants = rootNode
          ? getSameGraphDescendantIds(rootNode, nodes, edges)
          : getDescendantIds(rootId, edges);
        descendants.forEach((id) => subtreeNodeIds.add(id));
      });

      setPendingArchiveNodeIds(Array.from(subtreeNodeIds));
      setIsArchiveModalOpen(true);
    },
    [nodes, edges],
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

      nonRemoveChanges.forEach((change) => {
        if (change.type === 'position' && change.position) {
        }
      });

      setNodes((snapshot) => applyNodeChanges(nonRemoveChanges, snapshot));
    },
    [requestArchiveForNodes, setNodes],
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

    setIsArchiveDeleting(true);
    // BE 삭제 API 호출 (병렬) — 서버 deleteNode는 노드 단위 삭제라 부분 성공이
    // 가능하다. 전체 성공/전체 유지로 처리하면 성공분이 서버에는 없는데 화면에
    // 남아(유령 노드) 이후 편집이 전부 404가 되므로, 성공한 노드만 로컬에서 제거한다.
    const results = await Promise.allSettled(
      pendingArchiveNodeIds.map((nodeId) => deleteNode(workspaceId, nodeId)),
    );
    const deletedIds = new Set(
      pendingArchiveNodeIds.filter(
        (_, i) => results[i].status === 'fulfilled',
      ),
    );
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(
          `[handleConfirmArchive] deleteNode failed: ${pendingArchiveNodeIds[i]}`,
          result.reason,
        );
      }
    });

    // 로컬 state 즉시 업데이트 — 삭제 성공분만 제거, 실패분은 화면에 유지(재시도 가능)
    if (deletedIds.size > 0) {
      // 삭제된 노드의 대기 중 제목 저장 타이머 정리 — 발사되면 404
      deletedIds.forEach((nodeId) => {
        const timer = titleDebounceRef.current.get(nodeId);
        if (timer) clearTimeout(timer);
        titleDebounceRef.current.delete(nodeId);
      });
      setEdges((snapshot) =>
        snapshot.filter(
          (edge) =>
            !deletedIds.has(edge.source) && !deletedIds.has(edge.target),
        ),
      );
      setNodes((snapshot) =>
        snapshot.filter((node) => !deletedIds.has(node.id)),
      );
      setHoveredNodeId((prev) => (prev && deletedIds.has(prev) ? null : prev));
      setMyOpenEditorNodeIds((prev) =>
        prev.filter((id) => !deletedIds.has(id)),
      );
      setWorkingOnEditorNodeId((prev) =>
        prev && deletedIds.has(prev) ? null : prev,
      );
      // 삭제된 노드의 접힘 항목 정리 — stale 항목은 계산 시 무시되므로 필수는
      // 아니지만 맵이 커지지 않게 유지
      setCollapsedMap((prev) => {
        if (!Array.from(prev.keys()).some((id) => deletedIds.has(id))) {
          return prev;
        }
        const next = new Map(prev);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
    }
    setPendingArchiveNodeIds([]);
    setIsArchiveModalOpen(false);
    setIsArchiveDeleting(false);
  }, [pendingArchiveNodeIds, workspaceId, setNodes, setEdges]);

  const edgesWithPresentation = useMemo(
    () =>
      edges.map((edge) => ({
        ...buildEdgePresentation(edge, nodes, edges),
        // 양 끝 중 하나라도 숨겨진 노드면 엣지도 숨김
        hidden:
          collapseState.hiddenIds.has(edge.source) ||
          collapseState.hiddenIds.has(edge.target),
      })),
    [nodes, edges, collapseState],
  );

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
                    // 서버가 이 시점에 target 서브트리 depth를 갱신하므로 로컬도 동일 규칙 적용
                    updatedNodes = applyDepthOnEdgeDelete(
                      updatedNodes,
                      updatedEdges,
                      edge.target,
                    );
                    const remainingParentId = getParentId(
                      edge.target,
                      updatedEdges,
                    );
                    const remainingParent = remainingParentId
                      ? updatedNodes.find((n) => n.id === remainingParentId)
                      : null;
                    const color = remainingParent
                      ? getGraphColor(remainingParentId!, updatedNodes)
                      : DEFAULT_NODE_COLOR;
                    // 페인트가 색을 바꾸기 전에 저장 대상 집합을 확정해 둔다
                    const recolorIds = getRecolorTargetIds(
                      edge.target,
                      updatedNodes,
                      updatedEdges,
                    );
                    updatedNodes = updateSubtreeColors(
                      edge.target,
                      updatedNodes,
                      updatedEdges,
                      color,
                    );

                    recolorIds.forEach((id) =>
                      updateNodeContent(workspaceId, id, {
                        color: color.bg,
                        textColor: color.text,
                      }).catch((err) =>
                        console.error(
                          '[updateNodeContent after edge delete] failed',
                          err,
                        ),
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
      if (
        isInvalidConnection(connection.source, connection.target, nodes, edges)
      ) {
        return false;
      }

      // 같은 그래프(같은 depth 0 루트 공유) 내 노드끼리는 연결 불가 (#146 —
      // 메인 노드 없는 그래프에서도 동작. 루트 ↔ 서브 재연결·조상·형제 연결 차단)
      const sourceRoot = getRootNodeForSubtree(connection.source, nodes, edges);
      const targetRoot = getRootNodeForSubtree(connection.target, nodes, edges);
      if (sourceRoot && targetRoot && sourceRoot.id === targetRoot.id) {
        return false;
      }

      /*
       * CONTEXT
       * - Problem      : 서로 다른 그래프를 잇는 크로스 그래프 엣지는 이동·색 전파·삭제
       *                  캐스케이드가 그래프 경계를 넘게 만들고, depth≠0 root 같은
       *                  데이터 꼬임(Aideep_backend#64)을 낳는다.
       * - Why          : 크로스 엣지의 유일한 신규 발생 경로가 핸들 드래그(onConnect)라서
       *                  여기서 색 비교로 원천 차단한다. 색 = 그래프 정체성 (findCross-
       *                  ColorChildEdges와 동일 기준). 둘 다 엣지를 가진 노드만 검사 —
       *                  단독 노드는 색이 남아 있어도 그래프 편입(swap 케이스 2) 허용.
       * - Alternatives : 서버 createEdge 검증 — 그래프 식별 기준(색? root?)을 서버가
       *                  모르므로 백엔드 논의 필요, 클라 차단 후 후순위 이슈.
       * - Trade-offs   : 두 그래프를 직접 잇는 기능(#117의 "양쪽 색 유지" 규칙)이 사라진다.
       *                  같은 색 loose 트리끼리는 같은 그래프 취급이라 여전히 병합 가능.
       * - Edge Case    : 색 미확정(legacy 무색 main)이면 차단하지 않는다 — 오판 방지,
       *                  대칭이동 절단과 같은 맹점 (Aideep_backend#52 전까지).
       */
      const sourceInGraph = edges.some(
        (e) => e.source === connection.source || e.target === connection.source,
      );
      const targetInGraph = edges.some(
        (e) => e.source === connection.target || e.target === connection.target,
      );
      if (sourceInGraph && targetInGraph) {
        const colorOf = colorOfNodeIn(nodes);
        const srcColor = colorOf(connection.source);
        const tgtColor = colorOf(connection.target);
        if (
          srcColor !== undefined &&
          tgtColor !== undefined &&
          srcColor !== tgtColor
        ) {
          return false;
        }
      }

      // 단일 부모 불변식 (#92): swap 이후의 실제 자식이 이미 부모를 가지면 차단
      const { targetId } = resolveConnectionDirection(
        connection.source,
        connection.target,
        nodes,
        edges,
      );
      if (getParentId(targetId, edges) !== null) {
        return false;
      }

      // 부모가 있는 노드의 부모 방향(target-*) 핸들로는 연결 불가 —
      // 연결은 부모 반대 방향으로만 가능 (docs/GRAPH_RULES.md §3-2).
      // swap으로 그래프 쪽이 부모가 되는 케이스(단독 노드 편입)도 드롭 지점이
      // 부모 방향이면 막는다. 부모 없는 노드의 target 핸들 드롭은 허용.
      if (
        connection.targetHandle?.startsWith('target-') &&
        getParentId(connection.target, edges) !== null
      ) {
        return false;
      }

      return true;
    },
    [nodes, edges],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      /*
       * CONTEXT
       * - Problem      : 서로 다른 그래프(색 다름) 간 연결은 isValidConnection이 차단하므로
       *                  onConnect에 도달하는 연결은 단독 노드·같은 색 트리뿐이다.
       * - Why          : 남은 케이스는 전부 "target을 source 그래프에 편입"이 맞다 —
       *                  항상 재배치·재색칠한다. main(프로젝트) 노드는 항상 부모(source).
       * - Alternatives : 기존 "그래프 ↔ 그래프는 양쪽 색 유지, 연결만 생성" 분기(#117) —
       *                  크로스 엣지의 유일한 신규 발생 경로였고, 차단 결정으로 도달 불가가
       *                  되어 제거 (Aideep_backend#64 논의).
       * - Trade-offs   : 단독 노드 → 그래프 연결(케이스 2)은 그래프 쪽이 부모가 되어
       *                  색을 전파한다 (단독 노드가 그래프에 편입되는 시나리오).
       * - Edge Case    : 실제 자식(swap 이후 targetId)이 이미 부모를 가지면 연결 자체를
       *                  차단한다 — 단일 부모 불변식 (#92). 과거에는 incoming 2개를
       *                  허용했으나 트리 전제(getParentId 단일 반환)와 충돌해 버그로 재분류.
       */
      const { sourceId, targetId, shouldSwap, bothInGraphs } =
        resolveConnectionDirection(params.source, params.target, nodes, edges);

      // 단일 부모 불변식 (#92): 실제 자식이 이미 부모를 가지면 연결하지 않는다.
      // isValidConnection이 드래그 중에 걸러주지만, 프로그래매틱 연결 대비 이중 방어.
      if (getParentId(targetId, edges) !== null) return;

      // 부모 있는 노드의 부모 방향(target-*) 핸들 연결 차단 — isValidConnection과 동일 규칙
      if (
        params.targetHandle?.startsWith('target-') &&
        getParentId(params.target, edges) !== null
      )
        return;

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

      const colorToPropagate = getGraphColor(sourceId, nodes);

      // target이 트리째 병합될 때 서브트리 방향 정규화 대상 (subtreeInternalEdgeFilter CONTEXT 참고)
      const mergedSubtreeIds = tgtNode
        ? getSameGraphDescendantIds(tgtNode, nodes, edges)
        : new Set<string>();

      // 연결 직전 위치 스냅샷 — 엣지 생성 성공 후 위치 저장 시 서버 delta 전파
      // 시뮬레이션의 기준값으로 쓴다 (saveDragPositions CONTEXT 참고)
      const preConnectPositions = new Map<string, { x: number; y: number }>();
      [targetId, ...getDescendantIds(targetId, edges)].forEach((id) => {
        const n = nodes.find((node) => node.id === id);
        if (n) {
          preConnectPositions.set(id, { x: n.position.x, y: n.position.y });
        }
      });

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

          // 연결 방향이 확정된 시점에 handleSide를 node.data에 저장 — 서브트리 자손 포함
          positionedNodes = positionedNodes.map((node) =>
            node.id === targetId || mergedSubtreeIds.has(node.id)
              ? { ...node, data: { ...node.data, handleSide: computedSide } }
              : node,
          );

          // 반대 방향으로 뻗어 있던 서브트리는 대칭이동 (재부모화 경로와 동일 규칙)
          if (mergedSubtreeIds.size > 0) {
            const movedTarget = positionedNodes.find((n) => n.id === targetId);
            const subtreeNodes = positionedNodes.filter((n) =>
              mergedSubtreeIds.has(n.id),
            );
            if (movedTarget && subtreeNodes.length > 0) {
              const targetCenterX =
                movedTarget.position.x + (movedTarget.width ?? NODE_WIDTH) / 2;
              const avgChildCenterX =
                subtreeNodes.reduce(
                  (sum, n) => sum + n.position.x + (n.width ?? NODE_WIDTH) / 2,
                  0,
                ) / subtreeNodes.length;
              const needsMirror =
                computedSide === 'right'
                  ? avgChildCenterX < targetCenterX
                  : avgChildCenterX > targetCenterX;
              if (needsMirror) {
                positionedNodes = mirrorSubtree(
                  positionedNodes,
                  mergedSubtreeIds,
                  targetCenterX,
                );
              }
            }
          }
        }

        return updateSubtreeColors(
          targetId,
          positionedNodes,
          edges,
          colorToPropagate,
        );
      });

      // 서브트리 내부 엣지 핸들도 새 방향으로 — 로컬 상태와 서버 저장분 동시 갱신
      if (mergedSubtreeIds.size > 0) {
        const isMergedInternal = subtreeInternalEdgeFilter(
          targetId,
          mergedSubtreeIds,
        );
        const mergedSourceHandle = resolveHandleId('source', computedSide);
        const mergedTargetHandle = resolveHandleId('target', computedSide);
        setEdges((prev) =>
          prev.map((e) =>
            isMergedInternal(e)
              ? {
                  ...e,
                  sourceHandle: mergedSourceHandle,
                  targetHandle: mergedTargetHandle,
                }
              : e,
          ),
        );
        persistSubtreeEdgeHandles(
          workspaceId,
          edges,
          isMergedInternal,
          computedSide,
        );
      }

      createEdge(
        workspaceId,
        sourceId,
        targetId,
        resolvedSourceHandle,
        resolvedTargetHandle,
      )
        .then(({ edgeId }) => {
          setEdges((prev) => [
            ...prev,
            {
              id: edgeId,
              source: sourceId,
              target: targetId,
              type: 'branch',
              sourceHandle: resolvedSourceHandle,
              targetHandle: resolvedTargetHandle,
            },
          ]);
          // 서버가 이 시점에 target 서브트리 depth를 갱신하므로 로컬도 동일 규칙 적용
          setNodes((prev) => applyDepthOnEdgeCreate(prev, edges, sourceId, targetId));
          getRecolorTargetIds(targetId, nodes, edges).forEach((id) =>
            updateNodeContent(workspaceId, id, {
              color: colorToPropagate.bg,
              textColor: colorToPropagate.text,
            }).catch((err) => console.error('[updateNodeColor] failed', err)),
          );
          // 연결로 이동한 target(및 서브트리) 위치 저장 — 저장을 누락하면
          // 새로고침 시 연결 전 위치로 되돌아가 엣지가 노드를 가로지른다.
          // root만 PATCH하고 서버 delta 전파와 어긋나는 자손(대칭이동분)만
          // 보정한다 (saveDragPositions CONTEXT 참고)
          void saveDragPositions(
            workspaceId,
            [{ id: targetId }],
            nodesRef.current,
            edges,
            preConnectPositions,
          );
        })
        .catch((err) => console.error('[createEdge] failed', err));
    },
    [nodes, edges, workspaceId, setNodes, setEdges],
  );

  /* =========================
     핸들 드래그로 빈 공간에 새 노드 생성
     ========================= */
  const onConnectStart = useCallback(() => {
    isConnectingRef.current = true;
  }, []);

  const onConnectEnd = useCallback(
    async (event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
      // 핸들에서 직접 뽑은 엣지가 다른 노드에 연결되지 않았을 때 (엣지를 빈 공간에 드롭) 새 노드 생성하며 연결 생성
      if (!connectionState.isValid) {
        const fromNode = connectionState.fromNode;
        if (!fromNode) return;
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
          (n) => n.id === fromNode.id,
        );
        if (!sourceNode) return;

        // 어느 핸들에서 연결이 시작되었는지 확인
        const fromHandle = connectionState.fromHandle?.id || '';
        let side: 'left' | 'right';

        const forcedSourceSide = getForcedOutboundSideForSubNode(
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
          const rootNode = getRootNodeForSubtree(sourceNode.id, nodes, edges);
          const referenceX =
            parentNode?.position.x ?? rootNode?.position.x ?? 0;
          side = getTargetSideRelativeToParent(
            sourceNode.position.x,
            referenceX,
          );
        }

        // source 노드 기준으로 적절한 거리에 위치 조정 — 새 노드는 제목 없는
        // 서브 노드이므로 실측 대신 근사 폭으로 거리 계산 (#215)
        const adjustedPosition = adjustPositionRelativeToSource(
          sourceNode,
          originalPosition.y,
          side,
          nodes,
          edges,
          undefined,
          { width: EMPTY_SUB_NODE_WIDTH } as Node,
        );

        // 생성 위치에 이미 노드가 있으면 아무것도 생성하지 않는다.
        // isConnectingRef 해제는 함수 끝 공통 처리와 동일하게 수행 —
        // 그냥 return하면 플래그가 남아 직후 pane 클릭 노드 생성이 막힌다.
        const candidate = {
          id: '__connect_end_candidate__',
          position: adjustedPosition,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          data: {},
        } as Node;
        if (nodes.some((node) => isOverlapping(candidate, node))) {
          setTimeout(() => {
            isConnectingRef.current = false;
          }, 0);
          return;
        }

        // source 노드의 색상 가져오기
        const colorPair = getGraphColor(fromNode.id, nodes);

        try {
          const { nodeId } = await createMdNode(
            workspaceId,
            '',
            adjustedPosition,
            {
              markdownBody: '',
              jsonBody: EMPTY_LEXICAL_JSON,
              color: colorPair.bg,
              textColor: colorPair.text,
            },
          );

          // WS NODE_CREATE 필터링(useWorkspaceWS)으로 race condition이 제거됨.
          // 본인 생성 노드의 WS 이벤트는 무시되므로 REST 응답이 항상 최초 삽입.
          setNodes((prev) => [
            ...prev,
            {
              id: nodeId,
              type: 'textUpdater',
              position: adjustedPosition,
              data: {
                title: '',
                isMain: false,
                depth: 0, // 서버 생성 초기값과 동일 — 엣지 생성 성공 시 전파로 갱신
                color: colorPair.bg,
                textColor: colorPair.text,
                handleSide: side,
              },
            },
          ]);

          const fromHandleId = fromHandle || `source-${side}`;
          const targetHandleId = `target-${side === 'left' ? 'right' : 'left'}`;
          createEdge(
            workspaceId,
            fromNode.id,
            nodeId,
            fromHandleId,
            targetHandleId,
          )
            .then(({ edgeId }) => {
              setEdges((prev) => [
                ...prev,
                {
                  id: edgeId,
                  source: fromNode.id,
                  target: nodeId,
                  type: 'branch',
                  sourceHandle: fromHandleId,
                  targetHandle: targetHandleId,
                },
              ]);
              // 방금 만든 노드는 자손이 없으므로 엣지 목록 없이 depth만 전파
              setNodes((prev) =>
                applyDepthOnEdgeCreate(prev, [], fromNode.id, nodeId),
              );
            })
            .catch((err) =>
              console.error('[onConnectEnd] createEdge failed', err),
            );
        } catch (err) {
          console.error('[onConnectEnd] node creation failed', err);
        }
      }

      // onPaneClick이 실행되지 않도록 약간의 딜레이 후 플래그 해제
      setTimeout(() => {
        isConnectingRef.current = false;
      }, 0);
    },
    [screenToFlowPosition, nodes, edges, workspaceId, setNodes, setEdges],
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
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setMyOpenEditorNodeIds((prev) => {
      if (prev.includes(node.id)) {
        // 이미 열려 있으면 포커스만 이동
        return prev;
      }
      return [...prev, node.id];
    });
    setWorkingOnEditorNodeId(node.id);
  }, []);

  /* =========================
     Empty pane click → close context menu only
     ========================= */
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (isConnectingRef.current) return;
      if (contextMenuNodeId) {
        setContextMenuNodeId(null);
        return;
      }
      if (event.button !== 0) return;
    },
    [contextMenuNodeId],
  );

  /* =========================
     Empty pane double-click → create MD node
     ========================= */
  const onPaneDoubleClick = useCallback(
    async (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains('react-flow__pane')) return;
      if (isConnectingRef.current) return;

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

        setNodes((prev) => [
          ...prev,
          {
            id: nodeId,
            type: 'textUpdater',
            position,
            data: {
              title: '',
              isMain: false,
              depth: 0, // 서버 생성 초기값과 동일
              color: colorPair.bg,
              textColor: colorPair.text,
            },
          },
        ]);
      } catch (err) {
        console.error('[onPaneDoubleClick] createMdNode failed', err);
      }
    },
    [screenToFlowPosition, workspaceId, setNodes],
  );

  /* =========================
     Empty pane right-click → create PROJECT node
     ========================= */
  const createProjectNodeAt = useCallback(
    async (position: { x: number; y: number }) => {
      try {
        // 그래프 색을 생성 시점에 확정한다 — 화면은 TextUpdateNode가 isMain이면
        // 항상 MAIN_NODE_COLOR(흰색)로 그리므로 표시는 그대로 흰색이다.
        const colorPair = getRandomColorPair();
        const { nodeId } = await createProjectNode(workspaceId, '', position, {
          color: colorPair.bg,
          textColor: colorPair.text,
        });

        setNodes((prev) => [
          ...prev,
          {
            id: nodeId,
            type: 'textUpdater',
            position,
            data: {
              title: '',
              isMain: true,
              color: colorPair.bg,
              textColor: colorPair.text,
            },
          },
        ]);
      } catch (err) {
        console.error('[createProjectNodeAt] createProjectNode failed', err);
      }
    },
    [workspaceId, setNodes],
  );

  const onPaneContextMenu = useCallback(
    async (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      if (isConnectingRef.current) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      await createProjectNodeAt(position);
    },
    [screenToFlowPosition, createProjectNodeAt],
  );

  /* =========================
     보이는 노드 생성 진입점 (#204) — 빈 캔버스 CTA·플로팅 + 버튼 공용
     ========================= */
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const createProjectAtViewportCenter = useCallback(async () => {
    if (isCreatingProject) return;
    const rect = wrapperRef.current?.getBoundingClientRect();
    const position = screenToFlowPosition({
      x: (rect?.left ?? 0) + (rect?.width ?? window.innerWidth) / 2,
      y: (rect?.top ?? 0) + (rect?.height ?? window.innerHeight) / 2,
    });
    setIsCreatingProject(true);
    try {
      await createProjectNodeAt(position);
    } finally {
      setIsCreatingProject(false);
    }
  }, [isCreatingProject, screenToFlowPosition, createProjectNodeAt]);

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

      const closestNode = findClosestNodeInRange(
        draggedPreview,
        nodes,
        edges,
        collapseState.hiddenIds,
      );
      const isInvalid =
        closestNode &&
        isInvalidConnection(closestNode.id, draggedPreview.id, nodes, edges);
      setHoveredNodeId(isInvalid ? null : (closestNode?.id ?? null));
    },
    [screenToFlowPosition, nodes, edges, collapseState.hiddenIds, setNodes],
  );

  const onDrop = useCallback(
    async (event: DragEvent) => {
      const raw = event.dataTransfer.getData('application/resource-subitem');
      if (!raw) return;
      event.preventDefault();

      let payload: {
        id: string;
        name: string;
        markdownBody?: string;
        jsonBody?: string;
      } | null = null;
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
        targetParent &&
        !isInvalidConnection(targetParent.id, '__new__', nodes, edges);

      // hoveredNode(sourceNode)가 handleSide를 가지면 상속, 없으면(root) 위치 기반
      const dropSide: 'left' | 'right' | undefined = (() => {
        if (!shouldConnect || !targetParent) return undefined;
        const storedSide = targetParent.data?.handleSide as
          | 'left'
          | 'right'
          | undefined;
        return (
          storedSide ??
          getTargetSideRelativeToParent(basePosition.x, targetParent.position.x)
        );
      })();

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
        ? getGraphColor(targetParent.id, nodes)
        : DEFAULT_NODE_COLOR;

      try {
        const { nodeId } = await createMdNode(
          workspaceId,
          payload.name,
          position,
          {
            markdownBody: payload.markdownBody ?? '',
            jsonBody: payload.jsonBody ?? EMPTY_LEXICAL_JSON,
            color: colorPair.bg,
            textColor: colorPair.text,
          },
        );

        // WS NODE_CREATE 필터링(useWorkspaceWS)으로 race condition이 제거됨.
        // 본인 생성 노드의 WS 이벤트는 무시되므로 REST 응답이 항상 최초 삽입.
        setNodes((prev) => [
          ...prev,
          {
            id: nodeId,
            type: 'textUpdater',
            position,
            data: {
              title: payload.name,
              isMain: false,
              depth: 0, // 서버 생성 초기값과 동일 — 연결 시 전파로 갱신
              color: colorPair.bg,
              textColor: colorPair.text,
              ...(dropSide && { handleSide: dropSide }),
            },
          },
        ]);

        if (shouldConnect && targetParent && dropSide) {
          const sourceHandle = `source-${dropSide}`;
          const targetHandle = `target-${dropSide === 'left' ? 'right' : 'left'}`;
          createEdge(
            workspaceId,
            targetParent.id,
            nodeId,
            sourceHandle,
            targetHandle,
          )
            .then(({ edgeId }) => {
              setEdges((prev) => [
                ...prev,
                {
                  id: edgeId,
                  source: targetParent.id,
                  target: nodeId,
                  type: 'branch',
                  sourceHandle,
                  targetHandle,
                },
              ]);
              // 방금 만든 노드는 자손이 없으므로 엣지 목록 없이 depth만 전파
              setNodes((prev) =>
                applyDepthOnEdgeCreate(prev, [], targetParent.id, nodeId),
              );
            })
            .catch((err) => console.error('[onDrop] createEdge failed', err));
        }
      } catch (err) {
        console.error('[onDrop] createMdNode failed', err);
        setHoveredNodeId(null);
        return;
      }

      setHoveredNodeId(null);
    },
    [
      screenToFlowPosition,
      nodes,
      edges,
      hoveredNodeId,
      workspaceId,
      setNodes,
      setEdges,
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

      // 드래그 노드와 같은 그래프(같은 색)의 자식들만 함께 고정 — 크로스 그래프 노드는 제외
      const childrenIds = getSameGraphDescendantIds(draggedNode, nodes, edges);
      const fixedNodeIds = new Set([draggedNode.id, ...childrenIds]);

      // 다중 선택 드래그: 선택된 모든 노드와 그 서브트리도 고정
      const selectedNodes = nodesRef.current.filter((n) => n.selected);
      isMultiDragRef.current = selectedNodes.length > 1;
      if (isMultiDragRef.current) {
        selectedNodes.forEach((sel) => {
          fixedNodeIds.add(sel.id);
          getDescendantIds(sel.id, edges).forEach((id) => fixedNodeIds.add(id));
        });
      }

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
        // 숨겨진 노드는 충돌 계산에서 제외 — 단, 배열에는 남겨 접힌 부모 드래그 시
        // 자손 delta 이동(onNodeDrag의 d3NodesRef 경유)은 유지한다
        ghost: collapseState.hiddenIds.has(n.id),
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

      // 전체 노드 위치 스냅샷 — 드래그 종료 시 서버 delta 전파 시뮬레이션 기준
      dragStartPositionsRef.current = new Map(
        nodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }]),
      );

      // 엣지 핸들 스냅샷 — 드래그 중 반전으로 바뀐 핸들의 서버 저장 diff 기준
      dragStartEdgeHandlesRef.current = new Map(
        edges.map((e) => [
          e.id,
          { source: e.sourceHandle, target: e.targetHandle },
        ]),
      );
    },
    [nodes, edges, collapseState],
  );

  const onNodeDrag = useCallback(
    (event: React.MouseEvent, draggedNode: Node) => {
      // 드래그 중에 가까운 노드 찾기
      const closestNode = findClosestNodeInRange(
        draggedNode,
        nodes,
        edges,
        collapseState.hiddenIds,
      );
      // 이미 연결된 노드는 hover 효과 제외
      const isInvalid =
        closestNode &&
        isInvalidConnection(closestNode.id, draggedNode.id, nodes, edges);
      setHoveredNodeId(isInvalid ? null : (closestNode?.id ?? null));

      // 좌우 전환 시 서브트리 대칭 이동 + 노드/엣지 핸들 및 hub 정보 업데이트
      // dragged node 자체는 사용자가 드래그하는 위치를 따라가므로 위치 변경 없음
      let didMirrorSubtree = false;
      const previousPosition = previousDragPositionRef.current;
      if (previousPosition && !isRootNode(draggedNode) && !isMultiDragRef.current) {
        const rootNode = getRootNodeForSubtree(draggedNode.id, nodes, edges);
        const isDirectChildOfRoot =
          rootNode && getParentId(draggedNode.id, edges) === rootNode.id;
        if (rootNode && isDirectChildOfRoot) {
          const rootAxisX =
            rootNode.position.x + (rootNode.width ?? NODE_WIDTH) / 2;
          const nodeWidth = draggedNode.width ?? NODE_WIDTH;
          const nodeHeight = draggedNode.height ?? NODE_HEIGHT;
          const beforeCenterX = previousPosition.x + nodeWidth / 2;
          const afterCenterX = draggedNode.position.x + nodeWidth / 2;
          const afterCenterY = draggedNode.position.y + nodeHeight / 2;
          const beforeSide = beforeCenterX < rootAxisX ? 'left' : 'right';
          const afterSide = afterCenterX < rootAxisX ? 'left' : 'right';

          if (beforeSide !== afterSide) {
            const newSide: 'left' | 'right' = afterSide;

            // 대칭이동으로 draggedNode의 handleSide가 newSide로 바뀌는데, rootNode의
            // 그 방향이 이미 접혀 있으면 computeCollapseState가 draggedNode를 hidden
            // 판정해 커서 아래에서 사라진다 — 자동으로 펼쳐서 방지한다.
            // rootNode가 실제 root(depth 0)면 방향별 항목만 해제(computeCollapseState의
            // root 분기와 동일), getRootNodeForSubtree의 fallback(조상 체인 끝, 비루트)이면
            // 방향 무관 단일 접힘이므로(비root 분기) 항목 전체를 해제해야 판정이 맞는다.
            setCollapsedMap((prevCollapsedMap) => {
              const entry = prevCollapsedMap.get(rootNode.id);
              if (!entry) return prevCollapsedMap;
              const rootIsCollapseRoot = isRootNode(rootNode);
              const isCollapsedTowardNewSide = rootIsCollapseRoot
                ? Boolean(entry[newSide])
                : Boolean(entry.left || entry.right);
              if (!isCollapsedTowardNewSide) return prevCollapsedMap;

              const nextCollapsedMap = new Map(prevCollapsedMap);
              if (rootIsCollapseRoot) {
                const updatedSides = { ...entry, [newSide]: undefined };
                if (!updatedSides.left && !updatedSides.right) {
                  nextCollapsedMap.delete(rootNode.id);
                } else {
                  nextCollapsedMap.set(rootNode.id, updatedSides);
                }
              } else {
                nextCollapsedMap.delete(rootNode.id);
              }
              return nextCollapsedMap;
            });

            const subtreeIds = getSameGraphDescendantIds(
              draggedNode,
              nodes,
              edges,
            );
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
                // rootNode와 draggedNode 사이 엣지 정보 업데이트: source 노드는 rootNode (위치 불변), 사용하는 source handle side만 바뀜
                if (
                  edge.source === rootNode.id &&
                  edge.target === draggedNode.id
                ) {
                  const srcWidth = rootNode.width ?? NODE_WIDTH;
                  // position.x 기준: right → position.x + width, left → position.x
                  const srcHandleX =
                    rootNode.position.x + (newSide === 'right' ? srcWidth : 0);
                  return {
                    ...edge,
                    sourceHandle: newSourceHandle,
                    targetHandle: newTargetHandle,
                    data: {
                      ...edge.data,
                      hubX:
                        srcHandleX +
                        (newSide === 'right' ? HUB_OFFSET : -HUB_OFFSET),
                      hubY: rootNode.position.y + NODE_HEIGHT / 2,
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

            // 색이 다른(다른 그래프) 직계 자식은 대칭이동을 따라오지 않아 연결
            // 방향 규칙이 꼬인다 → 해당 크로스 그래프 엣지는 대칭이동과 함께 끊는다
            const crossEdges = findCrossColorChildEdges(
              [draggedNode.id, ...subtreeIds],
              nodes,
              edges,
            );
            if (crossEdges.length > 0) {
              const crossEdgeIds = new Set(crossEdges.map((e) => e.id));
              const remainingEdges = edges.filter(
                (e) => !crossEdgeIds.has(e.id),
              );
              setEdges((prev) => prev.filter((e) => !crossEdgeIds.has(e.id)));
              // 서버가 각 엣지 삭제 시 target 서브트리 depth를 갱신하므로 로컬도 동일 규칙 적용
              setNodes((prev) =>
                crossEdges.reduce(
                  (acc, e) => applyDepthOnEdgeDelete(acc, remainingEdges, e.target),
                  prev,
                ),
              );
              crossEdges.forEach((e) =>
                deleteEdge(workspaceId, e.id).catch((err) =>
                  console.error(`[deleteEdge mirror ${e.id}] failed`, err),
                ),
              );
            }

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
        const childrenIds = getSameGraphDescendantIds(draggedNode, nodes, edges);

        childrenIds.forEach((childId) => {
          const d3ChildNode = d3NodesRef.current.find((n) => n.id === childId);
          if (d3ChildNode && d3ChildNode.fx != null && d3ChildNode.fy != null) {
            // 기존 fx/fy에 delta를 더해서 부모와 함께 이동
            d3ChildNode.fx += delta.x;
            d3ChildNode.fy += delta.y;
          }
        });

        // 다중 선택 드래그: 다른 선택 노드들과 그 서브트리도 delta만큼 이동
        if (isMultiDragRef.current) {
          const alreadyMoved = new Set<string>([
            draggedNode.id,
            ...childrenIds,
          ]);
          const otherSelected = nodesRef.current.filter(
            (n) => n.selected && n.id !== draggedNode.id,
          );
          otherSelected.forEach((selNode) => {
            [selNode.id, ...getDescendantIds(selNode.id, edges)].forEach(
              (id) => {
                if (alreadyMoved.has(id)) return;
                alreadyMoved.add(id);
                const d3n = d3NodesRef.current.find((n) => n.id === id);
                if (d3n && d3n.fx != null && d3n.fy != null) {
                  d3n.fx += delta.x;
                  d3n.fy += delta.y;
                }
              },
            );
          });
        }
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
    [
      nodes,
      edges,
      workspaceId,
      collapseState.hiddenIds,
      setNodes,
      setEdges,
      setCollapsedMap,
    ],
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, draggedNode: Node) => {
      // hover-snap 발생 시 adjustedPosition을 추적하여 moveNode에 전달
      let finalPosition = draggedNode.position;
      // 재부모화가 실행되면 그 경로의 persistSubtreeEdgeHandles가 핸들을
      // 저장하므로, 아래 드래그 반전 diff 스윕은 건너뛴다 (동일 엣지 이중 PATCH 방지)
      let didReparent = false;

      // 메인 노드 드래그로 다른 노드를 편입시킨 경우, 편입되는 상대 노드+서브트리.
      // 저장 대상 집합(draggedChildrenIds = 메인의 같은 색 자손)에 안 잡혀 별도 저장이 필요(§10-7).
      let incorporatedIds: string[] = [];

      // hover된 노드가 있으면 연결 생성 (다중 선택 드래그 중에는 hover-snap 비활성화)
      if (hoveredNodeId && !isMultiDragRef.current) {
        const newParent = nodes.find((n) => n.id === hoveredNodeId);
        const draggedIsMain = draggedNode.data?.isMain === true;
        if (
          newParent &&
          !isInvalidConnection(
            draggedIsMain ? draggedNode.id : newParent.id,
            draggedIsMain ? newParent.id : draggedNode.id,
            nodes,
            edges,
          )
        ) {
          didReparent = true;

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
          const parentHasParent = !isRootNode(parentNode);
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
            const childrenIds = getSameGraphDescendantIds(
              childNode,
              currentNodes,
              edges,
            );
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

          // 자손 위치 저장은 d3 좌표를 읽으므로(§5-3), 화면에 적용한 스냅 보정 delta를
          // d3ref에도 반영한다 — 누락하면 보정 전 좌표가 서버에 저장됨(§10-7).
          // (드래그 노드 본인은 finalPosition으로 별도 저장되므로 여기 포함돼도 무해)
          const snapMovedIds = new Set([
            childNode.id,
            ...getSameGraphDescendantIds(childNode, nodes, edges),
          ]);
          d3NodesRef.current.forEach((d3n) => {
            if (!snapMovedIds.has(d3n.id)) return;
            if (d3n.x != null) d3n.x += deltaX;
            if (d3n.y != null) d3n.y += deltaY;
          });

          // 메인 드래그 편입: 상대 노드(childNode) 트리는 draggedNode 기준 저장 집합에
          // 안 잡히므로 종료 시 별도 저장(§10-7). 비메인은 childNode===draggedNode라 불필요.
          // 서브트리 root만 넘긴다 — saveDragPositions가 자손 보정까지 수행하므로
          // 자손을 개별 root로 태우면 자손 수만큼 중복 PATCH가 된다.
          if (draggedIsMain) incorporatedIds = [childNode.id];

          // 5. 서브트리 대칭 이동이 필요한지 확인 후 실행 (같은 그래프 노드만)
          const childrenIds = getSameGraphDescendantIds(childNode, nodes, edges);
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
                mirrorSubtree(currentNodes, childrenIds, adjustedCenterX),
              );
              // 대칭도 화면(react)에만 반영되므로 d3ref에 동기화 — 중심점 대칭은
              // 2*axis - center (top-left 폭 항이 상쇄). 미반영 시 자손이 보정 전 좌표로 저장됨(§10-7).
              d3NodesRef.current.forEach((d3n) => {
                if (childrenIds.has(d3n.id) && d3n.x != null) {
                  d3n.x = adjustedCenterX * 2 - d3n.x;
                }
              });
              // 대칭으로 자손이 반대편으로 넘어갔으니 handleSide도 새 방향으로 갱신한다.
              // 렌더 엣지는 buildEdgePresentation이 타깃 노드의 handleSide에서 핸들·hub를
              // 매 렌더 재계산하므로(§4), handleSide만 고치면 로컬 교차 렌더링이 사라진다.
              // 서버의 sourceHandle 저장은 엣지 PATCH API 부재로 여전히 미해결(새로고침 시
              // 교차 재발) — 백엔드 Aideep_backend#56 대기, §10-3.
              setNodes((currentNodes) =>
                currentNodes.map((node) =>
                  childrenIds.has(node.id)
                    ? {
                        ...node,
                        data: {
                          ...node.data,
                          handleSide: sideRelativeToParent,
                        },
                      }
                    : node,
                ),
              );
              // 색이 다른 직계 자식과의 엣지는 대칭이동과 함께 끊는다 (연결 규칙 꼬임 방지)
              const crossEdges = findCrossColorChildEdges(
                [childNode.id, ...childrenIds],
                nodes,
                edges,
              );
              if (crossEdges.length > 0) {
                const crossEdgeIds = new Set(crossEdges.map((e) => e.id));
                const remainingEdges = edges.filter(
                  (e) => !crossEdgeIds.has(e.id),
                );
                setEdges((prev) => prev.filter((e) => !crossEdgeIds.has(e.id)));
                // 서버가 각 엣지 삭제 시 target 서브트리 depth를 갱신하므로 로컬도 동일 규칙 적용
                setNodes((prev) =>
                  crossEdges.reduce(
                    (acc, e) =>
                      applyDepthOnEdgeDelete(acc, remainingEdges, e.target),
                    prev,
                  ),
                );
                crossEdges.forEach((e) =>
                  deleteEdge(workspaceId, e.id).catch((err) =>
                    console.error(`[deleteEdge mirror ${e.id}] failed`, err),
                  ),
                );
              }
            }

            // 서브트리 handleSide·내부 엣지 핸들을 새 방향으로 정규화
            // (누락 시 에러 #008 — subtreeInternalEdgeFilter CONTEXT 참고)
            setNodes((prev) =>
              prev.map((n) =>
                childrenIds.has(n.id)
                  ? {
                      ...n,
                      data: { ...n.data, handleSide: sideRelativeToParent },
                    }
                  : n,
              ),
            );
            const isReparentInternal = subtreeInternalEdgeFilter(
              childNode.id,
              childrenIds,
            );
            const reparentSourceHandle = resolveHandleId(
              'source',
              sideRelativeToParent,
            );
            const reparentTargetHandle = resolveHandleId(
              'target',
              sideRelativeToParent,
            );
            setEdges((prev) =>
              prev.map((e) =>
                isReparentInternal(e)
                  ? {
                      ...e,
                      sourceHandle: reparentSourceHandle,
                      targetHandle: reparentTargetHandle,
                    }
                  : e,
              ),
            );
            persistSubtreeEdgeHandles(
              workspaceId,
              edges,
              isReparentInternal,
              sideRelativeToParent,
            );
          }

          // 6. 엣지 업데이트 (기존 부모 연결 끊고, 새 부모 연결)
          // 기존 부모 연결 먼저 제거 — 로컬 state와 서버 모두 삭제해야 재접속 시 복원되지 않음
          setEdges((prev) =>
            existingParentEdge
              ? prev.filter((edge) => edge.id !== existingParentEdge.id)
              : prev,
          );
          if (existingParentEdge) {
            // 서버가 이 시점에 target 서브트리 depth를 갱신하므로 로컬도 동일 규칙 적용
            setNodes((prev) =>
              applyDepthOnEdgeDelete(prev, edges, existingParentEdge.target),
            );
            deleteEdge(workspaceId, existingParentEdge.id).catch((err) =>
              console.error('[deleteEdge re-parent] failed', err),
            );
          }

          // API: 새 부모 연결 — REST 응답으로 edgeId 취득 후 state 추가
          const dragStopSourceHandle = `source-${sideRelativeToParent}`;
          const dragStopTargetHandle = `target-${sideRelativeToParent === 'left' ? 'right' : 'left'}`;
          const dragStopColor = getGraphColor(parentNode.id, nodes);
          createEdge(
            workspaceId,
            parentNode.id,
            childNode.id,
            dragStopSourceHandle,
            dragStopTargetHandle,
          )
            .then(({ edgeId }) => {
              setEdges((prev) => [
                ...prev,
                {
                  id: edgeId,
                  source: parentNode.id,
                  target: childNode.id,
                  type: 'branch',
                  sourceHandle: dragStopSourceHandle,
                  targetHandle: dragStopTargetHandle,
                },
              ]);
              // 서버가 이 시점에 target 서브트리 depth를 갱신하므로 로컬도 동일 규칙 적용
              setNodes((prev) =>
                applyDepthOnEdgeCreate(prev, edges, parentNode.id, childNode.id),
              );
              getRecolorTargetIds(childNode.id, nodes, edges).forEach((id) =>
                updateNodeContent(workspaceId, id, {
                  color: dragStopColor.bg,
                  textColor: dragStopColor.text,
                }).catch((err) =>
                  console.error('[updateNodeColor drag] failed', err),
                ),
              );
            })
            .catch((err) =>
              console.error('[createEdge re-parent] failed', err),
            );

          // 7. childNode 서브트리 색상을 parentNode 색상으로 업데이트
          // dragStopColor 재사용 — 색 없는 main의 랜덤 색이 두 번 뽑히는 것 방지
          setNodes((currentNodes) =>
            updateSubtreeColors(
              childNode.id,
              currentNodes,
              edges,
              dragStopColor,
            ),
          );
        }
      }

      // D3 시뮬레이션 종료: fx, fy 해제 및 alphaTarget(0) 설정
      isDraggingRef.current = false;

      // 드래그 노드와 함께 이동한(같은 그래프) 자식들의 fx, fy 모두 해제
      const draggedChildrenIds = getSameGraphDescendantIds(
        draggedNode,
        nodes,
        edges,
      );
      const allNodesToRelease = [draggedNode.id, ...draggedChildrenIds];

      allNodesToRelease.forEach((nodeId) => {
        const d3Node = d3NodesRef.current.find((n) => n.id === nodeId);
        if (d3Node) {
          d3Node.fx = null;
          d3Node.fy = null;
        }
      });

      // 다중 선택 드래그: 다른 선택 노드들과 그 서브트리도 fx/fy 해제
      if (isMultiDragRef.current) {
        const otherSelected = nodesRef.current.filter(
          (n) => n.selected && n.id !== draggedNode.id,
        );
        otherSelected.forEach((selNode) => {
          [selNode.id, ...getDescendantIds(selNode.id, edges)].forEach((id) => {
            const d3n = d3NodesRef.current.find((n) => n.id === id);
            if (d3n) {
              d3n.fx = null;
              d3n.fy = null;
            }
          });
        });
      }

      const simulation = simulationRef.current;
      if (simulation) {
        simulation.alphaTarget(0);
      }

      // hover 상태 초기화
      setHoveredNodeId(null);

      // 드래그 위치 초기화
      previousDragPositionRef.current = null;

      // 드래그 중 좌우 반전으로 로컬에서만 바뀐 엣지 핸들을 서버에 저장.
      // 반전 후 빈 공간에 놓는 경로는 persistSubtreeEdgeHandles(재부모화·병합
      // 전용)가 닿지 않아, 드래그 시작 스냅샷과의 diff로 변경분을 골라낸다.
      const startHandles = dragStartEdgeHandlesRef.current;
      const edgesToSweep = didReparent ? [] : edges;
      edgesToSweep.forEach((e) => {
        const start = startHandles.get(e.id);
        if (!start) return;
        if (
          start.source === e.sourceHandle &&
          start.target === e.targetHandle
        ) {
          return;
        }
        updateEdge(workspaceId, e.id, {
          ...(typeof e.sourceHandle === 'string' && {
            sourceHandle: e.sourceHandle,
          }),
          ...(typeof e.targetHandle === 'string' && {
            targetHandle: e.targetHandle,
          }),
        }).catch((err) =>
          console.error(`[updateEdge drag-mirror ${e.id}] failed`, err),
        );
      });

      // API: 위치 저장 — root만 PATCH하고 서버의 자손 delta 전파와 어긋나는
      // 자손만 순차 보정한다 (saveDragPositions CONTEXT 참고)
      const rootsToSave: Array<{
        id: string;
        final?: { x: number; y: number };
      }> = [
        {
          id: draggedNode.id,
          final: { x: finalPosition.x, y: finalPosition.y },
        },
      ];

      // 메인 노드 드래그 편입(§10-7): 상대 노드+서브트리도 저장 대상 root로 추가.
      // 개별 병렬 PATCH 대신 순차 저장에 태워, 새 엣지가 서버에 먼저 생긴 경우
      // dragged root의 자손 전파와 경합(이중 이동)하지 않게 한다.
      incorporatedIds.forEach((id) => rootsToSave.push({ id }));

      // 다중 선택 드래그: 다른 선택 노드들과 그 서브트리 위치 저장
      if (isMultiDragRef.current) {
        nodesRef.current
          .filter((n) => n.selected && n.id !== draggedNode.id)
          .forEach((n) => rootsToSave.push({ id: n.id }));
        isMultiDragRef.current = false;
      }
      const startPositions = dragStartPositionsRef.current;
      // setTimeout(0): 이 핸들러의 snap·대칭이동 setNodes가 커밋된 뒤
      // nodesRef에서 최신 위치를 읽는다
      setTimeout(() => {
        void saveDragPositions(
          workspaceId,
          rootsToSave,
          nodesRef.current,
          edges,
          startPositions,
        );
      }, 0);
    },
    [nodes, edges, hoveredNodeId, workspaceId, setNodes, setEdges],
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
    <div
      ref={wrapperRef}
      className="relative w-full h-full bg-background"
      onDoubleClick={onPaneDoubleClick}
    >
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edgesWithPresentation}
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
        onPaneContextMenu={onPaneContextMenu}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragLeave={onDragLeave}
        isValidConnection={isValidConnection}
        onViewportChange={handleViewportChange}
        {...(savedViewport
          ? { defaultViewport: savedViewport }
          : { fitView: true })}
        minZoom={0.25}
        zoomOnDoubleClick={false}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
      />
      <CursorOverlay cursors={cursors} />
      <ZoomControl />
      {/* 빈 캔버스 empty state (#204) — 첫 행동을 안내하고 숨겨진 조작법을 조작 위치에서 노출.
          실제 노드 모양 안에 용어를 그대로 써서(중심 주제/일반 주제/연결점) 사용법 창과 같은
          어휘를 미리 학습시킨다. 노드 표면색은 UI 가이드의 고정 팔레트라 하드코딩 허용 */}
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
          {/* 미니 그래프: 중심 주제 노드 → 연결점 → 같은 색(같은 그래프) 일반 주제 노드 2개 */}
          <div className="flex items-center" aria-hidden="true">
            <div
              className="relative rounded-lg border px-5 py-3 text-sm font-medium"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#D9D9D9',
                color: '#2C2C2C',
              }}
            >
              중심 주제 노드
              {/* 연결점 — 노드 가장자리의 작은 점 */}
              <span
                className="absolute top-1/2 -right-[5px] h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2"
                style={{
                  backgroundColor: 'rgb(var(--background))',
                  borderColor: 'rgb(var(--ds-gray-700))',
                }}
              />
              {/* 연결점 라벨 — 점 바로 위, 연결선과 겹치지 않는 노드 우상단 바깥 */}
              <span className="absolute -top-5 right-0 translate-x-1/2 whitespace-nowrap text-[11px] text-muted">
                연결점
              </span>
            </div>
            <svg width="48" height="104" viewBox="0 0 48 104" fill="none">
              <path
                d="M0 52 H20 V26 H48"
                stroke="#D9D9D9"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M0 52 H20 V78 H48"
                stroke="#D9D9D9"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
            {/* 같은 그래프의 서브 노드는 같은 색 (색상 = 그래프 구분) */}
            <div className="flex flex-col gap-5">
              <span
                className="rounded-full px-4 py-1.5 text-[13px]"
                style={{ backgroundColor: '#E4F9C8', color: '#40512A' }}
              >
                일반 주제 노드
              </span>
              <span
                className="rounded-full px-4 py-1.5 text-[13px]"
                style={{ backgroundColor: '#E4F9C8', color: '#40512A' }}
              >
                일반 주제 노드
              </span>
            </div>
          </div>
          <p className="mt-6 text-xl font-bold text-foreground">
            첫 주제를 만들어 보세요
          </p>
          <p className="mt-1.5 text-sm text-muted">
            생각을 노드로 만들고, 연결하며 그래프로 정리하는 공간이에요.
          </p>
          <button
            type="button"
            onClick={createProjectAtViewportCenter}
            disabled={isCreatingProject}
            className="pointer-events-auto mt-5 rounded-lg bg-main px-6 py-2.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            첫 주제 만들기
          </button>
          <div className="mt-7 flex flex-col gap-2.5">
            {(
              [
                ['우클릭', '빈 곳에 중심 주제 노드 만들기'],
                ['더블 클릭', '빈 곳에 일반 주제 노드 만들기'],
                ['연결점 끌기', '노드 가장자리의 작은 점을 끌어 이어진 노드 만들기'],
              ] as const
            ).map(([action, desc]) => (
              <div key={action} className="flex items-center gap-2.5 text-sm">
                <span className="w-[88px] shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-center text-xs font-medium text-foreground">
                  {action}
                </span>
                <span className="text-muted">{desc}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[13px] text-muted">
            더 자세한 설명은 우측 상단{' '}
            <span className="font-bold text-main">사용법</span> 버튼에서 볼 수
            있어요.
          </p>
        </div>
      )}
      {/* 노드 생성 진입점을 항상 보이는 버튼으로 제공 (#204) — 뷰포트 중앙에 중심 노드 생성 */}
      {nodes.length > 0 && (
        <button
          type="button"
          onClick={createProjectAtViewportCenter}
          disabled={isCreatingProject}
          title="새 중심 노드 만들기"
          aria-label="새 중심 노드 만들기"
          className="absolute bottom-4 right-14 z-40 flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-background text-foreground transition-colors hover:bg-surface disabled:opacity-50"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}
      {/* top-20: 캔버스가 inset-0으로 ChipHeader(fixed h-16, z-30) 뒤까지 깔리므로
          top-4는 헤더에 가려진다. 헤더 높이(64px) + 16px 아래에 배치. */}
      <div className="absolute top-20 right-4 z-40 flex items-start gap-2">
        <GraphUsageGuide highlight={nodes.length === 0} />
        {myOpenEditorNodeIds.length > 0 && (
          <button
            type="button"
            onClick={handleCloseAllPanels}
            className="rounded-[5px] border border-gray-700 bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface"
          >
            에디터 모두 닫기
          </button>
        )}
      </div>
      {isArchiveModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[360px] rounded-xl border border-border bg-background p-5 shadow-xl">
            {/* 보관함 UI가 활성화되기 전까지는 사용자 입장에서 복구 수단이 없으므로
                "삭제"로 안내한다 (보관함 활성화 시 카피를 보관 문구로 되돌릴 것) */}
            <p className="text-base font-semibold">노드를 삭제할까요?</p>
            <p className="mt-2 text-sm text-muted">
              선택한 노드와 아래에 연결된 노드까지 총{' '}
              {pendingArchiveNodeIds.length}개가 삭제돼요.
            </p>
            <p className="mt-1 text-sm text-muted">삭제한 노드는 되돌릴 수 없어요.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelArchive}
                className="rounded-md border border-border px-3 py-1.5 text-sm"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={isArchiveDeleting}
                className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
              >
                삭제하기
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
