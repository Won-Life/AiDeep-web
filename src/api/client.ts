import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiResponse } from './types';
import { ApiError } from './types';

// ─── Token helpers ───────────────────────────────────────────────────

const TOKEN_KEY = 'aideep_access_token';
const REFRESH_TOKEN_KEY = 'aideep_refresh_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ─── Axios instance ──────────────────────────────────────────────────

const client: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── 401 refresh queue ───────────────────────────────────────────────

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  pendingQueue = [];
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

    // Non-401 or already retried → reject immediately
    if (error.response?.status !== 401 || originalRequest._retry) {
      const body = error.response?.data as ApiResponse<unknown> | undefined;
      if (body?.resultType === 'FAIL') {
        return Promise.reject(
          new ApiError(body.error.errorCode, body.error.reason, body.error.data),
        );
      }
      return Promise.reject(error);
    }

    // Queue concurrent requests while refresh is in-flight
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return client(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');

      // Use raw axios to bypass our interceptors
      const { data } = await axios.post<
        ApiResponse<{ accessToken: string; refreshToken: string }>
      >('/api/auth/refresh', { refreshToken }, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (data.resultType === 'FAIL') {
        throw new ApiError(data.error.errorCode, data.error.reason, data.error.data);
      }

      const { accessToken: newAccess, refreshToken: newRefresh } = data.success;
      setTokens(newAccess, newRefresh);
      processQueue(null, newAccess);

      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return client(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default client;

// ─── Legacy helper (backward-compat with fetch-style callers) ────────

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const { data } = await client.request<T>({
    url: path,
    method,
    data: options.body ? JSON.parse(options.body as string) : undefined,
    headers: options.headers as Record<string, string> | undefined,
  });
  return data;
}
