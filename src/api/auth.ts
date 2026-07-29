import axios from 'axios';
import client, { setTokens, clearTokens } from './client';
import { ApiError } from './types';
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  SignupRequest,
  EmailSendRequest,
  EmailSendResponse,
  EmailVerifyRequest,
  RefreshRequest,
  IssueMasterRequest,
  OAuthSignupCompleteRequest,
} from './types';

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const { data: result } = await client.post<LoginResponse>('/auth/login', data);
  setTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function signup(data: SignupRequest): Promise<string> {
  const { data: result } = await client.post<string>('/auth/signup', data);
  return result;
}

export async function sendEmailCode(data: EmailSendRequest): Promise<EmailSendResponse> {
  const { data: result } = await client.post<EmailSendResponse>('/auth/email/send', data);
  return result;
}

export async function verifyEmailCode(data: EmailVerifyRequest): Promise<string> {
  const { data: result } = await client.post<string>('/auth/email/verify', data);
  return result;
}

export async function refresh(data: RefreshRequest): Promise<LoginResponse> {
  const { data: result } = await client.post<LoginResponse>('/auth/refresh', data);
  setTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function logout(): Promise<string> {
  const { data: result } = await client.delete<string>('/auth/logout');
  clearTokens();
  return result;
}

/*
 * CONTEXT
 * - Problem      : OAuth 신규 가입 완료 요청의 401은 "access token 만료"가 아니라
 *                  "signup ticket 만료(5분)"다. 다른 함수처럼 client 인스턴스로 부르면
 *                  401 인터셉터가 refresh 큐를 태우고, 아직 계정도 없어 refresh가 실패하니
 *                  clearTokens() → /login 강제 이동으로 끝난다. 사용자는 만료 이유를 못 본다.
 * - Why          : raw axios로 인터셉터를 우회해 401을 이 함수가 그대로 ApiError로 올린다.
 *                  호출부가 "ticket이 만료됐다"는 서버 메시지를 화면에 띄울 수 있다.
 * - Alternatives : client 인스턴스 + 호출부에서 401 분기 → 인터셉터가 먼저 가로채 불가.
 *                  인터셉터에 URL 예외 목록 추가 → 공용 경로에 특수 케이스를 심게 됨.
 * - Trade-offs   : envelope 언래핑을 여기서 한 번 더 쓴다(client.ts refresh와 동일 패턴).
 *                  대신 공용 인터셉터는 손대지 않는다.
 * - Edge Case    : ticket 만료·중복 사용(401), 이미 가입된 이메일/OAuth 계정(409) 모두
 *                  ApiError로 올라가 호출부가 reason을 그대로 보여준다.
 */
export async function completeOAuthSignup(
  data: OAuthSignupCompleteRequest,
): Promise<LoginResponse> {
  // 4xx도 FAIL envelope을 담아 오므로 예외로 던지지 않고 아래에서 함께 판별한다
  const { data: body } = await axios.post<ApiResponse<LoginResponse>>(
    '/api/auth/oauth/signup/complete',
    data,
    {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: (status) => status < 500,
    },
  );

  // envelope이 아닌 4xx(예: 프록시의 rate limit)도 올 수 있어 SUCCESS만 통과시킨다
  if (body?.resultType !== 'SUCCESS') {
    const fail = body?.resultType === 'FAIL' ? body.error : null;
    throw new ApiError(
      fail?.errorCode ?? 'UNKNOWN',
      fail?.reason ?? '가입 처리에 실패했습니다. 다시 시도해주세요.',
      fail?.data ?? '',
    );
  }

  setTokens(body.success.accessToken, body.success.refreshToken);
  return body.success;
}

export async function issueMasterToken(data: IssueMasterRequest): Promise<LoginResponse> {
  const { data: result } = await client.post<LoginResponse>('/auth/issue/master', data);
  return result;
}
