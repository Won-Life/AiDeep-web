export type LandingEntryInput = {
  /** 브라우저에 로그인 토큰(리프레시)이 있는가. 서버 렌더에서는 항상 false. */
  hasToken: boolean;
  /** 토큰이 있었지만 사용자 조회가 거절되었는가. */
  rejected: boolean;
};

/**
 * 스플래시를 덮어 확인 중임을 보여줄지 정한다.
 * 토큰이 없으면 바로 랜딩, 토큰이 있으면 조회가 끝날 때까지 스플래시, 거절되면 랜딩.
 */
export function isCheckingSession({ hasToken, rejected }: LandingEntryInput): boolean {
  return hasToken && !rejected;
}
