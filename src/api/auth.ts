import { api, setTokens } from './client';
import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  EmailSendRequest,
  EmailVerifyRequest,
} from './types';

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const result = await api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  setTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function signup(data: SignupRequest): Promise<string> {
  return api<string>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function sendEmailCode(data: EmailSendRequest): Promise<string> {
  return api<string>('/auth/email/send', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function verifyEmailCode(data: EmailVerifyRequest): Promise<string> {
  return api<string>('/auth/email/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
