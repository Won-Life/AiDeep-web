import { describe, expect, it } from "vitest";
import { createMeetingBotRequest, getMeetingPlatformFromUrl, normalizeMeetingTarget } from "./meetingBotRequest";

describe("normalizeMeetingTarget", () => {
  it("turns a Zoom meeting ID into a join link", () => {
    expect(normalizeMeetingTarget("123-4567-8901", "ZOOM")).toBe("https://zoom.us/j/12345678901");
    expect(normalizeMeetingTarget("123 456 789", "ZOOM")).toBe("https://zoom.us/j/123456789");
  });

  it("adds https:// to a link typed without a scheme", () => {
    expect(normalizeMeetingTarget("zoom.us/j/1234567890", "ZOOM")).toBe("https://zoom.us/j/1234567890");
    expect(normalizeMeetingTarget("meet.google.com/abc-defg-hij", "GOOGLE_MEET")).toBe("https://meet.google.com/abc-defg-hij");
  });

  it("rejects a link for the other platform, short IDs, and non-https links", () => {
    expect(normalizeMeetingTarget("https://meet.google.com/abc-defg-hij", "ZOOM")).toBeNull();
    expect(normalizeMeetingTarget("12345", "ZOOM")).toBeNull();
    expect(normalizeMeetingTarget("123456789", "GOOGLE_MEET")).toBeNull();
    expect(normalizeMeetingTarget("http://zoom.us/j/123456789", "ZOOM")).toBeNull();
    expect(normalizeMeetingTarget("   ", "ZOOM")).toBeNull();
  });

  it("uses the chosen platform when creating a request", () => {
    expect(createMeetingBotRequest("123-4567-8901", "w1", "n1", "ZOOM")).toEqual({
      url: "https://zoom.us/j/12345678901",
      type: "ZOOM",
      workspaceId: "w1",
      nodeId: "n1",
    });
    expect(() => createMeetingBotRequest("zoom.us/j/123456789", "w1", "n1", "GOOGLE_MEET")).toThrow();
  });

  it("requires the node the bot is attached to", () => {
    expect(() => createMeetingBotRequest("https://zoom.us/j/123456789", "w1", "")).toThrow();
  });
});

describe("createMeetingBotRequest", () => {
  it("pairs the entered meeting URL with the active workspace ID", () => {
    expect(createMeetingBotRequest("  https://zoom.us/j/123456789  ", "workspace-123", "node-1")).toEqual({
      url: "https://zoom.us/j/123456789",
      type: "ZOOM",
      workspaceId: "workspace-123",
      nodeId: "node-1",
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
    expect(() => createMeetingBotRequest("https://example.com/meeting", "workspace-123", "node-1")).toThrow();
  });
});
