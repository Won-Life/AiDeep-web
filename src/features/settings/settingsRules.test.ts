import { describe, expect, it } from 'vitest';
import {
  getCenterCrop,
  getProfileFileError,
  isAccountDeletionConfirmed,
  isNicknameValid,
  isPasswordChangeValid,
} from './settingsRules';

describe('settings nickname', () => {
  it.each(['홍길동', 'OnNode12', 'aa', 'ABCDEFGHIJKL', ' 사용자 '])(
    'accepts %s',
    (value) => expect(isNicknameValid(value)).toBe(true),
  );
  it.each(['', 'a', 'ABCDEFGHIJKLM', '사용 자', 'user_name', 'name!', '😀😀'])(
    'rejects %s',
    (value) => expect(isNicknameValid(value)).toBe(false),
  );
});
describe('profile upload metadata', () => {
  it.each(['image/jpeg', 'image/png'])('accepts %s up to 5MB', (type) =>
    expect(getProfileFileError({ type, size: 5 * 1024 * 1024 })).toBe(''),
  );
  it('rejects excess size', () =>
    expect(
      getProfileFileError({ type: 'image/png', size: 5 * 1024 * 1024 + 1 }),
    ).not.toBe(''));
  it('rejects empty files', () =>
    expect(getProfileFileError({ type: 'image/png', size: 0 })).not.toBe(''));
  it.each(['image/svg+xml', 'image/gif', 'text/plain', ''])(
    'rejects %s',
    (type) => expect(getProfileFileError({ type, size: 100 })).not.toBe(''),
  );
});
describe('password change', () => {
  const values = { currentPassword: 'OldTest1!', newPassword: 'NewTest2!' };
  it('accepts a new matching password', () =>
    expect(isPasswordChangeValid(values, values.newPassword)).toBe(true));
  it('requires current password', () =>
    expect(
      isPasswordChangeValid(
        { ...values, currentPassword: '' },
        values.newPassword,
      ),
    ).toBe(false));
  it('requires matching confirmation', () =>
    expect(isPasswordChangeValid(values, 'Other123!')).toBe(false));
  it('rejects reuse', () =>
    expect(
      isPasswordChangeValid(
        {
          currentPassword: values.newPassword,
          newPassword: values.newPassword,
        },
        values.newPassword,
      ),
    ).toBe(false));
  it.each(['Short1!', 'password1', 'PASSWORD!', '1234567!'])(
    'rejects invalid %s',
    (newPassword) =>
      expect(
        isPasswordChangeValid({ ...values, newPassword }, newPassword),
      ).toBe(false),
  );
});
describe('account deletion confirmation', () => {
  it('requires exact confirmation', () =>
    expect(isAccountDeletionConfirmed('계정 삭제')).toBe(true));
  it.each(['', '계정삭제', ' 계정 삭제', '계정 삭제 '])('rejects %s', (value) =>
    expect(isAccountDeletionConfirmed(value)).toBe(false),
  );
});
describe('center crop matches cover preview', () => {
  it('centers landscape', () =>
    expect(getCenterCrop(1200, 800, 1)).toEqual({ x: 200, y: 0, side: 800 }));
  it('centers portrait', () =>
    expect(getCenterCrop(800, 1200, 1)).toEqual({ x: 0, y: 200, side: 800 }));
  it('applies zoom', () =>
    expect(getCenterCrop(1200, 800, 2)).toEqual({ x: 400, y: 200, side: 400 }));
  it('clamps below range', () =>
    expect(getCenterCrop(100, 100, 0)).toEqual({ x: 0, y: 0, side: 100 }));
  it('clamps above range', () =>
    expect(getCenterCrop(900, 900, 100)).toEqual({
      x: 300,
      y: 300,
      side: 300,
    }));
});
