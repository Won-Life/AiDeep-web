import { useMemo } from "react";
import type { Edge } from "@xyflow/react";
import { getDescendantIds } from "@/features/graph/logic/traversal";
import type { MeetingBotStatus } from "./MeetingBotStatusBadge";
import { isMeetingActive, pickBadgeMeeting, toBotStatus, type MeetingInfo, type MeetingMap } from "./meetingState";

export type MeetingView = {
  /** 진행 중인 회의가 붙은 타이틀과 그 아래 모든 노드 — 읽기 전용 */
  lockedNodeIds: Set<string>;
  /** 진행 중인 회의가 직접 붙은 노드(타이틀) → 그 회의. 노드의 녹음 칩에 쓴다 */
  activeByNodeId: Record<string, MeetingInfo>;
  /** 상단 배지에 보일 가장 최근 회의 */
  badgeMeeting: MeetingInfo | null;
  /** 모달이 열린 노드의 회의 상태와 서버 실패 사유 */
  targetStatus: MeetingBotStatus | null;
  failureReason: string | undefined;
};

/*
 * CONTEXT
 * - Problem      : 회의 중에는 타이틀 아래 기존 콘텐츠 노드도 읽기 전용이어야 한다(Figma M3).
 * - Why          : 진행 중인 회의의 노드와 그 모든 하위 노드를 잠금 집합에 넣는다.
 * - Alternatives : 회의 노드만 잠금 → 하위 콘텐츠를 회의 중에 고칠 수 있어 AI가 쓰는 맥락과 어긋난다.
 * - Trade-offs   : 그래프가 크면 회의가 있을 때만 하위 탐색을 한다(회의가 없으면 빈 집합).
 * - Edge Case    : 순환 엣지는 getDescendantIds가 방문 체크로 끊는다.
 */
export function useMeetingView(meetings: MeetingMap, targetNodeId: string | null, edges: Edge[]): MeetingView {
  return useMemo(() => {
    const activeByNodeId: Record<string, MeetingInfo> = {};
    const lockedNodeIds = new Set<string>();
    for (const info of Object.values(meetings)) {
      if (!isMeetingActive(info.status)) continue;
      activeByNodeId[info.nodeId] = info;
      lockedNodeIds.add(info.nodeId);
      for (const id of getDescendantIds(info.nodeId, edges)) lockedNodeIds.add(id);
    }
    const target = targetNodeId ? meetings[targetNodeId] : undefined;
    return {
      lockedNodeIds,
      activeByNodeId,
      badgeMeeting: pickBadgeMeeting(meetings),
      targetStatus: target ? toBotStatus(target.status) : null,
      failureReason: target?.statusSubCode ?? undefined,
    };
  }, [meetings, targetNodeId, edges]);
}
