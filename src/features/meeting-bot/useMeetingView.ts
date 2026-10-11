import { useMemo } from "react";
import type { MeetingBotStatus } from "./MeetingBotStatusBadge";
import { getLockedNodeIds, pickBadgeMeeting, toBotStatus, type MeetingMap } from "./meetingState";

export type MeetingView = {
  /** 진행 중인 회의가 붙어 수정이 잠긴 노드 */
  lockedNodeIds: Set<string>;
  /** 우하단 배지에 보일 가장 최근 회의 상태 */
  badgeStatus: MeetingBotStatus | null;
  /** 모달이 열린 노드의 회의 상태와 서버 실패 사유 */
  targetStatus: MeetingBotStatus | null;
  failureReason: string | undefined;
};

export function useMeetingView(meetings: MeetingMap, targetNodeId: string | null): MeetingView {
  return useMemo(() => {
    const badge = pickBadgeMeeting(meetings);
    const target = targetNodeId ? meetings[targetNodeId] : undefined;
    return {
      lockedNodeIds: getLockedNodeIds(meetings),
      badgeStatus: badge ? toBotStatus(badge.status) : null,
      targetStatus: target ? toBotStatus(target.status) : null,
      failureReason: target?.statusSubCode ?? undefined,
    };
  }, [meetings, targetNodeId]);
}
