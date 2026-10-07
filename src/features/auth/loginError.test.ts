import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api/types';
import { getLoginErrorMessage, isAccountLocked } from './loginError';

describe('isAccountLocked', () => {
  it('detects only the server lock code AUTH-032', () => {
    expect(isAccountLocked(new ApiError('AUTH-032', '잠겼습니다', ''))).toBe(true);
    expect(isAccountLocked(new ApiError('AUTH-018', '비밀번호가 일치하지 않습니다.', ''))).toBe(false);
    expect(isAccountLocked(new Error('network'))).toBe(false);
  });
});

describe('getLoginErrorMessage', () => {
  it('uses Figma copy for the observed password mismatch', () => {
    expect(
      getLoginErrorMessage(
        new ApiError('AUTH', '비밀번호가 일치하지 않습니다.', ''),
      ),
    ).toBe('이메일 또는 비밀번호가 올바르지 않습니다');
  });
  it('uses the same copy for combined credential mismatch', () => {
    expect(
      getLoginErrorMessage(
        new ApiError('AUTH', '이메일 또는 비밀번호가 일치하지 않습니다', ''),
      ),
    ).toBe('이메일 또는 비밀번호가 올바르지 않습니다');
  });
  it('preserves unrelated server errors', () => {
    expect(
      getLoginErrorMessage(
        new ApiError('LIMIT', '잠시 후 다시 시도해주세요.', ''),
      ),
    ).toBe('잠시 후 다시 시도해주세요.');
  });
  it('provides a retry message for network errors', () => {
    expect(getLoginErrorMessage(new Error('network'))).toBe(
      '로그인에 실패했습니다. 다시 시도해주세요.',
    );
  });
});
