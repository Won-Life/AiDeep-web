import type { Edge, Node } from "@xyflow/react";

export function getDescendantIds(
  nodeId: string,
  edges: Edge[],
): Set<string> {
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

/*
 * CONTEXT
 * - Problem      : 서버는 엣지 생성·삭제 시 노드 depth를 DB에서 갱신하지만(propagateDepth)
 *                  갱신된 값을 REST 응답·WS 이벤트 어디에도 싣지 않는다. depth를 로컬
 *                  상태로 쓰려면 클라이언트가 같은 규칙으로 직접 계산해야 한다.
 * - Why          : depth 변경 규칙이 결정적이고 계산 재료(source depth, target 자손 목록)를
 *                  클라이언트가 전부 로컬에 갖고 있으므로, 같은 입력에 같은 규칙을 적용하면
 *                  서버 DB와 항상 일치한다(상태 기계 복제). 색 경계 BFS가 아닌 전체 BFS를
 *                  쓰는 이유: 서버 selectAllDescendantIds가 색을 모르고 전체를 순회하므로.
 * - Alternatives : 서버가 변경된 depth 목록을 응답·이벤트에 포함 — Aideep_backend#63으로
 *                  요청함. 머지되면 이 계산을 수신값 적용으로 교체한다 (blocking 아님).
 * - Trade-offs   : 규칙이 서버(propagateDepth)와 이 파일 두 곳에 존재 — 서버 규칙이 바뀌면
 *                  함께 바꿔야 한다. 아래 테스트가 현재 서버 규칙을 고정한다.
 * - Edge Case    : depth가 없는 노드(구버전 데이터·매핑 누락)는 0으로 취급. 노드 삭제로
 *                  엣지가 지워지는 경우 서버도 depth를 전파하지 않으므로(deleteEdgesByNodeId
 *                  직접 호출) 클라이언트도 호출하지 않는다 — 서버 DB와의 동률이 우선.
 */
const depthOf = (node: Node | undefined): number =>
  typeof node?.data?.depth === "number" ? node.data.depth : 0;

function shiftSubtreeDepth(
  nodes: Node[],
  edges: Edge[],
  rootId: string,
  delta: number,
): Node[] {
  if (delta === 0) return nodes;
  const targetIds = new Set([rootId, ...getDescendantIds(rootId, edges)]);
  return nodes.map((node) =>
    targetIds.has(node.id)
      ? { ...node, data: { ...node.data, depth: depthOf(node) + delta } }
      : node,
  );
}

/** root(부모 없는 노드) 판별 — 서버가 유지하는 depth 0이 단일 기준 (issue #99).
 *  주의: isMain(PROJECT 노드)과는 다른 개념 — 연결 안 된 일반 노드도 root다. */
export function isRootNode(node: Node): boolean {
  return depthOf(node) === 0;
}

/** 서버 규칙 미러링(node.service.ts propagateDepth, increase=true):
 *  엣지 생성 시 target과 그 자손 전체 depth += source.depth + 1 */
export function applyDepthOnEdgeCreate(
  nodes: Node[],
  edges: Edge[],
  sourceId: string,
  targetId: string,
): Node[] {
  const source = nodes.find((n) => n.id === sourceId);
  if (!source) return nodes;
  return shiftSubtreeDepth(nodes, edges, targetId, depthOf(source) + 1);
}

/** 서버 규칙 미러링(node.service.ts propagateDepth, increase=false):
 *  엣지 삭제 시 target과 그 자손 전체 depth -= 삭제 직전 target.depth (target은 다시 0) */
export function applyDepthOnEdgeDelete(
  nodes: Node[],
  edges: Edge[],
  targetId: string,
): Node[] {
  const target = nodes.find((n) => n.id === targetId);
  if (!target) return nodes;
  return shiftSubtreeDepth(nodes, edges, targetId, -depthOf(target));
}

/*
 * CONTEXT
 * - Problem      : 두 그래프가 엣지로 연결되면 getDescendantIds가 색상(그래프) 경계를 넘어
 *                  다른 그래프의 노드까지 서브트리로 취급한다 (이동 시 남의 그래프가 딸려옴).
 * - Why          : 그래프 소속의 단일 식별자가 색상(모든 노드가 색을 가진다)이므로, 순회 중 rootColor와 다른 색의
 *                  노드를 만나면 그 노드와 하위 경로 전체를 제외한다.
 * - Alternatives : ① 서버 그래프 ID 관리 — 백엔드 스키마·API 변경에 더해, 그래프 병합/분리
 *                  시점(엣지 생성·삭제·재연결)마다 ID 재계산·전파 로직이 필요하고 WS 동기화
 *                  이벤트에도 태워야 함. 지금 색상 전파가 하는 일을 ID 전파가 똑같이 반복하는
 *                  꼴이라 비용 대비 실익이 없어 제외.
 *                  ② 크로스 그래프 엣지에 crossGraph 플래그 저장 — 그래프 ID보다 국소적
 *                  변경이나 엣지 메타데이터 영속화(백엔드)가 필요해 현재는 보류.
 * - Edge Case    : A(빨강) → B(빨강) → C(파랑) → D(빨강) 그래프에서 A를 루트로 순회하면
 *                  C(파랑)에서 순회가 멈춘다. 이때, D의 색이 우연히 빨강이라고 가정해도
 *                  D는 C를 거쳐야만 도달 가능하므로 결과는 {B} — D는 제외된다.
 *                  C 아래는 다른 그래프의 구조이므로 이것은 의도된 동작이다.
 */
export function getSameColorDescendantIds(
  rootId: string,
  edges: Edge[],
  rootColor: string,
  colorOf: (nodeId: string) => string | undefined,
): Set<string> {
  const descendants = new Set<string>();
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    for (const edge of edges) {
      if (edge.source !== current || descendants.has(edge.target)) continue;
      // 다른 색 = 다른 그래프 소속 → 이 경로 순회 중단
      if (colorOf(edge.target) !== rootColor) continue;
      descendants.add(edge.target);
      queue.push(edge.target);
    }
  }

  return descendants;
}

