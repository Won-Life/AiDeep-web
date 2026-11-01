import { describe, expect, it } from 'vitest';
import { isCheckingSession } from './landingEntry';

describe('isCheckingSession', () => {
  it('토큰이 없으면 확인 없이 바로 랜딩을 보여준다', () => {
    expect(isCheckingSession({ hasToken: false, rejected: false })).toBe(false);
  });

  it('토큰이 있고 조회 중이면 스플래시를 유지한다', () => {
    expect(isCheckingSession({ hasToken: true, rejected: false })).toBe(true);
  });

  it('토큰이 있어도 조회가 거절되면 랜딩을 보여준다', () => {
    expect(isCheckingSession({ hasToken: true, rejected: true })).toBe(false);
  });
});
