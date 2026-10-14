import type { Edge, Node } from "@xyflow/react";
import type { ActiveMeeting, WsMeetingBotEvent } from "@/api/types";
import { getDescendantIds } from "@/features/graph/logic/traversal";
import type { MeetingBotStatus } from "./MeetingBotStatusBadge";

export type MeetingInfo = {
  meetingId: string;
  nodeId: string;
  /** 서버 MeetingStatus 문자열 */
  status: string;
  statusSubCode: string | null;
  /** 이 상태가 발생한 시각(ISO). 늦게 도착한 오래된 이벤트를 거르는 기준 */
  occurredAt: string;
  /** 녹음이 시작된 시각(ISO). 종료 이벤트가 occurredAt을 덮어도 총 녹음 시간을 계산하려고 따로 남긴다 */
  recordingStartedAt: string | null;
};

/** 회의 노드(nodeId) → 그 노드의 가장 최근 회의 */
export type MeetingMap = Record<string, MeetingInfo>;

// 서버 MeetingStatus.isTerminal()과 같은 기준: CALL_ENDED · DONE · FAILED 는 진행 중이 아니다.
const TERMINAL = new Set(["CALL_ENDED", "DONE", "FAILED"]);

export function isMeetingActive(status: string): boolean {
  return !TERMINAL.has(status);
}

/*
 * CONTEXT
 * - Problem      : 서버 회의 상태는 8가지인데 화면 배지는 5가지(waiting · joining · recording · completed · error)다.
 * - Why          : 대기실은 waiting, 입장 중인 단계는 joining, 녹음은 recording, 종료는 completed, 실패는 error로 묶는다.
 * - Alternatives : 서버 상태를 그대로 노출 → 사용자에게 의미 없는 단계(IN_CALL_NOT_RECORDING)가 보인다.
 * - Trade-offs   : 알 수 없는 상태(서버가 새 값을 추가)는 joining으로 본다. 틀려도 "진행 중"으로 안전하다.
 * - Edge Case    : 실시간 이벤트는 REQUESTED · RECORDING · DONE · FAILED 만 오고, 대기실 등 중간 상태는 조회(GET)로만 온다.
 */
export function toBotStatus(status: string): MeetingBotStatus {
  switch (status) {
    case "WAITING_ROOM": return "waiting";
    case "RECORDING": return "recording";
    case "CALL_ENDED":
    case "DONE": return "completed";
    case "FAILED": return "error";
    default: return "joining";
  }
}

function isNotOlder(next: string, current: string): boolean {
  const a = Date.parse(next);
  const b = Date.parse(current);
  if (Number.isNaN(a) || Number.isNaN(b)) return true;
  return a >= b;
}

/*
 * CONTEXT
 * - Problem      : 이벤트가 늦게 오거나 Recall이 실패(fatal) 뒤에 종료(done)를 이어 보낼 수 있다.
 * - Why          : 같은 회의에서 더 오래된 이벤트는 무시하고, 실패한 회의는 뒤따르는 종료 이벤트로 덮지 않는다.
 * - Alternatives : 도착 순서대로 덮어쓰기 → 실패 표시가 곧바로 "종료"로 바뀐다(서버 가이드의 FE 정책 항목).
 * - Trade-offs   : 같은 노드에 새 회의(meetingId 다름)가 시작되면 기록을 새 회의로 교체한다.
 * - Edge Case    : occurredAt을 해석할 수 없으면 도착 순서를 따른다.
 */
export function applyMeetingEvent(map: MeetingMap, event: WsMeetingBotEvent): MeetingMap {
  const current = map[event.nodeId];
  if (current && current.meetingId === event.meetingId) {
    if (!isNotOlder(event.occurredAt, current.occurredAt)) return map;
    if (current.status === "FAILED" && event.type === "MEETING_BOT_LEFT") return map;
  }
  const sameMeeting = current?.meetingId === event.meetingId;
  return {
    ...map,
    [event.nodeId]: {
      meetingId: event.meetingId,
      nodeId: event.nodeId,
      status: event.status,
      statusSubCode: event.statusSubCode ?? null,
      occurredAt: event.occurredAt,
      recordingStartedAt: event.status === "RECORDING"
        ? event.occurredAt
        : (sameMeeting ? current.recordingStartedAt : null),
    },
  };
}

/*
 * 조회 결과는 "지금 진행 중인 회의"의 전체 스냅샷이다. 조회에 없는 노드의 진행 중 기록은
 * 이미 끝난 것이므로 제거하고, 끝난 상태(DONE · FAILED)는 최신 이벤트로 남겨 배지를 보여 준다.
 */
