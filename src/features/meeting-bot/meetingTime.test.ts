import { describe, expect, it } from "vitest";
import { formatElapsed, secondsSince } from "./meetingTime";

describe("formatElapsed", () => {
  it("formats minutes and seconds", () => {
    expect(formatElapsed(0)).toBe("00:00");
    expect(formatElapsed(192)).toBe("03:12");
  });

  it("adds hours past one hour and clamps negatives", () => {
    expect(formatElapsed(3725)).toBe("1:02:05");
    expect(formatElapsed(-5)).toBe("00:00");
  });
});

describe("secondsSince", () => {
  it("returns whole seconds since an ISO time", () => {
    const now = Date.parse("2026-10-11T10:03:12Z");
    expect(secondsSince("2026-10-11T10:00:00Z", now)).toBe(192);
  });

  it("returns 0 for an unreadable time or a time in the future", () => {
    const now = Date.parse("2026-10-11T10:00:00Z");
    expect(secondsSince("not-a-date", now)).toBe(0);
    expect(secondsSince("2026-10-11T11:00:00Z", now)).toBe(0);
  });
});
