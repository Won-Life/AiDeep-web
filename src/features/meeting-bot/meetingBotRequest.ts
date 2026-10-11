/*
 * CONTEXT
 * - Problem      : 회의 봇 요청에 현재 워크스페이스 ID와 입력한 회의 URL을 함께 전달해야 한다.
 * - Why          : UI에서 전송 데이터를 한 번 조립해 추후 API 함수가 그대로 받을 수 있게 한다.
 * - Alternatives : 페이지에서 직접 객체를 만들면 입력 정규화와 요청 형태가 UI에 흩어진다.
 * - Trade-offs   : 플랫폼 값은 URL 호스트로만 추론하며 최종 서버 enum은 API 연결 시 확인한다.
 * - Edge Case    : 유사 도메인과 지원하지 않는 링크는 거부하고, URL 앞뒤 공백만 제거한다.
 */

export type MeetingBotPlatform = "ZOOM" | "GOOGLE_MEET";

export type MeetingBotRequest = {
  url: string;
  type: MeetingBotPlatform;
  workspaceId: string;
  nodeId: string;
};

export function getMeetingPlatformFromUrl(value: string): MeetingBotPlatform | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;

    const host = url.hostname.toLowerCase();
    if (host === "zoom.us" || host.endsWith(".zoom.us") || host === "zoom.com" || host.endsWith(".zoom.com")) {
      return "ZOOM";
    }
    if (host === "meet.google.com") return "GOOGLE_MEET";
    return null;
  } catch {
    return null;
  }
}

export function normalizeMeetingTarget(input: string, platform: MeetingBotPlatform): string | null {
  const value = input.trim();
  if (!value) return null;

  if (platform === "ZOOM" && /^[\d\s-]+$/.test(value)) {
    const meetingId = value.replace(/[\s-]/g, "");
    return /^\d{9,11}$/.test(meetingId) ? `https://zoom.us/j/${meetingId}` : null;
  }

  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  return getMeetingPlatformFromUrl(withScheme) === platform ? withScheme : null;
}

export function createMeetingBotRequest(
  input: string,
  workspaceId: string,
  nodeId: string,
  platform?: MeetingBotPlatform,
): MeetingBotRequest {
  const type = platform ?? getMeetingPlatformFromUrl(input);
  const url = type ? normalizeMeetingTarget(input, type) : null;
  if (!type || !url || !nodeId) throw new Error("Unsupported meeting request");
  return { url, type, workspaceId, nodeId };
}
