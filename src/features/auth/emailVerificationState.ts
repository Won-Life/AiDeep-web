export interface EmailVerificationState {
  status: 'idle' | 'sent' | 'verified' | 'expired';
  code: string;
  deadline: number;
  seconds: number;
}

export const initialEmailVerification: EmailVerificationState = {
  status: 'idle',
  code: '',
  deadline: 0,
  seconds: 0,
};

/*
 * CONTEXT
 * - Problem      : 응답 지연과 재전송 실패가 기존 인증을 유효하게 보이게 한다.
 * - Why          : 요청 시작 시점 기준의 보수적인 만료 시각과 원자적인 상태를 사용한다.
 * - Alternatives : 응답 수신 후 TTL 재시작은 서버 만료보다 늦어진다.
 * - Trade-offs   : 서버 만료 시각이 없는 동안 화면은 서버보다 먼저 만료될 수 있다.
 * - Edge Case    : 재전송 실패, TTL보다 긴 요청, 검증 성공 응답 지연.
 */
export function expireEmailVerification(): EmailVerificationState {
  return { status: 'expired', code: '', deadline: 0, seconds: 0 };
}

export function remainingVerificationSeconds(
  deadline: number,
  now: number,
): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function completeEmailVerification(
  status: 'sent' | 'verified',
  startedAt: number,
  ttlSeconds: number,
  now: number,
): EmailVerificationState {
  const deadline = startedAt + ttlSeconds * 1000;
  const seconds = remainingVerificationSeconds(deadline, now);
  return seconds > 0
    ? { status, code: '', deadline, seconds }
    : expireEmailVerification();
}
