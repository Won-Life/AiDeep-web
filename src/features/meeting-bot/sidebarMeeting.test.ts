import { describe, expect, it } from "vitest";
import type { Node } from "@xyflow/react";
import type { MeetingMap } from "./meetingState";
import { pickSidebarMeeting } from "./sidebarMeeting";

const node = (id: string, title: string): Node => ({ id, position: { x: 0, y: 0 }, data: { title } });
const info = (nodeId: string, status: string, occurredAt: string, recordingStartedAt: string | null = null) => ({
  meetingId: `m-${nodeId}`,
  nodeId,
  status,
  statusSubCode: null,
  occurredAt,
  recordingStartedAt,
});

describe("pickSidebarMeeting", () => {
  it("returns null when nothing is in progress", () => {
    const meetings: MeetingMap = { a: info("a", "DONE", "2026-10-16T10:00:00Z") };
    expect(pickSidebarMeeting(meetings, [node("a", "1주차")])).toBeNull();
    expect(pickSidebarMeeting({}, [])).toBeNull();
  });

  it("shows the most recent in-progress meeting with its title and start time", () => {
    const meetings: MeetingMap = {
      a: info("a", "RECORDING", "2026-10-16T09:00:00Z"),
      b: info("b", "RECORDING", "2026-10-16T10:00:00Z", "2026-10-16T09:58:00Z"),
    };
    expect(pickSidebarMeeting(meetings, [node("a", "A"), node("b", "B")])).toEqual({
      titleNodeId: "b",
      titleName: "B",
      since: "2026-10-16T09:58:00Z",
    });
  });

  it("has no start time before the bot is in the meeting and falls back to a placeholder title", () => {
    const meetings: MeetingMap = { a: info("a", "REQUESTED", "2026-10-16T10:00:00Z") };
    expect(pickSidebarMeeting(meetings, [node("a", "  ")])).toEqual({
      titleNodeId: "a",
      titleName: "제목 없음",
      since: null,
    });
  });
});
