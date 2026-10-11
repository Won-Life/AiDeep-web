import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearOnboardingPending, getAuthDestination, markOnboardingPending, markOnboardingPendingSession, readOnboardingCompletion, resolveAuthDestination } from './onboardingEntry';
import { clearAuthSession, getAuthSessionId, startAuthSession, writeRefreshToken } from '../../api/tokenStorage';

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
  it('자동 로그인 후 사용자 조회 실패·새로고침에서도 가입 진행을 복구한다', () => {
    startAuthSession();
    markOnboardingPendingSession();
    // 사용자 조회가 실패하면 userId에 바인딩하지 않는다. 이후 부팅 조회 성공을 재현한다.
    expect(getAuthDestination(user)).toBe('/onboarding');
    expect(getAuthDestination(user)).toBe('/onboarding');
    expect(getAuthDestination({ ...user, userId: 'user-b' })).toBe('/workspace');
  });
  it('여러 차례 refresh 토큰이 회전해도 조회 전 가입 진행을 보존한다', () => {
    startAuthSession();
    const sessionId = getAuthSessionId();
    markOnboardingPendingSession();
    const local = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    writeRefreshToken('fake-refresh-1', 'session', local, sessionStorage);
    writeRefreshToken('fake-refresh-2', 'session', local, sessionStorage);
    expect(getAuthSessionId()).toBe(sessionId);
    expect(getAuthDestination(user)).toBe('/onboarding');
  });
  it('조회 전에 다른 계정으로 로그인하면 이전 가입 진행을 넘기지 않는다', () => {
    startAuthSession();
    markOnboardingPendingSession();
    startAuthSession();
    expect(getAuthDestination({ ...user, userId: 'user-b' })).toBe('/workspace');
  });
  it('로그아웃하면 조회 전 가입 진행이 다음 세션에 적용되지 않는다', () => {
    startAuthSession();
    markOnboardingPendingSession();
    clearAuthSession();
    expect(getAuthDestination(user)).toBe('/workspace');
  });
  it('복구된 사용자도 저장 완료 후에는 온보딩으로 다시 보내지 않는다', () => {
    startAuthSession();
    markOnboardingPendingSession();
    expect(getAuthDestination(user)).toBe('/onboarding');
    clearOnboardingPending(user.userId);
    expect(getAuthDestination(user)).toBe('/workspace');
  });
});
