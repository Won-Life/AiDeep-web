/*
 * CONTEXT
 * - Problem      : 로그인 유지 여부와 refresh 회전의 저장 위치가 일치해야 한다.
 * - Why          : 저장소 접근을 분리해 탭/지속 세션 정책을 동일하게 적용하고 검증한다.
 * - Alternatives : 훅에서 토큰 저장 → API 갱신과 정책이 분산된다.
 * - Trade-offs   : 기존 Web Storage의 XSS 위험은 유지되며 쿠키 전환은 별도 작업이다.
 * - Edge Case    : SSR, 반대 저장소의 잔존 토큰, OAuth 반환, 로그아웃.
 */
export type TokenPersistence = 'local' | 'session';
export const REFRESH_TOKEN_KEY = 'aideep_refresh_token';
const OAUTH_PERSISTENCE_KEY = 'onnode_oauth_persistence';
type TokenStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readRefreshToken(local: TokenStorage, session: TokenStorage) {
  return session.getItem(REFRESH_TOKEN_KEY) ?? local.getItem(REFRESH_TOKEN_KEY);
}

export function readPersistence(local: TokenStorage, session: TokenStorage): TokenPersistence {
  return session.getItem(REFRESH_TOKEN_KEY) !== null ? 'session' : 'local';
}

export function writeRefreshToken(
  token: string, persistence: TokenPersistence, local: TokenStorage, session: TokenStorage,
) {
  const target = persistence === 'local' ? local : session;
  const other = persistence === 'local' ? session : local;
  // Write first: a storage quota/security failure must not erase a valid session.
  target.setItem(REFRESH_TOKEN_KEY, token);
  other.removeItem(REFRESH_TOKEN_KEY);
}

export function rememberOAuthPersistence(persistence: TokenPersistence) {
  sessionStorage.setItem(OAUTH_PERSISTENCE_KEY, persistence);
}

export function consumeOAuthPersistence(): TokenPersistence {
  const value = sessionStorage.getItem(OAUTH_PERSISTENCE_KEY);
  sessionStorage.removeItem(OAUTH_PERSISTENCE_KEY);
  return value === 'session' ? 'session' : 'local';
}
