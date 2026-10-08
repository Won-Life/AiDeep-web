import { describe, expect, it } from 'vitest';
import { isRefreshExcludedForError } from './authRefreshPolicy';

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
