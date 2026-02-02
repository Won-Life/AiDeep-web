import type { Force, SimulationNodeDatum } from "d3-force";

export type RectNode = SimulationNodeDatum & {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fx?: number | null;
  fy?: number | null;
};

export function rectCollide<NodeType extends RectNode>(
  padding = 0,
): Force<NodeType, undefined> {
  let nodes: NodeType[] = [];

  function force(alpha: number) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];

        const ax1 = a.x - a.width / 2 - padding;
        const ay1 = a.y - a.height / 2 - padding;
        const ax2 = a.x + a.width / 2 + padding;
        const ay2 = a.y + a.height / 2 + padding;

        const bx1 = b.x - b.width / 2 - padding;
        const by1 = b.y - b.height / 2 - padding;
        const bx2 = b.x + b.width / 2 + padding;
        const by2 = b.y + b.height / 2 + padding;

        // AABB overlap check
        if (ax2 > bx1 && ax1 < bx2 && ay2 > by1 && ay1 < by2) {
          const overlapX = Math.min(ax2 - bx1, bx2 - ax1);
          const overlapY = Math.min(ay2 - by1, by2 - ay1);

          // 최소 이동 거리 방향(MTV)
          // 아주 살짝만 밀어내기 위해 0.5 대신 0.2 사용
          if (overlapX < overlapY) {
            const shift = overlapX * 0.2 * alpha;
            // fx가 설정된 노드(드래그 중인 노드)는 움직이지 않음
            if (a.x < b.x) {
              if (a.fx === null || a.fx === undefined) a.x -= shift;
              if (b.fx === null || b.fx === undefined) b.x += shift;
            } else {
              if (a.fx === null || a.fx === undefined) a.x += shift;
              if (b.fx === null || b.fx === undefined) b.x -= shift;
            }
          } else {
            const shift = overlapY * 0.2 * alpha;
            // fy가 설정된 노드(드래그 중인 노드)는 움직이지 않음
            if (a.y < b.y) {
              if (a.fy === null || a.fy === undefined) a.y -= shift;
              if (b.fy === null || b.fy === undefined) b.y += shift;
            } else {
              if (a.fy === null || a.fy === undefined) a.y += shift;
              if (b.fy === null || b.fy === undefined) b.y -= shift;
            }
          }
        }
      }
    }
  }

  force.initialize = function (newNodes: NodeType[]) {
    nodes = newNodes;
  };

  return force as Force<NodeType, undefined>;
}
