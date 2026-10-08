import type { Edge, Node } from "@xyflow/react";

export type MeetingTarget = { id: string; title: string; projectTitle: string };

type NodeData = { title?: string; isMain?: boolean };

function titleOf(node: Node): string {
  return ((node.data as NodeData)?.title ?? "").trim() || "제목 없음";
}

function byPosition(a: Node, b: Node): number {
  return a.position.y - b.position.y;
}

export function getDefaultMeetingTarget(nodes: Node[], edges: Edge[]): MeetingTarget | null {
  return getMeetingTargets(nodes, edges)[0] ?? null;
}

/*
 * CONTEXT
 * - Problem      : 서버는 봇이 붙을 회의 노드(nodeId)를 필수로 받는다.
 * - Why          : 사이드바와 같은 기준(프로젝트의 직계 자식 = 타이틀)으로 후보를 고른다.
 * - Alternatives : 모든 노드를 후보로 → 콘텐츠 노드 아래에 회의가 붙을 수 있다.
 * - Trade-offs   : 프로젝트에 연결되지 않은 단독 노드는 후보에서 빠진다.
 * - Edge Case    : 중복 엣지, 삭제된 대상, 제목이 비어 있는 노드, 프로젝트 위치(y) 순서.
 */
export function getMeetingTargets(nodes: Node[], edges: Edge[]): MeetingTarget[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const targets: MeetingTarget[] = [];
  for (const project of nodes.filter((node) => (node.data as NodeData)?.isMain).sort(byPosition)) {
    const titles = edges
      .filter((edge) => edge.source === project.id)
      .map((edge) => byId.get(edge.target))
      .filter((node): node is Node => node !== undefined)
      .sort(byPosition);
    for (const node of titles) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      targets.push({ id: node.id, title: titleOf(node), projectTitle: titleOf(project) });
    }
  }
  return targets;
}
