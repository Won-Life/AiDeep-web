import { ApiError } from '../../api/types';

export const RESET_LINK_TTL_MINUTES = 30;

const MAILBOXES: Record<string, string> = {
  'gmail.com': 'https://mail.google.com',
  'naver.com': 'https://mail.naver.com',
  'daum.net': 'https://mail.daum.net',
  'hanmail.net': 'https://mail.daum.net',
  'kakao.com': 'https://mail.kakao.com',
  'outlook.com': 'https://outlook.live.com/mail',
  'hotmail.com': 'https://outlook.live.com/mail',
};

export function getMailboxUrl(email: string): string {
  const domain = email.trim().split('@')[1]?.toLowerCase() ?? '';
  return MAILBOXES[domain] ?? `mailto:${email.trim()}`;
}

export type ResetRequestFailure = { kind: 'not-found' } | { kind: 'other'; message: string };

export function getResetRequestFailure(error: unknown): ResetRequestFailure {
  if (error instanceof ApiError && error.errorCode === 'AUTH-010') return { kind: 'not-found' };
  return {
    kind: 'other',
    message: error instanceof ApiError ? error.reason : '재설정 링크를 보내지 못했어요. 다시 시도해주세요.',
  };
}

export function isResetLinkInvalid(error: unknown): boolean {
  return error instanceof ApiError && error.errorCode === 'AUTH-034';
}

export function getResetConfirmMessage(error: unknown): string {
  return error instanceof ApiError ? error.reason : '비밀번호를 변경하지 못했어요. 다시 시도해주세요.';
}
