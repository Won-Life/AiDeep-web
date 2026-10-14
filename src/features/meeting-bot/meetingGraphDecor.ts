import type { Edge, Node } from "@xyflow/react";
import {
  adjustPositionRelativeToSource,
  getForcedOutboundSideForSubNode,
} from "@/features/graph/logic/placement";
import { toBotStatus, type MeetingInfo } from "./meetingState";

export type MeetingPlaceholder = {
  /** 회의 타이틀 노드 좌상단 기준 좌표 — 타이틀 노드 안에서 absolute로 그린다 */
  offset: { x: number; y: number };
  width: number;
  height: number;
  side: "left" | "right";
};

export type MeetingGraphDecor = {
  /** 회의 타이틀 노드 id → 그 아래 "노드 생성 중…" 자리 */
  placeholderByNodeId: Map<string, MeetingPlaceholder>;
  /** "클릭하면 내용을 볼 수 있어요" 말풍선을 띄울 하위 노드 id(회의마다 가장 위 자식 하나) */
  hintNodeIds: Set<string>;
};

const FALLBACK_WIDTH = 120;
const FALLBACK_HEIGHT = 36;

/*
 * CONTEXT
 * - Problem      : 녹음 중 화면(Figma M3)은 회의 타이틀 아래에 "노드 생성 중…" 자리와 읽기 전용 말풍선을 보여 준다.
 * - Why          : 실제 노드를 만들지 않고, 새 자식이 들어갈 자리를 기존 배치 규칙(adjustPositionRelativeToSource)으로
 *                  계산해 타이틀 노드가 그 자리에 장식만 그리게 한다. 서버·React Flow 상태에는 아무것도 추가하지 않는다.
 * - Alternatives : 가짜 React Flow 노드 추가 → 선택·삭제·저장·충돌 시뮬레이션 경로가 모두 가짜 id를 걸러야 한다.
 * - Trade-offs   : 자리 표시는 배치 추정이라, AI가 만든 실제 노드가 다른 위치에 생길 수 있다.
 * - Edge Case    : 녹음 중(RECORDING)인 회의에만 그린다. 자식이 없으면 말풍선은 생략하고 자리 표시만 그린다.
 *                  타이틀이 숨겨졌거나 접혀 있으면 둘 다 그리지 않는다.
 */
export function getMeetingGraphDecor(
  nodes: Node[],
  edges: Edge[],
  meetingByNodeId: Record<string, MeetingInfo> | undefined,
  hiddenIds: ReadonlySet<string> = new Set(),
): MeetingGraphDecor {
  const placeholderByNodeId = new Map<string, MeetingPlaceholder>();
  const hintNodeIds = new Set<string>();
  if (!meetingByNodeId) return { placeholderByNodeId, hintNodeIds };

  for (const meeting of Object.values(meetingByNodeId)) {
    if (toBotStatus(meeting.status) !== "recording") continue;
    const title = nodes.find((node) => node.id === meeting.nodeId);
    if (!title || hiddenIds.has(title.id)) continue;

    const children = edges
      .filter((edge) => edge.source === title.id)
      .map((edge) => nodes.find((node) => node.id === edge.target))
      .filter((node): node is Node => !!node);
    // 타이틀이 접혀 하위가 숨겨졌으면 장식도 그리지 않는다
    if (children.some((node) => hiddenIds.has(node.id))) continue;
    const topChild = children.reduce<Node | undefined>(
      (top, node) => (!top || node.position.y < top.position.y ? node : top),
      undefined,
    );
    if (topChild) hintNodeIds.add(topChild.id);

    const side = getForcedOutboundSideForSubNode(title, nodes, edges) ?? "right";
    const lowestY = Math.max(title.position.y, ...children.map((node) => node.position.y));
    const width = topChild?.measured?.width ?? FALLBACK_WIDTH;
    const height = topChild?.measured?.height ?? FALLBACK_HEIGHT;
    const position = adjustPositionRelativeToSource(
      title,
      children.length ? lowestY + 1 : title.position.y,
      side,
      nodes,
      edges,
      undefined,
      { width } as Node,
    );
    placeholderByNodeId.set(title.id, {
      // 사용자가 자식들을 옮겼을 수 있으니 x는 기존 자식 열에 맞춘다
      offset: { x: (topChild?.position.x ?? position.x) - title.position.x, y: position.y - title.position.y },
      width,
      height,
      side,
    });
  }
  return { placeholderByNodeId, hintNodeIds };
}
