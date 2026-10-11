import { describe, expect, it } from "vitest";
import type { ActiveMeeting, WsMeetingBotEvent } from "@/api/types";
import {
  applyMeetingEvent,
  getLockedNodeIds,
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
