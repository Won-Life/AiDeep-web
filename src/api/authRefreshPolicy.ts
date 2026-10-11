// Domain validation may use HTTP 401 without indicating an expired access token.
export function isRefreshExcludedForError(
  errorCode: string | undefined,
  excludedCodes: readonly string[] | undefined,
): boolean {
  return errorCode !== undefined && excludedCodes?.includes(errorCode) === true;
}

/*
 * CONTEXT
 * - Problem      : 일시적 통신 장애까지 refresh token 만료로 간주해 세션을 지웠다.
 * - Why          : 갱신 엔드포인트의 명시적 인증 거절만 세션 종료 근거로 사용한다.
 * - Alternatives : 모든 4xx 삭제 → rate limit·프록시 오류까지 로그아웃을 유발한다.
 * - Trade-offs   : 알 수 없는 오류는 토큰을 보존하고 다음 요청에서 다시 시도한다.
 * - Edge Case    : 네트워크 오류, timeout, 429, 5xx, HTTP 200 FAIL envelope.
 */
export function isRefreshTokenRejected(status: number | undefined, errorCode?: string): boolean {
  return status === 401 || (status === 200 && errorCode === 'AUTH-401');
}
