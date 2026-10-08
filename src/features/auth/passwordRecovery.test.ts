import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api/types';
import {
  getMailboxUrl,
  getResetConfirmMessage,
  getResetRequestFailure,
  isResetLinkInvalid,
} from './passwordRecovery';

describe('getMailboxUrl', () => {
  it('opens the webmail of well-known providers', () => {
    expect(getMailboxUrl('a@gmail.com')).toBe('https://mail.google.com');
    expect(getMailboxUrl('a@NAVER.com')).toBe('https://mail.naver.com');
    expect(getMailboxUrl('a@hanmail.net')).toBe('https://mail.daum.net');
  });

  it('falls back to mailto for other domains', () => {
    expect(getMailboxUrl(' a@company.io ')).toBe('mailto:a@company.io');
    expect(getMailboxUrl('invalid')).toBe('mailto:invalid');
  });
});

describe('password reset errors', () => {
  it('treats AUTH-010 as an unregistered email', () => {
    expect(getResetRequestFailure(new ApiError('AUTH-010', '사용자를 찾을 수 없습니다.', ''))).toEqual({ kind: 'not-found' });
  });

  it('keeps the server reason for other request failures', () => {
    expect(getResetRequestFailure(new ApiError('COMMON500', '서버 오류', ''))).toEqual({ kind: 'other', message: '서버 오류' });
    expect(getResetRequestFailure(new Error('network'))).toMatchObject({ kind: 'other' });
  });

  it('detects an expired or reused link only by AUTH-034', () => {
    expect(isResetLinkInvalid(new ApiError('AUTH-034', '만료', ''))).toBe(true);
    expect(isResetLinkInvalid(new ApiError('AUTH-010', 'x', ''))).toBe(false);
    expect(isResetLinkInvalid(new Error('x'))).toBe(false);
  });

  it('shows the server reason or a generic message when confirming', () => {
    expect(getResetConfirmMessage(new ApiError('VALID400', '입력값이 올바르지 않습니다.', ''))).toBe('입력값이 올바르지 않습니다.');
    expect(getResetConfirmMessage(new Error('x'))).toContain('다시 시도');
  });
});
