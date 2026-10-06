import type { UserMeResponse } from '@/api/types';
import { getAuthSessionId } from '../../api/tokenStorage';

const PENDING_KEY = 'onnode_onboarding_pending_user';
const PENDING_SESSION_KEY = 'onnode_onboarding_pending_session';

/*
 * CONTEXT
 * - Problem      : 완료 조회 필드는 아직 없지만 가입 직후 진입은 유지해야 한다.
 * - Why          : 서버 플래그 해석과 이동 결정을 분리하고 가입 진행만 세션에 남긴다.
 * - Alternatives : 브라우저 공용 완료 값 → 다른 계정과 다른 기기의 상태가 섞인다.
 * - Trade-offs   : 필드가 없는 기존 계정은 종전처럼 워크스페이스로 이동한다.
 * - Edge Case    : 명시적 완료는 pending보다 우선하며 알 수 없는 값은 미완료로 단정하지 않는다.
 */
// TODO: 서버 필드가 확정되면 이 키와 UserMeResponse 타입만 함께 연결한다.
const COMPLETION_FIELD: keyof UserMeResponse | null = null;

export function readOnboardingCompletion(user: UserMeResponse): boolean | undefined {
  if (COMPLETION_FIELD === null) return undefined;
  const value: unknown = user[COMPLETION_FIELD];
  return typeof value === 'boolean' ? value : undefined;
}

export function resolveAuthDestination(completed: boolean | undefined, pending: boolean) {
  if (completed === true) return '/workspace';
  return completed === false || pending ? '/onboarding' : '/workspace';
}

export function markOnboardingPending(userId: string) {
  try {
    sessionStorage.setItem(PENDING_KEY, userId);
    sessionStorage.removeItem(PENDING_SESSION_KEY);
  } catch { /* 저장소 차단 시에도 현재 가입 흐름은 진행한다. */ }
}

export function markOnboardingPendingSession() {
  const sessionId = getAuthSessionId();
  if (!sessionId) return;
  try { sessionStorage.setItem(PENDING_SESSION_KEY, sessionId); } catch { /* 현재 가입 흐름은 계속 진행한다. */ }
}

export function clearOnboardingPending(userId: string) {
  try {
    if (sessionStorage.getItem(PENDING_KEY) === userId) sessionStorage.removeItem(PENDING_KEY);
    if (sessionStorage.getItem(PENDING_SESSION_KEY) === getAuthSessionId()) sessionStorage.removeItem(PENDING_SESSION_KEY);
  } catch { /* 저장소 사용 가능 여부가 API 저장 결과를 바꾸지 않는다. */ }
}

export function getAuthDestination(user: UserMeResponse, justSignedUp = false) {
  const completed = readOnboardingCompletion(user);
  let pending = justSignedUp;
  try {
    const pendingSession = sessionStorage.getItem(PENDING_SESSION_KEY);
    if (pendingSession && pendingSession === getAuthSessionId()) {
      markOnboardingPending(user.userId);
      pending = true;
    }
    pending ||= sessionStorage.getItem(PENDING_KEY) === user.userId;
  } catch { /* 가입 직후 상태를 우선한다. */ }
  if (completed === true) clearOnboardingPending(user.userId);
  return resolveAuthDestination(completed, pending);
}
