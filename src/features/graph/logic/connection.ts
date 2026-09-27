import type { Node, Edge } from "@xyflow/react";
import { getParentId } from "./traversal";

export function isInvalidConnection(
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

  return false;
}

/**
 * 핸들 드래그 연결의 실제 부모/자식 방향을 결정한다.
 * onConnect와 isValidConnection이 같은 규칙을 공유해야 단일 부모 검사가
 * swap 케이스(단독 노드 편입, main 노드가 target)에서 어긋나지 않는다.
 */
export function resolveConnectionDirection(
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
  const sourceIsMain =
    nodes.find((n) => n.id === source)?.data?.isMain === true;
  const targetIsMain =
    nodes.find((n) => n.id === target)?.data?.isMain === true;

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
