import { describe, expect, it } from 'vitest';
import {
  EMAIL_CODE_TTL_SECONDS,
  VERIFIED_EMAIL_TTL_SECONDS,
  formatVerificationTime,
  isEmailCodeValid,
  isSignupEmailValid,
  isSignupPasswordValid,
} from './signupRules';

describe('signup validation', () => {
  it.each(['Password1!', 'abcd123!', 'ABCD123!'])(
    'accepts a password matching the design requirements: %s',
    (password) => {
      expect(isSignupPasswordValid(password)).toBe(true);
    },
  );

  it.each(['', 'abc1!', 'password!', '12345678!', 'Password1', 'Password1 '])(
    'rejects an incomplete password combination: %s',
    (password) => {
      expect(isSignupPasswordValid(password)).toBe(false);
    },
  );

  it.each([
    'demo@example.com',
    ' demo@example.com ',
    'demo+signup@example.co.kr',
  ])('accepts a valid email: %s', (email) => {
    expect(isSignupEmailValid(email)).toBe(true);
  });

  it.each([
    '',
    'demo',
    'demo@example',
    'demo @example.com',
    'demo@@example.com',
  ])('rejects an invalid email: %s', (email) => {
    expect(isSignupEmailValid(email)).toBe(false);
  });

  it.each(['100000', '999999'])(
    'accepts a six digit verification code: %s',
    (code) => {
      expect(isEmailCodeValid(code)).toBe(true);
    },
  );

  it.each(['', '12345', '1234567', '12a456', ' 123456'])(
    'rejects an invalid verification code: %s',
    (code) => {
      expect(isEmailCodeValid(code)).toBe(false);
    },
  );
});

describe('verification timer', () => {
  it('uses the verified server lifetimes', () => {
    expect(EMAIL_CODE_TTL_SECONDS).toBe(180);
    expect(VERIFIED_EMAIL_TTL_SECONDS).toBe(600);
  });

  it.each([
    [180, '03:00'],
    [179, '02:59'],
    [60, '01:00'],
    [0.5, '00:01'],
    [0, '00:00'],
    [-1, '00:00'],
  ])('formats %s seconds as %s', (seconds, expected) => {
    expect(formatVerificationTime(Number(seconds))).toBe(expected);
  });
});
