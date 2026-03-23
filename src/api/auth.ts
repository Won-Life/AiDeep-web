import client, { setTokens, clearTokens } from './client';
import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  EmailSendRequest,
  EmailSendResponse,
  EmailVerifyRequest,
  RefreshRequest,
  IssueMasterRequest,
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

export async function issueMasterToken(data: IssueMasterRequest): Promise<LoginResponse> {
  const { data: result } = await client.post<LoginResponse>('/auth/issue/master', data);
  return result;
}