/*
 * CONTEXT
 * - Problem      : 노드 접기(collapse)는 로컬 뷰 상태인데, 협업 중 접힌 서브트리에
 *                  노드가 추가·이동·삭제될 수 있다. 토글 시점에 자손에 hidden을 직접
 *                  기록하면 이후 변경분과 어긋난다.
 * - Why          : "누가 접혔는지"만 저장하고 숨길 자손은 매 렌더 현재 edges 기준으로
 *                  재계산한다(파생 상태). getDescendantIds는 BFS 단계마다 전체 edges를
 *                  스캔하므로, 인접 리스트를 1회 구축해 O(자손수)로 순회한다.
 * - Alternatives : 토글 시점 hidden 플래그 기록 — 접힌 뒤 협업자가 추가한 노드가
 *                  숨겨지지 않아 탈락. 노드 배열에서 제거 — WS 단일 진실 소스와 충돌.
 * - Trade-offs   : 렌더마다 O(V+E) 재계산 — 마인드맵 규모(수천 노드)에서 무시 가능.
 * - Edge Case    : 접힌 노드가 삭제되면 collapsedMap에 stale 항목이 남는다 — 노드
 *                  조회 실패 시 무시하므로 무해. 비루트는 sides 방향 무관 단일 접힘으로
 *                  판정해 재부모화로 handleSide가 반전돼도 접힘이 유지된다. 크로스
 *                  그래프(legacy) 자손도 도달 가능하면 함께 숨긴다 — 경계에서 멈추면
 *                  부모 체인 없는 노드가 허공에 남는다.
 */
export type CollapseSide = "left" | "right";
export type CollapsedSides = { left?: boolean; right?: boolean };

export interface CollapseButtonView {
  side: CollapseSide;
  collapsed: boolean;
  hiddenCount: number;
}

export interface CollapseComputation {
  hiddenIds: Set<string>;
  hiddenCounts: Map<string, { left?: number; right?: number }>;
}

export function buildChildrenMap(edges: Edge[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const edge of edges) {
    const children = map.get(edge.source);
    if (children) children.push(edge.target);
    else map.set(edge.source, [edge.target]);
  }
  return map;
}

