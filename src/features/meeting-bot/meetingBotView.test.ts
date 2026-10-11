import { describe, expect, it } from "vitest";
import { getMeetingBotView } from "./MeetingBotStatusView";

describe("getMeetingBotView", () => {
  it("maps bot statuses to the modal screens", () => {
    expect(getMeetingBotView("waiting", false)).toBe("joining");
    expect(getMeetingBotView("joining", false)).toBe("joining");
    expect(getMeetingBotView("recording", false)).toBe("added");
    expect(getMeetingBotView("error", false)).toBe("failed");
  });

  it("shows the request form when there is no active bot", () => {
    expect(getMeetingBotView(null, false)).toBe("form");
    expect(getMeetingBotView(undefined, false)).toBe("form");
    expect(getMeetingBotView("completed", false)).toBe("form");
  });

  it("prefers the free plan limit screen over any status", () => {
    expect(getMeetingBotView("recording", true)).toBe("limit");
    expect(getMeetingBotView(null, true)).toBe("limit");
  });
});
