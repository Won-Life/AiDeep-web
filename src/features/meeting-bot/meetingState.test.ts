import { describe, expect, it } from "vitest";
import type { ActiveMeeting, WsMeetingBotEvent } from "@/api/types";
import {
  applyMeetingEvent,
  countMeetingCreatedNodes,
  getLockedNodeIds,
  getTotalRecordingSeconds,
  isMeetingActive,
  mergeActiveMeetings,
  pickBadgeMeeting,
  toBotStatus,
} from "./meetingState";

const event = (over: Partial<WsMeetingBotEvent>): WsMeetingBotEvent => ({
  type: "MEETING_BOT_REQUESTED",
  workspaceId: "w",
  userId: "u",
  meetingId: "m1",
  nodeId: "n1",
  botId: "b",
  status: "REQUESTED",
  occurredAt: "2026-10-11T10:00:00Z",
  ...over,
});

describe("toBotStatus", () => {
  it("maps server statuses onto the badge states", () => {
    expect(toBotStatus("REQUESTED")).toBe("joining");
    expect(toBotStatus("JOINING")).toBe("joining");
    expect(toBotStatus("IN_CALL_NOT_RECORDING")).toBe("joining");
    expect(toBotStatus("WAITING_ROOM")).toBe("waiting");
    expect(toBotStatus("RECORDING")).toBe("recording");
    expect(toBotStatus("DONE")).toBe("completed");
    expect(toBotStatus("FAILED")).toBe("error");
    expect(toBotStatus("SOMETHING_NEW")).toBe("joining");
  });
});

describe("isMeetingActive", () => {
  it("treats CALL_ENDED, DONE and FAILED as finished like the server", () => {
    expect(["REQUESTED", "JOINING", "WAITING_ROOM", "IN_CALL_NOT_RECORDING", "RECORDING"].every(isMeetingActive)).toBe(true);
    expect(["CALL_ENDED", "DONE", "FAILED"].some(isMeetingActive)).toBe(false);
  });
});

describe("applyMeetingEvent", () => {
  it("records the latest status per node", () => {
    const one = applyMeetingEvent({}, event({}));
    const two = applyMeetingEvent(one, event({ type: "MEETING_BOT_JOINED", status: "RECORDING", occurredAt: "2026-10-11T10:01:00Z" }));
    expect(two.n1.status).toBe("RECORDING");
  });

  it("ignores a late event older than what is already known", () => {
    const joined = applyMeetingEvent({}, event({ type: "MEETING_BOT_JOINED", status: "RECORDING", occurredAt: "2026-10-11T10:05:00Z" }));
    expect(applyMeetingEvent(joined, event({ occurredAt: "2026-10-11T10:00:00Z" }))).toBe(joined);
  });

  it("keeps a failed meeting failed when a LEFT event follows", () => {
    const failed = applyMeetingEvent({}, event({ type: "MEETING_BOT_FAILED", status: "FAILED", statusSubCode: "bot_kicked", occurredAt: "2026-10-11T10:02:00Z" }));
    const after = applyMeetingEvent(failed, event({ type: "MEETING_BOT_LEFT", status: "DONE", occurredAt: "2026-10-11T10:03:00Z" }));
    expect(after).toBe(failed);
    expect(after.n1.statusSubCode).toBe("bot_kicked");
  });

  it("replaces the record when a new meeting starts on the same node", () => {
    const failed = applyMeetingEvent({}, event({ type: "MEETING_BOT_FAILED", status: "FAILED" }));
    const next = applyMeetingEvent(failed, event({ meetingId: "m2", occurredAt: "2026-10-11T11:00:00Z" }));
    expect(next.n1.meetingId).toBe("m2");
    expect(next.n1.status).toBe("REQUESTED");
  });
});

describe("mergeActiveMeetings", () => {
  const active = (over: Partial<ActiveMeeting>): ActiveMeeting => ({
    meetingId: "m2",
    nodeId: "n2",
    botId: null,
    status: "RECORDING",
    statusSubCode: null,
    startedAt: "2026-10-11T11:00:00Z",
    createdAt: "2026-10-11T10:59:00Z",
    ...over,
  });

  it("replaces stale active records with the server snapshot", () => {
    const map = applyMeetingEvent({}, event({ nodeId: "gone", status: "RECORDING" }));
    expect(Object.keys(mergeActiveMeetings(map, [active({})]))).toEqual(["n2"]);
  });

  it("keeps a finished meeting so its badge can still show", () => {
    const map = applyMeetingEvent({}, event({ type: "MEETING_BOT_LEFT", status: "DONE" }));
    expect(mergeActiveMeetings(map, [])).toHaveProperty("n1");
  });

  it("unlocks everything when the server reports no active meeting", () => {
    const map = applyMeetingEvent({}, event({ status: "RECORDING" }));
    expect(getLockedNodeIds(mergeActiveMeetings(map, [])).size).toBe(0);
  });
});

