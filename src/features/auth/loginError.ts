import { ApiError } from '../../api/types';

/*
 * CONTEXT
 * - Problem      : 서버의 비밀번호 단독 오류 문구가 로그인 디자인과 다르다.
 * - Why          : 확인된 자격 증명 오류만 Figma 문구로 통일한다.
 * - Alternatives : 모든 오류 통일 → 서버 장애나 잠금 오류의 의미가 사라진다.
 * - Trade-offs   : 새 서버 오류 정책은 별도 연동이 필요하다.
 * - Edge Case    : 네트워크 오류는 일반 재시도 안내를 유지한다.
 */
export function getLoginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError))
    return '로그인에 실패했습니다. 다시 시도해주세요.';
  const reason = error.reason.trim().replace(/[.!]$/, '');
  if (
    reason === '비밀번호가 일치하지 않습니다' ||
    reason === '이메일 또는 비밀번호가 일치하지 않습니다'
  ) {
    return '이메일 또는 비밀번호가 올바르지 않습니다';
  }
  return error.reason;
}
