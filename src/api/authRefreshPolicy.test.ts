import { describe, expect, it } from 'vitest';
import { isRefreshExcludedForError, isRefreshTokenRejected } from './authRefreshPolicy';

describe('request-scoped domain 401 policy', () => {
  const codes = ['AUTH-025', 'AUTH-026'];
  it.each(codes)('excludes domain validation %s', (code) => {
    expect(isRefreshExcludedForError(code, codes)).toBe(true);
  });
  it.each(['AUTH-001', 'AUTH-019', 'AUTH-020', undefined])('does not exclude token error %s', (code) => {
    expect(isRefreshExcludedForError(code, codes)).toBe(false);
  });
  it('keeps other requests unchanged', () => {
    expect(isRefreshExcludedForError('AUTH-026', undefined)).toBe(false);
  });
});

describe('refresh failure session policy', () => {
  it.each([undefined, 400, 403, 404, 408, 429, 500, 502, 503, 504])(
    'preserves the session for a non-authentication failure (%s)', (status) => {
      expect(isRefreshTokenRejected(status)).toBe(false);
    },
  );
  it('expires the session only for an explicit authentication rejection', () => {
    expect(isRefreshTokenRejected(401)).toBe(true);
    expect(isRefreshTokenRejected(200, 'AUTH-401')).toBe(true);
  });
  it('does not treat an unknown envelope or a server error as a revoked token', () => {
    expect(isRefreshTokenRejected(200, 'UNKNOWN')).toBe(false);
    expect(isRefreshTokenRejected(503, 'AUTH-401')).toBe(false);
  });
});
