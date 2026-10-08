import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { getMeetingTargets } from "./meetingTargets";

const node = (id: string, title: string, y: number, isMain = false): Node => ({
  id,
  position: { x: 0, y },
  data: { title, isMain },
});
const edge = (source: string, target: string): Edge => ({ id: `${source}-${target}`, source, target });

describe("getMeetingTargets", () => {
  it("returns the direct children of each project ordered by position", () => {
    const nodes = [node("p2", "B 프로젝트", 200, true), node("p1", "A 프로젝트", 0, true), node("t1", "1주차", 50), node("t2", "2주차", 10)];
    const edges = [edge("p1", "t1"), edge("p1", "t2")];
    expect(getMeetingTargets(nodes, edges)).toEqual([
      { id: "t2", title: "2주차", projectTitle: "A 프로젝트" },
      { id: "t1", title: "1주차", projectTitle: "A 프로젝트" },
    ]);
  });

  it("excludes content nodes below a title and unattached nodes", () => {
    const nodes = [node("p", "프로젝트", 0, true), node("t", "타이틀", 10), node("c", "콘텐츠", 20), node("alone", "단독", 30)];
    const edges = [edge("p", "t"), edge("t", "c")];
    expect(getMeetingTargets(nodes, edges).map((target) => target.id)).toEqual(["t"]);
  });

  it("deduplicates repeated edges and ignores edges to missing nodes", () => {
    const nodes = [node("p", "프로젝트", 0, true), node("t", "타이틀", 10)];
    const edges = [edge("p", "t"), { ...edge("p", "t"), id: "again" }, edge("p", "gone")];
    expect(getMeetingTargets(nodes, edges)).toHaveLength(1);
  });

  it("falls back to a placeholder when a title is empty", () => {
    const nodes = [node("p", "  ", 0, true), node("t", "", 10)];
    expect(getMeetingTargets(nodes, [edge("p", "t")])).toEqual([{ id: "t", title: "제목 없음", projectTitle: "제목 없음" }]);
  });

  it("returns nothing when there is no project", () => {
    expect(getMeetingTargets([node("t", "타이틀", 0)], [])).toEqual([]);
  });
});
