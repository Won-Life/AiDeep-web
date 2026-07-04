import type { Edge } from "@xyflow/react";

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
 * - Problem      : 두 그래프가 엣지로 연결되면 getDescendantIds가 색상(그래프) 경계를 넘어
 *                  다른 그래프의 노드까지 서브트리로 취급한다 (이동 시 남의 그래프가 딸려옴).
 * - Why          : 그래프 소속의 단일 식별자가 색상이므로, 순회 중 rootColor와 다른 색의
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
      // 색상이 다르면 다른 그래프 소속 → 이 경로 순회 중단
      if (colorOf(edge.target) !== rootColor) continue;
      descendants.add(edge.target);
      queue.push(edge.target);
    }
  }

  return descendants;
}
