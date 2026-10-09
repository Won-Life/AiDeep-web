import { describe, expect, it, vi } from 'vitest';
import type { UserMeResponse } from '@/api/types';
import { isNicknameValid } from '../settings/settingsRules';
import { ensureNickname, generateDefaultNickname, hasNickname } from './defaultNickname';

const user = (username: string | null): UserMeResponse => ({
  userId: 'u1',
  username: username as string,
  email: 'a@b.com',
  createdAt: '2026-01-01T00:00:00Z',
});

describe('generateDefaultNickname', () => {
  it('uses the 사용자 prefix and four digits', () => {
    expect(generateDefaultNickname(() => 0)).toBe('사용자1000');
    expect(generateDefaultNickname(() => 0.9999)).toBe('사용자9999');
    expect(generateDefaultNickname(() => 0.5)).toMatch(/^사용자\d{4}$/);
  });

  it('always satisfies the app nickname rule', () => {
    for (const value of [0, 0.25, 0.5, 0.75, 0.9999]) {
      expect(isNicknameValid(generateDefaultNickname(() => value))).toBe(true);
    }
  });
});

describe('hasNickname', () => {
  it('treats null, empty, and whitespace as missing', () => {
    expect(hasNickname(user(null))).toBe(false);
    expect(hasNickname(user(''))).toBe(false);
    expect(hasNickname(user('   '))).toBe(false);
    expect(hasNickname(user('민수'))).toBe(true);
  });
});

describe('ensureNickname', () => {
  it('keeps an existing nickname without calling the server', async () => {
    const save = vi.fn();
    const current = user('민수');
    expect(await ensureNickname(current, save)).toBe(current);
    expect(save).not.toHaveBeenCalled();
  });

  it('saves a generated nickname once and returns the updated user', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const result = await ensureNickname(user(null), save, () => 0.5);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('사용자5500');
    expect(result).toMatchObject({ userId: 'u1', username: '사용자5500' });
  });

  it('keeps the user as is when saving fails so loading never breaks', async () => {
    const save = vi.fn().mockRejectedValue(new Error('network'));
    const current = user('');
    expect(await ensureNickname(current, save)).toBe(current);
  });
});
