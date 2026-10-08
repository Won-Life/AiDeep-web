import { describe, expect, it } from 'vitest';
import {
  completeEmailVerification,
  expireEmailVerification,
  remainingVerificationSeconds,
  type EmailVerificationState,
} from './emailVerificationState';

describe('request latency does not extend verification', () => {
  it.each([
    ['sent', 180, 160],
    ['verified', 600, 580],
  ] as const)(
    'accounts for a 20 second %s response delay',
    (status, ttl, remaining) => {
      const startedAt = 100_000;
      const result = completeEmailVerification(
        status,
        startedAt,
        ttl,
        startedAt + 20_000,
      );
      expect(result.seconds).toBe(remaining);
      expect(result.deadline).toBe(startedAt + ttl * 1000);
      expect(result.status).toBe(status);
      expect(
        remainingVerificationSeconds(result.deadline, startedAt + ttl * 1000),
      ).toBe(0);
    },
  );

  it.each(['sent', 'verified'] as const)(
    'does not revive %s after a response outlives its TTL',
    (status) => {
      expect(completeEmailVerification(status, 100_000, 180, 280_001)).toEqual(
        expireEmailVerification(),
      );
    },
  );

  it('expires at the exact deadline', () => {
    expect(completeEmailVerification('sent', 100_000, 180, 280_000)).toEqual(
      expireEmailVerification(),
    );
  });
});

describe('reissuing a code invalidates the previous verification', () => {
  it('clears the old code, status and deadline before the request', () => {
    let state: EmailVerificationState = {
      status: 'sent',
      code: '123456',
      deadline: 280_000,
      seconds: 120,
    };
    // 요청 시작 시 hook이 적용하는 상태. 실패 시 이 상태를 복원하지 않는다.
    state = expireEmailVerification();
    expect(state).toEqual({
      status: 'expired',
      code: '',
      deadline: 0,
      seconds: 0,
    });
    expect(state.status).not.toBe('sent');
  });

  it('only a successful response re-enables code verification with a new deadline', () => {
    const startedAt = 200_000;
    const pending = expireEmailVerification();
    expect(pending.deadline).toBe(0);
    const sent = completeEmailVerification('sent', startedAt, 180, 205_000);
    expect(sent).toEqual({
      status: 'sent',
      code: '',
      deadline: 380_000,
      seconds: 175,
    });
  });
});
