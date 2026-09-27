import type { Node, Edge } from "@xyflow/react";
import { getRandomColorPair, DEFAULT_NODE_COLOR } from "../constants/colors";
import { getDescendantIds, getSameColorDescendantIds } from "./traversal";

// main(PROJECT) 노드는 생성 시점(onPaneContextMenu)에 이미 실제 그래프 색을 data.color에
// 저장하므로(화면은 isMain이라 항상 흰색으로 그려짐), 별도 분기 없이 본인 색을 그대로 쓴다.
export function getGraphColor(
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

export function colorOfNodeIn(nodes: Node[]) {
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
export function getSameGraphDescendantIds(
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
export function getRecolorTargetIds(
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
export function findCrossColorChildEdges(
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

export function updateSubtreeColors(
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
