'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setTokens } from '@/api/client';
import { completeOAuthSignup } from '@/api/auth';
import { createWorkspace } from '@/api/workspace';
import { ApiError } from '@/api/types';
import { resolveCallbackPhase } from './resolveCallbackPhase';

const inputClass =
  'h-[56px] w-full rounded-[8px] border border-gray-700 bg-surface px-[16px] text-[16px] text-foreground outline-none placeholder:text-muted focus:border-main transition-colors';

const labelClass = 'text-[16px] font-semibold text-foreground pl-[8px]';

function CallbackCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-[700px] rounded-[16px] bg-background px-[24px] py-[88px] shadow-[0px_0px_4px_0px_rgba(44,44,44,0.25)]">
        {children}
      </div>
    </div>
  );
}

const Pending = () => (
  <CallbackCard>
    <p className="text-center text-[16px] text-muted">로그인 처리 중...</p>
  </CallbackCard>
);

/*
 * CONTEXT
 * - Problem      : 콜백 결과는 URL 쿼리로만 온다. 이걸 effect에서 읽어 setState 하면
 *                  React Compiler lint가 cascading render로 막고(set-state-in-effect),
 *                  토큰·ticket이 브라우저 히스토리에 그대로 남는 문제도 따로 남는다.
 * - Why          : useSearchParams()로 렌더 중에 읽고 useState 지연 초기화로 마운트 시점 값을
 *                  한 번만 붙잡는다. 분기는 순수 함수 resolveCallbackPhase가 계산하므로 effect는
 *                  부수효과(토큰 저장·주소 정리·이동)만 한다 — setState가 사라진다.
 *                  쿼리 제거는 Aideep_backend#78이 권고한 노출 완화책이다.
 * - Alternatives : effect에서 window.location.search 읽고 setState → 위 lint 에러.
 *                  파싱값을 state 없이 매 렌더 읽기 → replaceState로 쿼리를 지운 뒤 값이 사라져
 *                  정상 로그인이 에러 화면으로 뒤집힌다.
 * - Trade-offs   : useSearchParams가 Suspense 경계를 요구해 래퍼 컴포넌트가 하나 늘었다.
 * - Edge Case    : 토큰 없는 kind=login, ticket 없는 signup_required, 모르는 reason은
 *                  모두 순수 함수가 에러 화면으로 보낸다 (resolveCallbackPhase.test.ts).
 */
function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 지연 초기화 — 마운트 시점 쿼리로 분기를 확정하고, 이후 주소가 바뀌어도 유지한다
  const [phase] = useState(() => resolveCallbackPhase(searchParams));

  const [username, setUsername] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname);

    if (phase.status === 'login') {
      setTokens(phase.accessToken, phase.refreshToken);
      router.replace('/workspace');
      return;
    }

    // ponytail: 연동 개시 UI가 없어 지금은 도달하지 않는 경로 — 안내 화면 없이 바로 복귀시킨다
    if (phase.status === 'linked') {
      router.replace('/workspace');
    }
  }, [phase, router]);

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase.status !== 'signup') return;

    setError('');
    setSubmitting(true);
    try {
      await completeOAuthSignup({
        ticket: phase.ticket,
        username: username.trim(),
        agreedToTerms,
      });

      // 서버는 가입 시 워크스페이스를 만들지 않는다. 하나도 없으면 workspace 레이아웃이
      // 'no workspace'로 빠져 로딩 화면에서 멈추므로, 이메일 가입 경로와 동일하게 채워준다.
      // ponytail: 서버가 기본 워크스페이스 자동 생성으로 바뀌면 login/page.tsx의 같은 블록과 함께 삭제
      try {
        await createWorkspace({ title: '내 워크스페이스', role: 'OWNER' });
      } catch {
        // 인증은 이미 끝났다 — 워크스페이스 생성 실패로 가입을 되돌리지 않는다
      }

      router.replace('/workspace');
    } catch (err) {
      setError(err instanceof ApiError ? err.reason : '가입에 실패했습니다.');
      setSubmitting(false);
    }
  };

  if (phase.status === 'login' || phase.status === 'linked') return <Pending />;

  if (phase.status === 'error') {
    return (
      <CallbackCard>
        <h1 className="mb-[40px] text-center text-[36px] font-bold leading-[48px] text-foreground">
          로그인 실패
        </h1>
        <p className="mb-[40px] text-center text-[16px] text-text-red">{phase.message}</p>
        <button
          type="button"
          onClick={() => router.replace('/login')}
          className="h-[56px] w-full rounded-[8px] bg-main text-[18px] font-semibold text-white transition-colors hover:opacity-90"
        >
          로그인으로 돌아가기
        </button>
      </CallbackCard>
    );
  }

  return (
    <CallbackCard>
      <h1 className="mb-[64px] text-center text-[36px] font-bold leading-[48px] text-foreground">
        AIDeep 회원가입
      </h1>

      <form onSubmit={handleSignupSubmit} className="flex flex-col gap-[40px]">
        <div className="flex flex-col gap-[8px]">
          <label htmlFor="oauth-username" className={labelClass}>
            닉네임
          </label>
          <input
            id="oauth-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="2자 이상 100자 이하"
            required
            minLength={2}
            maxLength={100}
            className={inputClass}
          />
        </div>

        <label className="flex items-center gap-[8px] pl-[8px] text-[16px] text-foreground">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="h-[20px] w-[20px] accent-main"
          />
          이용약관 및 개인정보 처리방침에 동의합니다. (필수)
        </label>

        {error && <p className="text-[13px] text-text-red">* {error}</p>}

        <button
          type="submit"
          disabled={submitting || username.trim().length < 2 || !agreedToTerms}
          className="h-[56px] w-full rounded-[8px] bg-gray-600 text-[18px] font-semibold text-white transition-colors enabled:bg-main enabled:hover:opacity-90 disabled:cursor-not-allowed"
        >
          {submitting ? '처리 중...' : '가입 완료'}
        </button>
      </form>
    </CallbackCard>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<Pending />}>
      <OAuthCallback />
    </Suspense>
  );
}
