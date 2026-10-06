'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { completeOAuthSignup } from '@/api/auth';
import { getMe } from '@/api/user';
import { getAuthDestination, markOnboardingPending } from '@/features/onboarding/onboardingEntry';

/*
 * CONTEXT
 * - Problem      : Google 가입은 이름을 서버에 저장하고 온보딩에서 me로 읽는다.
 * - Why          : 이름을 프론트에서 임의로 만들지 않고 실제 약관 동의만 전송한다.
 * - Alternatives : 임시 username 전송 → 구글 기본 이름을 덮어쓴다.
 * - Trade-offs   : 서버의 Google 이름 자동 저장 계약을 전제로 한다.
 * - Edge Case    : 가입 티켓은 1회용이므로 가입 성공 후 조회 재시도는 티켓을 재사용하지 않는다.
 */
export function useOAuthSignup(ticket: string) {
  const router = useRouter();
  const [agreements, setAgreements] = useState({ terms: false, privacy: false, marketing: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [accountCreated, setAccountCreated] = useState(false);
  const completed = useRef(false);
  const inFlight = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || !agreements.terms || !agreements.privacy) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      if (!completed.current) {
        await completeOAuthSignup({ ticket, ...agreements });
        completed.current = true;
        setAccountCreated(true);
      }
      const user = await getMe();
      markOnboardingPending(user.userId);
      router.replace(getAuthDestination(user, true));
    } catch { setError(completed.current ? '정보를 불러오지 못했어요. 계속하기를 다시 눌러주세요.' : '가입에 실패했습니다. 다시 시도해주세요.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return { agreements, setAgreements, busy, error, accountCreated, submit };
}
