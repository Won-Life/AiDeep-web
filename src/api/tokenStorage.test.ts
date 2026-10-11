import { describe, expect, it } from 'vitest';
import { REFRESH_TOKEN_KEY, readPersistence, readRefreshToken, writeRefreshToken } from './tokenStorage';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe('refresh token persistence', () => {
  it('switches between session and persistent storage without leaving old tokens', () => {
    const local = storage(); const session = storage();
    writeRefreshToken('persistent', 'local', local, session);
    expect(readRefreshToken(local, session)).toBe('persistent');
    writeRefreshToken('tab', 'session', local, session);
    expect(local.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(readRefreshToken(local, session)).toBe('tab');
    writeRefreshToken('rotated', readPersistence(local, session), local, session);
    expect(session.getItem(REFRESH_TOKEN_KEY)).toBe('rotated');
    writeRefreshToken('persistent-again', 'local', local, session);
    expect(session.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(readPersistence(local, session)).toBe('local');
  });
  it('returns null for an empty session and prefers the tab session if both exist', () => {
    const local = storage(); const session = storage();
    expect(readRefreshToken(local, session)).toBeNull();
    local.setItem(REFRESH_TOKEN_KEY, 'old'); session.setItem(REFRESH_TOKEN_KEY, 'new');
    expect(readRefreshToken(local, session)).toBe('new');
  });
  it('does not erase the existing token if the new storage rejects a write', () => {
    const local = storage(); const session = storage();
    local.setItem(REFRESH_TOKEN_KEY, 'old');
    session.setItem = () => { throw new Error('storage blocked'); };
    expect(() => writeRefreshToken('new', 'session', local, session)).toThrow();
    expect(local.getItem(REFRESH_TOKEN_KEY)).toBe('old');
  });
});
