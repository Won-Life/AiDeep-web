'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setTokens } from '@/api/client';
import { getMe } from '@/api/user';
import { consumeOAuthPersistence } from '@/api/tokenStorage';
import { getAuthDestination } from '@/features/onboarding/onboardingEntry';
import AuthLayout from '@/features/auth/AuthLayout';
import Button from '@/components/ui/Button';
import OAuthSignupScreen from '@/features/auth/OAuthSignupScreen';
import { resolveCallbackPhase } from './resolveCallbackPhase';

function Pending() {
  return <AuthLayout><p role="status" className="mt-10 text-center">로그인 처리 중...</p></AuthLayout>;
}

/*
 * CONTEXT
 * - Problem      : OAuth 결과의 토큰·가입 티켓을 URL에 계속 남기면 노출된다.
 * - Why          : 최초 쿼리를 보관하고 토큰은 한 번 저장한 뒤 사용자 상태로 분기한다.
 * - Alternatives : 일반 로그인과 다른 진입 정책 → 온보딩 플래그 처리 불일치.
 * - Trade-offs   : useSearchParams를 쓰므로 Suspense 경계를 유지한다.
 * - Edge Case    : StrictMode replay에서 저장 선호도를 다시 소비하지 않는다.
 */
function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase] = useState(() => resolveCallbackPhase(searchParams));
  const loginHandled = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    window.history.replaceState(null, '', window.location.pathname);
    if (phase.status === 'login') {
      if (!loginHandled.current) {
        setTokens(phase.accessToken, phase.refreshToken, consumeOAuthPersistence());
        loginHandled.current = true;
      }
      getMe().then((user) => { if (active) router.replace(getAuthDestination(user)); })
        .catch(() => { if (active) setError('로그인 정보를 불러오지 못했어요. 다시 로그인해주세요.'); });
    } else if (phase.status === 'linked') router.replace('/workspace');
    return () => { active = false; };
  }, [phase, router]);
  if (phase.status === 'signup') return <OAuthSignupScreen ticket={phase.ticket} />;
  const message = phase.status === 'error' ? phase.message : error;
  if (!message) return <Pending />;
  return (
    <AuthLayout>
      <h1 className="mt-10 text-center text-[20px] font-bold text-[var(--onnode-text)]">로그인 실패</h1>
      <p role="alert" className="my-6 text-center text-[var(--onnode-danger)]">{message}</p>
      <Button onClick={() => router.replace('/login')} className="w-full">로그인으로 돌아가기</Button>
    </AuthLayout>
  );
}

export default function OAuthCallbackPage() {
  return <Suspense fallback={<Pending />}><OAuthCallback /></Suspense>;
}