export function mergeActiveMeetings(map: MeetingMap, active: ActiveMeeting[]): MeetingMap {
  const next: MeetingMap = {};
  for (const [nodeId, info] of Object.entries(map)) {
    if (!isMeetingActive(info.status)) next[nodeId] = info;
  }
  for (const meeting of active) {
    next[meeting.nodeId] = {
      meetingId: meeting.meetingId,
      nodeId: meeting.nodeId,
      status: meeting.status,
      statusSubCode: meeting.statusSubCode,
      occurredAt: meeting.startedAt ?? meeting.createdAt,
      recordingStartedAt: meeting.startedAt,
    };
  }
  return next;
}

/** 진행 중인 회의가 붙어 있는 노드 id 집합 — 이 노드들은 이름 변경·삭제 등 수정이 잠긴다. */
export function getLockedNodeIds(map: MeetingMap): Set<string> {
  return new Set(Object.values(map).filter((info) => isMeetingActive(info.status)).map((info) => info.nodeId));
}

/** 화면 우하단 배지에 보일 회의: 진행 중인 것 중 가장 최근, 없으면 가장 최근 종료 */
export function pickBadgeMeeting(map: MeetingMap): MeetingInfo | null {
  const all = Object.values(map);
  if (all.length === 0) return null;
  const byRecent = (a: MeetingInfo, b: MeetingInfo) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt);
  const active = all.filter((info) => isMeetingActive(info.status)).sort(byRecent);
  return active[0] ?? [...all].sort(byRecent)[0];
}

/*
 * CONTEXT
 * - Problem      : 녹음 종료 배지(Figma M5)에 총 녹음 시간을 보여야 하는데 서버는 통화 종료 시각을 보내지 않는다.
 * - Why          : 녹음 시작(RECORDING) 시각과 종료 이벤트(DONE) 시각의 차이로 계산한다.
 * - Alternatives : 서버가 MEETING_BOT_LEFT에 실제 종료 시각(endedAt)을 실어 주면 정확하다 — 서버 변경이 필요해 보류.
 * - Trade-offs   : DONE은 전사 준비가 끝난 시점이라 실제 통화 종료보다 늦다. 그만큼 총 시간이 길게 보일 수 있다.
 * - Edge Case    : 녹음 시작을 보지 못한 회의(시작 전 실패·새로고침 뒤 종료)는 null을 돌려 표시하지 않는다.
 */
export function getTotalRecordingSeconds(info: MeetingInfo): number | null {
  if (!info.recordingStartedAt || toBotStatus(info.status) !== "completed") return null;
  const start = Date.parse(info.recordingStartedAt);
  const end = Date.parse(info.occurredAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.floor((end - start) / 1000);
}

/*
 * CONTEXT
 * - Problem      : "회의 노드 N개가 만들어졌어요"(Figma S1)는 2분 주기 재동기화에서만 떴다. 녹음 봇 회의의 AI 노드는
 *                  WS로 실시간 도착해 그 경로를 타지 않아 알림이 한 번도 뜨지 않았다.
 * - Why          : 회의가 끝날 때 회의 타이틀 아래 노드 중 녹음 시작 이후 생성된 것(createdAt)을 센다.
 *                  회의 중에는 그 아래가 사람에게 읽기 전용이라 새 노드는 사실상 AI가 만든 것이다.
 * - Alternatives : 서버의 "회의 노드 정리 완료" 이벤트에 생성 수를 싣기 — 정확하지만 아직 없다(요청 중). 생기면 교체한다.
 * - Trade-offs   : 종료(DONE) 뒤에도 AI가 노드를 만들고 있으면 그만큼 적게 센다. 수정된 기존 노드는 세지 않는다.
 * - Edge Case    : 녹음 시작 시각을 모르거나 createdAt이 없는 노드(내 REST 생성분)는 세지 않는다.
 */
export function countMeetingCreatedNodes(info: MeetingInfo, nodes: Node[], edges: Edge[]): number {
  const start = info.recordingStartedAt ? Date.parse(info.recordingStartedAt) : NaN;
  if (Number.isNaN(start)) return 0;
  const descendants = getDescendantIds(info.nodeId, edges);
  return nodes.filter((node) => {
    if (!descendants.has(node.id)) return false;
    const createdAt = Date.parse(String(node.data?.createdAt ?? ""));
    return !Number.isNaN(createdAt) && createdAt >= start;
  }).length;
}
