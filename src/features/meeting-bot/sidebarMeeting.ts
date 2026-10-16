import type { Node } from "@xyflow/react";
import { isMeetingActive, toBotStatus, type MeetingMap } from "./meetingState";

export type SidebarMeeting = {
  titleNodeId: string;
  titleName: string;
  /** 녹음이 시작된 시각(ISO). 아직 입장 전이면 null */
  since: string | null;
};

/*
 * CONTEXT
 * - Problem      : 사이드바 "회의 진행 중" 카드(Figma X5 · X9)가 회의 상태를 받지 못해 항상 숨겨져 있었다.
 * - Why          : 진행 중인 회의 중 가장 최근 것을 골라 타이틀 이름과 녹음 시작 시각만 넘긴다.
 * - Alternatives : 모든 진행 중 회의를 나열 → 시안은 카드 한 장이다.
 * - Trade-offs   : 플랫폼(Zoom)은 서버가 주지 않아 보여 주지 않는다.
 * - Edge Case    : 회의가 없거나 모두 종료면 null, 노드 제목이 비어 있으면 "제목 없음".
 */
export function pickSidebarMeeting(meetings: MeetingMap, nodes: Node[]): SidebarMeeting | null {
  const active = Object.values(meetings)
    .filter((info) => isMeetingActive(info.status))
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  const latest = active[0];
  if (!latest) return null;
  const node = nodes.find((item) => item.id === latest.nodeId);
  const title = ((node?.data as { title?: string } | undefined)?.title ?? "").trim();
  return {
    titleNodeId: latest.nodeId,
    titleName: title || "제목 없음",
    since: toBotStatus(latest.status) === "recording" ? (latest.recordingStartedAt ?? latest.occurredAt) : null,
  };
}
