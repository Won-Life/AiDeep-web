import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiResponse } from './types';
import { ApiError } from './types';
import { pendingSaves } from '@/components/ui/saveRetryStore';
import { showToast } from '@/components/ui/toastStore';
import { isRefreshExcludedForError, isRefreshTokenRejected } from './authRefreshPolicy';
import { REFRESH_TOKEN_KEY, readRefreshToken, readPersistence, writeRefreshToken, type TokenPersistence } from './tokenStorage';
import { clearAuthSession, getAuthSessionId, startAuthSession } from './tokenStorage';

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
    skipAuthRefreshForErrorCodes?: readonly string[];
    _authSessionVersion?: number;
    _handlesSaveRetry?: boolean;
  }
}

// ─── Token helpers ───────────────────────────────────────────────────

const TOKEN_KEY = 'aideep_access_token';

// Access token은 XSS 표면 축소를 위해 JS 메모리에만 보관 (OWASP 권고 1단계).
// 새로고침 시 비어 있으면 첫 요청 401 → 아래 refresh queue가 재발급해 채운다.
let accessTokenInMemory: string | null = null;
let sessionVersion = 0;

// 마이그레이션: 구버전이 localStorage에 남긴 access token 잔존값 제거 (1회)
if (typeof window !== 'undefined') {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAccessToken(): string | null {
  return accessTokenInMemory;
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return readRefreshToken(localStorage, sessionStorage);
}

export function setTokens(accessToken: string, refreshToken: string, persistence?: TokenPersistence) {
  if (typeof window === 'undefined') return;
  writeRefreshToken(refreshToken, persistence ?? readPersistence(localStorage, sessionStorage), localStorage, sessionStorage);
  if (persistence !== undefined || !getAuthSessionId()) startAuthSession();
  accessTokenInMemory = accessToken;
  if (persistence !== undefined) sessionVersion += 1;
}

export function clearTokens() {
  sessionVersion += 1;
  accessTokenInMemory = null;
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  clearAuthSession();
}

// ─── Axios instance ──────────────────────────────────────────────────

const client: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config._authSessionVersion ??= sessionVersion;
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── 401 refresh queue ───────────────────────────────────────────────

let refreshPromise: Promise<string> | null = null;
let refreshVersion = 0;

/*
 * CONTEXT
 * - Problem      : 탭별 큐만으로는 공유 refresh token 회전이 충돌하고 장애 때 정상 세션도 지워졌다.
 * - Why          : Web Lock 안에서 최신 저장 토큰을 읽고, 인증 거절 때만 해당 세션을 종료한다.
 * - Alternatives : access token localStorage 공유 → 메모리 보관 원칙 위반; 무조건 재시도 → 회전 응답 유실을 해결하지 못한다.
 * - Trade-offs   : Web Locks 미지원 환경은 탭 내부 큐만 보장하며, 탭마다 순차 갱신해 access token을 메모리에 받는다.
 * - Edge Case    : 늦은 401, 갱신 중 로그인·로그아웃, 다른 탭의 토큰 변경, timeout·5xx.
 */
function endExpiredSession(persistence: TokenPersistence) {
  accessTokenInMemory = null;
  sessionVersion += 1;
  const storage = persistence === 'local' ? localStorage : sessionStorage;
  storage.removeItem(REFRESH_TOKEN_KEY);
  clearAuthSession();
  if (window.location.pathname !== '/login') window.location.href = '/login';
}

async function rotateRefreshToken(version: number): Promise<string> {
  if (version !== sessionVersion) throw new Error('Auth session changed');
  const refreshToken = getRefreshToken();
  const persistence = readPersistence(localStorage, sessionStorage);
  if (!refreshToken) {
    endExpiredSession(persistence);
    throw new Error('No refresh token');
  }
  const isCurrent = () => version === sessionVersion && getRefreshToken() === refreshToken;
  try {
    // Raw axios prevents recursive refresh interception. Read storage only after acquiring the lock.
    const { data, status } = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      '/api/auth/refresh', { refreshToken },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15_000 },
    );
    if (!isCurrent()) throw new Error('Auth session changed');
    if (data.resultType === 'FAIL') {
      if (isRefreshTokenRejected(status, data.error.errorCode)) endExpiredSession(persistence);
      throw new ApiError(data.error.errorCode, data.error.reason, data.error.data);
    }
    if (!data.success?.accessToken || !data.success?.refreshToken) {
      throw new Error('Invalid refresh response');
    }
    setTokens(data.success.accessToken, data.success.refreshToken);
    return data.success.accessToken;
  } catch (error) {
    if (isCurrent() && axios.isAxiosError(error) && isRefreshTokenRejected(error.response?.status)) {
      endExpiredSession(persistence);
    }
    throw error;
  }
}

function refreshAccessToken(): Promise<string> {
  if (refreshPromise && refreshVersion === sessionVersion) return refreshPromise;
  const version = sessionVersion;
  refreshVersion = version;
  const rotate = () => rotateRefreshToken(version);
  const operation = typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('aideep-auth-refresh', rotate)
    : rotate();
  const pending = Promise.resolve(operation).finally(() => {
    if (refreshPromise === pending) refreshPromise = null;
  });
  refreshPromise = pending;
  return pending;
}

