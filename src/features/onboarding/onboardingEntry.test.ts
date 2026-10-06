import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearOnboardingPending, getAuthDestination, markOnboardingPending, readOnboardingCompletion, resolveAuthDestination } from './onboardingEntry';

const user = { userId: 'user-a', username: '테스트', email: 'test@example.com', createdAt: '' };

describe('인증 후 온보딩 이동', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    [true, true, '/workspace'], [true, false, '/workspace'],
    [false, false, '/onboarding'], [false, true, '/onboarding'],
    [undefined, true, '/onboarding'], [undefined, false, '/workspace'],
  ] as const)('완료=%s, 가입 진행=%s → %s', (completed, pending, path) => {
    expect(resolveAuthDestination(completed, pending)).toBe(path);
  });
  it('실제 완료 필드가 확정되기 전에는 값을 추정하지 않는다', () => {
    expect(readOnboardingCompletion(user)).toBeUndefined();
  });
  it('새 가입자의 진입은 보존하지만 다른 계정에는 적용하지 않는다', () => {
    markOnboardingPending(user.userId);
    expect(getAuthDestination(user)).toBe('/onboarding');
    expect(getAuthDestination({ ...user, userId: 'user-b' })).toBe('/workspace');
    clearOnboardingPending('user-b');
    expect(getAuthDestination(user)).toBe('/onboarding');
    clearOnboardingPending(user.userId);
    expect(getAuthDestination(user)).toBe('/workspace');
  });
  it('저장소가 차단되어도 가입 직후 온보딩으로 이동한다', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    });
    expect(() => markOnboardingPending(user.userId)).not.toThrow();
    expect(getAuthDestination(user, true)).toBe('/onboarding');
    expect(getAuthDestination(user)).toBe('/workspace');
    expect(() => clearOnboardingPending(user.userId)).not.toThrow();
  });
});
