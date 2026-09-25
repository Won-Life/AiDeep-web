import { describe, expect, it } from "vitest";
import { createMeetingBotRequest, getMeetingPlatformFromUrl } from "./meetingBotRequest";

describe("createMeetingBotRequest", () => {
  it("pairs the entered meeting URL with the active workspace ID", () => {
    expect(createMeetingBotRequest("  https://zoom.us/j/123456789  ", "workspace-123")).toEqual({
      url: "https://zoom.us/j/123456789",
      type: "ZOOM",
      workspaceId: "workspace-123",
    });
  });

  it("recognizes supported meeting providers by hostname", () => {
    expect(getMeetingPlatformFromUrl("https://company.zoom.us/j/123456789")).toBe("ZOOM");
    expect(getMeetingPlatformFromUrl("https://zoom.com/j/123456789")).toBe("ZOOM");
    expect(getMeetingPlatformFromUrl("https://meet.google.com/abc-defg-hij")).toBe("GOOGLE_MEET");
  });

  it("rejects unsupported and lookalike hosts", () => {
    expect(getMeetingPlatformFromUrl("https://zoom.us.evil.example/j/123")).toBeNull();
    expect(getMeetingPlatformFromUrl("http://meet.google.com/abc-defg-hij")).toBeNull();
    expect(getMeetingPlatformFromUrl("https://example.com/meeting")).toBeNull();
    expect(() => createMeetingBotRequest("https://example.com/meeting", "workspace-123")).toThrow();
  });
});