// ─── Response interceptor: unwrap envelope + 401 refresh ─────────────

client.interceptors.response.use(
  (response) => {
    const body: ApiResponse<unknown> = response.data;
    if (body.resultType === 'FAIL') {
      throw new ApiError(body.error.errorCode, body.error.reason, body.error.data);
    }
    response.data = body.success;
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const body = error.response?.data as ApiResponse<unknown> | undefined;
    // A request from before logout/new login must never refresh or retry as the new user.
    if (originalRequest && originalRequest._authSessionVersion !== sessionVersion) {
      return Promise.reject(error);
    }
    // Password validation 401 must not rotate refresh tokens; expired tokens still refresh.
    const excluded = isRefreshExcludedForError(
      body?.resultType === 'FAIL' ? body.error.errorCode : undefined,
      originalRequest?.skipAuthRefreshForErrorCodes,
    );
    // Non-401, domain validation, or already retried → reject immediately
    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || originalRequest.skipAuthRefresh || excluded) {
      // 저장 실패 토스트 (Figma L3): 노드·엣지 변경 저장(POST/PATCH/DELETE)이 네트워크
      // 끊김이나 서버 오류(5xx)로 실패하면 알린다. 검증 오류(4xx)·auth 등은 제외.
      const method = originalRequest?.method?.toUpperCase();
      const url = originalRequest?.url ?? '';
      const status = error.response?.status;
      if (
        !originalRequest?._handlesSaveRetry &&
        method &&
        ['POST', 'PATCH', 'DELETE'].includes(method) &&
        /\/(node|edge)(\/|$|\?)/.test(url) &&
        (!error.response || (status !== undefined && status >= 500))
      ) {
        showToast('변경사항을 저장하지 못했어요. 네트워크를 확인해주세요');
      }
      if (body?.resultType === 'FAIL') {
        return Promise.reject(
          new ApiError(body.error.errorCode, body.error.reason, body.error.data),
        );
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    // A late 401 may belong to the old token after another request already refreshed it.
    const currentToken = getAccessToken();
    const requestToken = originalRequest.headers.Authorization;
    const newToken = currentToken && requestToken !== `Bearer ${currentToken}`
      ? currentToken
      : await refreshAccessToken();
    if (originalRequest._authSessionVersion !== sessionVersion) throw new Error('Auth session changed');
    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return client(originalRequest);
  },
);

export default client;

// ─── Legacy helper (backward-compat with fetch-style callers) ────────

/*
 * CONTEXT
 * - Problem      : 오프라인에서 그래프 변경이 실패하면 기존 catch 경로로 유실되고 재시도 UI도 없다.
 * - Why          : 보내기 전 요청은 대기시키고 값 교체 PATCH의 일시 오류만 순서대로 재시도해 원래 호출자에게 응답한다.
 * - Alternatives : 이미 보낸 POST의 자동 재전송은 서버에서 성공했을 때 중복 노드를 만들 수 있다.
 * - Trade-offs   : 큐는 탭 메모리에만 유지하며 서버 오류 PATCH는 사용자의 재시도 또는 다음 연결을 기다린다.
 * - Edge Case    : 계정 변경 시 이전 요청은 거부하며 refresh 처리는 기존 interceptor에 맡긴다.
 */
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const graphWrite = ['POST', 'PATCH', 'DELETE'].includes(method) && /\/(node|edge)(\/|$|\?)/.test(path);
  const version = sessionVersion;
  const sessionId = typeof window === 'undefined' ? null : getAuthSessionId();
  const offlineSavePending = new Error('Offline save pending');
  const execute = async () => {
    if (version !== sessionVersion || (typeof window !== 'undefined' && sessionId !== getAuthSessionId())) throw new Error('Auth session changed');
    if (graphWrite && typeof navigator !== 'undefined' && !navigator.onLine) throw offlineSavePending;
    const { data } = await client.request<T>({
      url: path,
      method,
      data: options.body ? JSON.parse(options.body as string) : undefined,
      headers: options.headers as Record<string, string> | undefined,
      _handlesSaveRetry: graphWrite,
    });
    return data;
  };
  if (!graphWrite) return execute();
  const offline = () => typeof navigator !== 'undefined' && !navigator.onLine;
  // 값 교체 PATCH만 재시도한다. 전송된 POST/DELETE는 중복 생성·부분 성공 위험 때문에 자동 재전송하지 않는다.
  const retryable = (error: unknown) => error === offlineSavePending || axios.isAxiosError(error) && !axios.isCancel(error)
    && method === 'PATCH' && !path.endsWith('/restore') && (!error.response || error.response.status >= 500);
  const enqueue = () => pendingSaves.enqueue(execute, retryable).catch((error) => {
    showToast('저장하지 못했어요. 연결 상태를 확인해 주세요');
    throw error;
  });
  if (offline() || pendingSaves.getCount() > 0) {
    const queued = enqueue();
    if (!offline()) void pendingSaves.retry();
    return queued;
  }
  try { return await execute(); }
  catch (error) {
    if (retryable(error)) return enqueue();
    showToast('저장하지 못했어요. 연결 상태를 확인해 주세요');
    throw error;
  }
}
