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
