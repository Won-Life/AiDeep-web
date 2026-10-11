import { describe, expect, it } from 'vitest';
import { getPasswordChangeErrorCode } from './passwordChangeErrors';

describe('password change error normalization', () => {
  it('normalizes Spring validation codes', () => {
    expect(getPasswordChangeErrorCode('AUTH-025')).toBe('CURRENT_PASSWORD_REQUIRED');
    expect(getPasswordChangeErrorCode('AUTH-026')).toBe('CURRENT_PASSWORD_MISMATCH');
  });
  it.each(['CURRENT_PASSWORD_MISMATCH', 'AUTH-001', 'UNKNOWN'])('preserves %s', (code) => {
    expect(getPasswordChangeErrorCode(code)).toBe(code);
  });
});
