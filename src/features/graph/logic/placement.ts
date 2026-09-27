import type { Node, Edge } from "@xyflow/react";
import { getParentId, getMainNodeForSubtree } from "./traversal";
import { isInvalidConnection } from "./connection";

// TODO: 실제 노드 너비로 변경
export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 48;
export const NODE_PADDING = 0; // 완전히 부딪힐 때만 충돌
export const HUB_OFFSET = 25; // Figma 메인 화면 디자인 실측: 엣지 elbow 수평 거리 25px
const DEFAULT_NODE_DISTANCE = 64; // Figma 메인 화면 디자인 실측: 부모-자식 수평 빈 간격 64px

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

// AABB 테두리 간 최단 거리 기반으로 가장 가까운 유효한 노드 찾기
export function findClosestNodeInRange(
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

export function findNonOverlappingPosition(
  base: { x: number; y: number },
  nodes: Node[],
): { x: number; y: number } {
  const candidate = (x: number, y: number) =>
    ({
      id: "__drag_candidate__",
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

export function getForcedOutboundSideForSubNodeInMainGraph(
  node: Node,
  nodes: Node[],
  edges: Edge[],
): "left" | "right" | null {
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
): "left" | "right" {
  if (edge.sourceHandle?.includes("left")) return "left";
  if (edge.sourceHandle?.includes("right")) return "right";

  return getTargetSideRelativeToParent(
    targetNode.position.x,
    sourceNode.position.x,
  );
}

export function getTargetSideRelativeToParent(
  targetX: number,
  parentX: number,
): "left" | "right" {
  return targetX < parentX ? "left" : "right";
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
export function adjustPositionRelativeToSource(
  sourceNode: Node,
  originalY: number,
  side: "left" | "right",
  nodes: Node[],
  edges: Edge[],
  excludeNodeId?: string,
  targetNode?: Node | null,
): { x: number; y: number } {
  const sourceWidth = sourceNode?.width ?? NODE_WIDTH;
  const targetWidth = targetNode?.width ?? NODE_WIDTH;

  // 연결 방향에 따라 X 좌표 계산
  const targetX =
    side === "right"
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
      (item): item is { node: Node; edgeSide: "left" | "right" } =>
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

export function resolveHandleId(
  role: "source" | "target",
  side: "left" | "right",
): string {
  // source 핸들: side 방향과 같은 방향에 위치 (예: side="right" → source-right)
  // target 핸들: source의 반대 방향에 위치 (예: side="right"이면 target이 source 오른쪽에 있으므로 → target-left)
  if (role === "target") {
    return `target-${side === "left" ? "right" : "left"}`;
  }
  return `source-${side}`;
}

export function buildEdgePresentation(
  edge: Edge,
  nodes: Node[],
  edges: Edge[],
): Edge {
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
  const storedSide = target.data?.handleSide as "left" | "right" | undefined;
  const side =
    storedSide ??
    forcedSourceSide ??
    getTargetSideRelativeToParent(target.position.x, source.position.x);
  const sourceHandle = resolveHandleId("source", side);
  const targetHandle = resolveHandleId("target", side);
  const sourceHandleX =
    source.position.x +
    (side === "right"
      ? (source.measured?.width ?? source.width ?? NODE_WIDTH)
      : 0);

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

export function mirrorSubtree(
  nodes: Node[],
  subtreeIds: Set<string>, // root 제외, 함께 이동하는(같은 그래프) 자식들만
  parentAxisX: number,
): Node[] {
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

export function initializeHandleSides(nodes: Node[], edges: Edge[]): Node[] {
  return nodes.map((node) => {
    if (node.data?.isMain) return node;

    // Case 1: target 노드 (부모가 있음) → incoming edge의 sourceHandle로 방향 결정
    const incomingEdge = edges.find((e) => e.target === node.id);
    if (incomingEdge) {
      const side: "left" | "right" | undefined =
        incomingEdge.sourceHandle?.includes("right")
          ? "right"
          : incomingEdge.sourceHandle?.includes("left")
            ? "left"
            : undefined;
      return {
        ...node,
        data: { ...node.data, handleSide: side, hasParent: true },
      };
    }

    // Case 2: 부모 없는 non-main 노드 → hasParent: false만 표시
    return { ...node, data: { ...node.data, hasParent: false } };
  });
}
