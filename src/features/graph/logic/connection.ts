import type { Node, Edge } from "@xyflow/react";
import { getParentId, getDescendantIds, getRootNodeForSubtree } from "./traversal";
import { colorOfNodeIn } from "./colors";

/*
 * CONTEXT
 * - Problem      : 그래프 규칙으로 막힌 연결은 React Flow isValidConnection이 true/false만 받아,
 *                  드롭해도 아무 일이 없고 사용자는 왜 안 되는지 알 수 없었다.
 * - Why          : 차단 규칙을 "이유"를 돌려주는 순수 함수 하나로 모은다. isValidConnection·
 *                  isInvalidConnection은 이 이유가 없는지로 판정하고, 드롭 시점(onConnectEnd)에는
 *                  같은 이유로 안내 문구를 띄운다 — 판정과 안내가 어긋날 수 없다.
 * - Alternatives : onConnectEnd에서 규칙을 다시 검사 — 규칙이 두 벌이 되어 한쪽만 바뀌는 사고가 난다.
 * - Trade-offs   : 문구는 내부 용어(그래프·루트·depth) 대신 화면에 보이는 것(프로젝트·색·묶음·점)으로 쓴다.
 * - Edge Case    : 자기 자신으로의 드롭(self)은 시도로 보지 않아 문구가 없다.
 */
export type ConnectionBlockReason =
  | 'self'
  | 'bothProjects'
  | 'alreadyConnected'
  | 'descendant'
  | 'sameGroup'
  | 'differentColor'
  | 'parentSide';

export const CONNECTION_BLOCK_MESSAGES: Record<ConnectionBlockReason, string | null> = {
  self: null,
  bothProjects: '프로젝트끼리는 연결할 수 없어요',
  alreadyConnected: '이미 연결된 노드예요',
  descendant: '아래쪽에 이어진 노드와는 연결할 수 없어요',
  sameGroup: '이미 같은 묶음에 있는 노드끼리는 선으로 이을 수 없어요. 노드를 끌어 다른 노드 위에 놓으면 옮길 수 있어요',
  differentColor: '색이 다른 노드 묶음끼리는 연결할 수 없어요',
  parentSide: '이 방향으로는 연결할 수 없어요. 노드의 반대쪽 점에서 연결해 주세요',
};

/** 모든 연결 경로(핸들 드래그·노드 드래그·드롭)에 공통인 기본 규칙 */
function getBasicBlockReason(
  sourceId: string,
  targetId: string,
  nodes: Node[],
  edges: Edge[],
): ConnectionBlockReason | null {
  if (sourceId === targetId) return 'self';

  // 프로젝트(main) 노드끼리는 직접 연결 불가
  const sourceIsMain = nodes.find((n) => n.id === sourceId)?.data?.isMain;
  const targetIsMain = nodes.find((n) => n.id === targetId)?.data?.isMain;
  if (sourceIsMain && targetIsMain) return 'bothProjects';

  // 둘이 서로 연결되어 있는지 확인
  const targetParent = getParentId(targetId, edges);
  const sourceParent = getParentId(sourceId, edges);
  if (targetParent === sourceId || sourceParent === targetId) return 'alreadyConnected';

  // 순환 방지 (§10-4/10-5): source→target 엣지는 source를 부모로 만든다. source가
  // 이미 target의 자손이면 target→…→source→target 순환이 생겨 getAncestorIds가
  // 폭주하므로(과거 탭 정지 원인) 연결 자체를 막는다.
  if (getDescendantIds(targetId, edges).has(sourceId)) return 'descendant';

  return null;
}

export function isInvalidConnection(
  sourceId: string,
  targetId: string,
  nodes: Node[],
  edges: Edge[],
): boolean {
  return getBasicBlockReason(sourceId, targetId, nodes, edges) !== null;
}

/** 핸들 드래그 연결이 막히는 이유. 연결 가능하면 null (isValidConnection과 onConnectEnd 안내가 공유) */
export function getConnectionBlockReason(
  connection: { source: string; target: string; targetHandle?: string | null },
  nodes: Node[],
  edges: Edge[],
): ConnectionBlockReason | null {
  const { source, target } = connection;
  const basic = getBasicBlockReason(source, target, nodes, edges);
  if (basic) return basic;

  // 같은 그래프(같은 depth 0 루트 공유) 내 노드끼리는 연결 불가 (#146 —
  // 메인 노드 없는 그래프에서도 동작. 루트 ↔ 서브 재연결·조상·형제 연결 차단)
  const sourceRoot = getRootNodeForSubtree(source, nodes, edges);
  const targetRoot = getRootNodeForSubtree(target, nodes, edges);
  if (sourceRoot && targetRoot && sourceRoot.id === targetRoot.id) return 'sameGroup';

  // 서로 다른 그래프(색 다름) 간 연결 차단 — 크로스 그래프 엣지의 유일한 신규 발생 경로가
  // 핸들 드래그라 여기서 막는다. 둘 다 엣지를 가진 노드만 검사(단독 노드는 색이 남아 있어도
  // 그래프 편입 허용), 색 미확정(legacy 무색 main)이면 오판 방지를 위해 막지 않는다.
  const inGraph = (id: string) => edges.some((e) => e.source === id || e.target === id);
  if (inGraph(source) && inGraph(target)) {
    const colorOf = colorOfNodeIn(nodes);
    const srcColor = colorOf(source);
    const tgtColor = colorOf(target);
    if (srcColor !== undefined && tgtColor !== undefined && srcColor !== tgtColor) {
      return 'differentColor';
    }
  }

  // 단일 부모 불변식 (#92)은 차단이 아니라 재부모화로 보장한다 (onConnect가 기존 부모 엣지를 끊음).

  // 부모가 있는 노드의 부모 방향(target-*) 핸들로는 연결 불가 — 연결은 부모 반대 방향으로만
  // (docs/GRAPH_RULES.md §3-2). 부모 없는 노드의 target 핸들 드롭은 허용.
  if (connection.targetHandle?.startsWith('target-') && getParentId(target, edges) !== null) {
    return 'parentSide';
  }

  return null;
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