const sideOf = (node: Node | undefined): CollapseSide =>
  (node?.data?.handleSide as CollapseSide | undefined) ?? "right";

/** startIds 본인들 + 그 아래 자손 전체 */
function collectSubtree(
  startIds: string[],
  childrenMap: Map<string, string[]>,
): Set<string> {
  const result = new Set<string>(startIds);
  const queue = [...startIds];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const child of childrenMap.get(current) ?? []) {
      if (!result.has(child)) {
        result.add(child);
        queue.push(child);
      }
    }
  }
  return result;
}

/** 특정 방향의 직계 자식 — 루트는 자식의 handleSide로, 비루트는 자신의 handleSide로 판별 */
function getChildIdsBySide(
  node: Node,
  childrenMap: Map<string, string[]>,
  nodeById: Map<string, Node>,
  side: CollapseSide,
): string[] {
  const children = childrenMap.get(node.id) ?? [];
  if (isRootNode(node)) {
    return children.filter((childId) => sideOf(nodeById.get(childId)) === side);
  }
  return sideOf(node) === side ? children : [];
}

export function computeCollapseState(
  nodes: Node[],
  edges: Edge[],
  collapsedMap: Map<string, CollapsedSides>,
): CollapseComputation {
  const hiddenIds = new Set<string>();
  const hiddenCounts = new Map<string, { left?: number; right?: number }>();
  if (collapsedMap.size === 0) return { hiddenIds, hiddenCounts };

  const childrenMap = buildChildrenMap(edges);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  for (const [nodeId, sides] of collapsedMap) {
    const node = nodeById.get(nodeId);
    if (!node) continue; // 삭제된 노드의 stale 항목

    if (isRootNode(node)) {
      const counts: { left?: number; right?: number } = {};
      for (const side of ["left", "right"] as const) {
        if (!sides[side]) continue;
        const childIds = getChildIdsBySide(node, childrenMap, nodeById, side);
        const subtree = collectSubtree(childIds, childrenMap);
        subtree.forEach((id) => hiddenIds.add(id));
        counts[side] = subtree.size;
      }
      hiddenCounts.set(nodeId, counts);
    } else if (sides.left || sides.right) {
      const childIds = childrenMap.get(nodeId) ?? [];
      const subtree = collectSubtree(childIds, childrenMap);
      subtree.forEach((id) => hiddenIds.add(id));
      // 비루트 뱃지는 현재 handleSide 방향에 기록 (computed key는 타입 추론이
      // 모호해 조건식으로 명시)
      hiddenCounts.set(
        nodeId,
        sideOf(node) === "left"
          ? { left: subtree.size }
          : { right: subtree.size },
      );
    }
  }

  return { hiddenIds, hiddenCounts };
}

export function buildCollapseButtons(
  node: Node,
  childrenMap: Map<string, string[]>,
  nodeById: Map<string, Node>,
  collapsedMap: Map<string, CollapsedSides>,
  collapseState: CollapseComputation,
): CollapseButtonView[] {
  const sides = collapsedMap.get(node.id) ?? {};
  const counts = collapseState.hiddenCounts.get(node.id) ?? {};

  if (isRootNode(node)) {
    return (["left", "right"] as const)
      .filter(
        (side) =>
          getChildIdsBySide(node, childrenMap, nodeById, side).length > 0,
      )
      .map((side) => ({
        side,
        collapsed: Boolean(sides[side]),
        hiddenCount: counts[side] ?? 0,
      }));
  }

  if ((childrenMap.get(node.id) ?? []).length === 0) return [];
  const side = sideOf(node);
  return [
    {
      side,
      collapsed: Boolean(sides.left || sides.right),
      hiddenCount: counts[side] ?? 0,
    },
  ];
}

export function getParentId(nodeId: string, edges: Edge[]): string | null {
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
export function getRootNodeForSubtree(
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
export function subtreeInternalEdgeFilter(
  rootId: string,
  subtreeIds: Set<string>,
): (edge: Edge) => boolean {
  return (edge) =>
    (edge.source === rootId || subtreeIds.has(edge.source)) &&
    subtreeIds.has(edge.target);
}
