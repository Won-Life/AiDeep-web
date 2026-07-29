// 백엔드가 콜백 실패 시 실어 보내는 reason 코드 (Aideep_backend#78)
const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: '로그인 요청이 만료되었습니다. 다시 시도해주세요.',
  user_not_found: '사용자를 찾을 수 없습니다. 다시 로그인해주세요.',
  google_account_already_linked: '이미 다른 계정에 연동된 구글 계정입니다.',
  provider_already_linked: '이미 연동된 계정입니다.',
  email_conflict:
    '이미 가입된 이메일입니다. 이메일과 비밀번호로 로그인한 뒤 계정을 연동해주세요.',
  oauth_failed: '구글 로그인에 실패했습니다. 다시 시도해주세요.',
};

export type CallbackPhase =
  | { status: 'login'; accessToken: string; refreshToken: string }
  | { status: 'linked' }
  | { status: 'signup'; ticket: string }
  | { status: 'error'; message: string };

/**
 * 구글 OAuth 콜백 쿼리 파라미터를 화면 분기로 변환한다.
 * kind는 login / signup_required / linked / error 네 가지 (Aideep_backend#78).
 * 필수 파라미터가 빠진 경우도 에러로 취급한다 — 토큰 없는 login은 로그인이 아니다.
 */
export function resolveCallbackPhase(params: URLSearchParams): CallbackPhase {
  const kind = params.get('kind');

  if (kind === 'login') {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    if (accessToken && refreshToken) {
      return { status: 'login', accessToken, refreshToken };
    }
  }

  if (kind === 'signup_required') {
    const ticket = params.get('ticket');
    if (ticket) return { status: 'signup', ticket };
  }

  if (kind === 'linked') return { status: 'linked' };

  const reason = params.get('reason') ?? '';
  return {
    status: 'error',
    message: ERROR_MESSAGES[reason] ?? ERROR_MESSAGES.oauth_failed,
  };
}
