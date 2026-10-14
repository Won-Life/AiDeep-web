import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { getMeetingGraphDecor } from "./meetingGraphDecor";
import type { MeetingInfo } from "./meetingState";

const node = (id: string, x: number, y: number, data: Record<string, unknown> = {}): Node => ({
  id, position: { x, y }, data: { depth: 1, ...data }, measured: { width: 100, height: 40 },
});
const edge = (source: string, target: string): Edge => ({ id: `${source}-${target}`, source, target, sourceHandle: "source-right" });
const meeting = (status: string): Record<string, MeetingInfo> => ({
  title: { meetingId: "m", nodeId: "title", status, statusSubCode: null, occurredAt: "2026-10-11T10:00:00Z", recordingStartedAt: null },
});

const nodes = [
  node("project", 0, 0, { depth: 0, isMain: true }),
  node("title", 300, 0),
  node("a", 500, -60, { depth: 2 }),
  node("b", 500, 60, { depth: 2 }),
];
const edges = [edge("project", "title"), edge("title", "a"), edge("title", "b")];

describe("getMeetingGraphDecor", () => {
  it("puts the hint on the top child and the placeholder below the lowest child while recording", () => {
    const decor = getMeetingGraphDecor(nodes, edges, meeting("RECORDING"));
    expect([...decor.hintNodeIds]).toEqual(["a"]);
    const placeholder = decor.placeholderByNodeId.get("title");
    expect(placeholder?.side).toBe("right");
    expect(placeholder!.offset.y).toBeGreaterThan(60);
    expect(placeholder!.offset.x).toBe(200); // 자식 열(x=500)에 맞춤
  });

  it("draws nothing when the meeting is not recording or the title is collapsed", () => {
    expect(getMeetingGraphDecor(nodes, edges, meeting("JOINING")).placeholderByNodeId.size).toBe(0);
    const collapsed = getMeetingGraphDecor(nodes, edges, meeting("RECORDING"), new Set(["a", "b"]));
    expect(collapsed.placeholderByNodeId.size).toBe(0);
    expect(collapsed.hintNodeIds.size).toBe(0);
  });
});