describe("getLockedNodeIds / pickBadgeMeeting", () => {
  it("locks only nodes whose meeting is still active", () => {
    let map = applyMeetingEvent({}, event({ nodeId: "a", status: "RECORDING" }));
    map = applyMeetingEvent(map, event({ nodeId: "b", meetingId: "m9", status: "DONE", type: "MEETING_BOT_LEFT" }));
    expect([...getLockedNodeIds(map)]).toEqual(["a"]);
  });

  it("prefers an active meeting for the badge", () => {
    let map = applyMeetingEvent({}, event({ nodeId: "done", meetingId: "m8", status: "DONE", occurredAt: "2026-10-11T12:00:00Z" }));
    map = applyMeetingEvent(map, event({ nodeId: "live", meetingId: "m7", status: "RECORDING", occurredAt: "2026-10-11T09:00:00Z" }));
    expect(pickBadgeMeeting(map)?.nodeId).toBe("live");
    expect(pickBadgeMeeting({})).toBeNull();
  });
});

describe("getTotalRecordingSeconds", () => {
  it("measures from recording start to the end event even after the end event overwrites occurredAt", () => {
    const joined = applyMeetingEvent({}, event({ type: "MEETING_BOT_JOINED", status: "RECORDING", occurredAt: "2026-10-11T10:00:00Z" }));
    const left = applyMeetingEvent(joined, event({ type: "MEETING_BOT_LEFT", status: "DONE", occurredAt: "2026-10-11T10:03:12Z" }));
    expect(getTotalRecordingSeconds(left.n1)).toBe(192);
  });

  it("returns null while recording or when the start was never seen", () => {
    const joined = applyMeetingEvent({}, event({ type: "MEETING_BOT_JOINED", status: "RECORDING" }));
    expect(getTotalRecordingSeconds(joined.n1)).toBeNull();
    const leftOnly = applyMeetingEvent({}, event({ type: "MEETING_BOT_LEFT", status: "DONE" }));
    expect(getTotalRecordingSeconds(leftOnly.n1)).toBeNull();
  });

  it("does not carry a recording start over to a new meeting on the same node", () => {
    const joined = applyMeetingEvent({}, event({ type: "MEETING_BOT_JOINED", status: "RECORDING", occurredAt: "2026-10-11T10:00:00Z" }));
    const next = applyMeetingEvent(joined, event({ meetingId: "m2", type: "MEETING_BOT_LEFT", status: "DONE", occurredAt: "2026-10-11T11:00:00Z" }));
    expect(getTotalRecordingSeconds(next.n1)).toBeNull();
  });
});

describe("countMeetingCreatedNodes", () => {
  const node = (id: string, createdAt?: string) => ({ id, position: { x: 0, y: 0 }, data: { createdAt } });
  const edge = (source: string, target: string) => ({ id: `${source}-${target}`, source, target });
  const info = {
    meetingId: "m1", nodeId: "title", status: "DONE", statusSubCode: null,
    occurredAt: "2026-10-11T10:05:00Z", recordingStartedAt: "2026-10-11T10:00:00Z",
  };
  const edges = [edge("title", "old"), edge("title", "new1"), edge("new1", "new2"), edge("other", "outside")];
  const nodes = [
    node("title", "2026-10-01T00:00:00Z"),
    node("old", "2026-10-11T09:59:59Z"),
    node("new1", "2026-10-11T10:01:00Z"),
    node("new2", "2026-10-11T10:04:00Z"),
    node("outside", "2026-10-11T10:02:00Z"),
    node("mine"),
  ];

  it("counts descendants of the meeting title created after recording started", () => {
    expect(countMeetingCreatedNodes(info, nodes, edges)).toBe(2);
  });

  it("returns 0 when the recording start is unknown", () => {
    expect(countMeetingCreatedNodes({ ...info, recordingStartedAt: null }, nodes, edges)).toBe(0);
  });
});
