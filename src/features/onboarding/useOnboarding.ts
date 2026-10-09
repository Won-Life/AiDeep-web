'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe } from '@/api/user';
import { saveOnboarding, type MeetingPlatform, type UsagePurpose } from '@/api/onboarding';
import type { UserMeResponse } from '@/api/types';
import { generateDefaultNickname, hasNickname } from '@/features/auth/defaultNickname';
import { buildOnboardingRequest, isNicknameValid, toggleMeetingPlatform } from './onboardingRules';
import { clearOnboardingPending, readOnboardingCompletion } from './onboardingEntry';

/*
 * CONTEXT
 * - Problem      : 단계 이동과 서버 저장이 UI에 섞이면 건너뛰기·재시도가 어긋난다.
 * - Why          : 조회와 입력/전송 상태는 훅이 소유하고 마지막 단계에서만 저장한다.
 * - Alternatives : 단계별 API 호출 → 서버의 일괄 저장 계약과 다르다.
 * - Trade-offs   : 입력값은 페이지 수명 동안만 유지하며 개인정보를 스토리지에 복사하지 않는다.
 * - Edge Case    : 요청 중 이전 이동/중복 제출 차단, 저장 실패 시 선택 유지.
 */
export function useOnboarding() {
  const router = useRouter();
  const [user, setUser] = useState<UserMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [nickname, setNickname] = useState('');
  const [purpose, setPurpose] = useState<UsagePurpose | null>(null);
  const [meeting, setMeeting] = useState<MeetingPlatform[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    getMe().then((me) => {
      if (!active) return;
      if (readOnboardingCompletion(me) === true) {
        clearOnboardingPending(me.userId);
        router.replace('/workspace');
        return;
      }
      setUser(me);
      setNickname(hasNickname(me) ? me.username : generateDefaultNickname());
      setLoading(false);
    }).catch(() => {
      if (active) { setLoadError('정보를 불러오지 못했어요. 다시 시도해주세요.'); setLoading(false); }
    });
    return () => { active = false; };
  }, [router, attempt]);

  function retryLoad() { setLoading(true); setLoadError(''); setAttempt((value) => value + 1); }
  function previous() { if (!inFlight.current) { setError(''); setStep(step === 3 ? 2 : 1); } }
  function next() {
    if (inFlight.current || !isNicknameValid(nickname)) return;
    if (step < 3) { setStep(step === 1 ? 2 : 3); return; }
    void finish(meeting);
  }
  function skip() {
    if (inFlight.current) return;
    if (step === 2) { setPurpose(null); setStep(3); }
    else if (step === 3) { setMeeting([]); void finish([]); }
  }
  async function finish(selected: MeetingPlatform[]) {
    if (!user || inFlight.current || !isNicknameValid(nickname)) return;
    inFlight.current = true; setSaving(true); setError('');
    try {
      await saveOnboarding(buildOnboardingRequest(nickname, purpose, selected));
      clearOnboardingPending(user.userId);
      setStep(4);
    } catch { setError('저장하지 못했어요. 다시 시도해주세요.'); }
    finally { inFlight.current = false; setSaving(false); }
  }
  return { user, loading, loadError, retryLoad, step, nickname, setNickname, purpose, setPurpose,
    meeting, toggleMeeting: (value: MeetingPlatform) => setMeeting((values) => toggleMeetingPlatform(values, value)),
    saving, error, previous, next, skip };
}
