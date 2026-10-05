export const EMAIL_CODE_TTL_SECONDS = 180;
export const VERIFIED_EMAIL_TTL_SECONDS = 600;

/*
 * CONTEXT
 * - Problem      : 화면 검증과 서버 인증 시간을 명시적으로 분리한다.
 * - Why          : 비밀번호는 디자인 조건, 인증 시간은 원격 서버 계약을 따른다.
 * - Alternatives : 서버 가입 DTO 완화 → 이름·전화번호 계약을 숨기게 된다.
 * - Trade-offs   : 최종 가입 요청은 서버 계약 정리 후 연결한다.
 * - Edge Case    : 공백, 6자리 코드, 선택 동의, 비밀번호 조합.
 */
export function isSignupPasswordValid(value: string): boolean {
  return (
    value.length >= 8 &&
    /[a-z]/i.test(value) &&
    /\d/.test(value) &&
    /[\p{P}\p{S}]/u.test(value)
  );
}

export function isSignupEmailValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isEmailCodeValid(value: string): boolean {
  return /^\d{6}$/.test(value);
}

export function formatVerificationTime(seconds: number): string {
  const value = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

export interface SignupFormValues {
  email: string;
  password: string;
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
}
