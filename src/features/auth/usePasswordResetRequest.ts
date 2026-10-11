'use client';

import { useEffect, useRef, useState } from 'react';
import { requestPasswordReset } from '@/api/auth';
import { getResetRequestFailure } from './passwordRecovery';
import { isSignupEmailValid } from './signupRules';

type RequestState =
  | { status: 'idle' | 'submitting' | 'sent' | 'not-found' }
  | { status: 'error'; message: string };

/*
 * CONTEXT
 * - Problem      : 재설정 링크 요청은 보내기·재전송·미가입·서버 오류가 한 화면에서 오간다.
 * - Why          : 상태를 한 훅에 모아 화면은 status만 보고 그린다.
 * - Alternatives : 컴포넌트에서 try/catch 분기 → 재전송과 첫 전송의 오류 처리가 갈라진다.
 * - Trade-offs   : 구글 전용 계정도 서버가 링크를 보내므로 별도 안내 분기는 두지 않는다.
 * - Edge Case    : 중복 클릭, 재전송 실패 시 입력 유지, 이메일 수정 시 오류 해제.
 */
export function usePasswordResetRequest() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<RequestState>({ status: 'idle' });
  const [resent, setResent] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (!resent) return;
    const timer = setTimeout(() => setResent(false), 3000);
    return () => clearTimeout(timer);
  }, [resent]);

  async function send(isResend = false) {
    const value = email.trim();
    if (busy.current || !isSignupEmailValid(value)) return;
    busy.current = true;
    setState({ status: 'submitting' });
    try {
      await requestPasswordReset(value);
      setState({ status: 'sent' });
      if (isResend) setResent(true);
    } catch (error) {
      const failure = getResetRequestFailure(error);
      setState(failure.kind === 'not-found' ? { status: 'not-found' } : { status: 'error', message: failure.message });
    } finally {
      busy.current = false;
    }
  }

  function changeEmail(value: string) {
    setEmail(value);
    if (state.status === 'not-found' || state.status === 'error') setState({ status: 'idle' });
  }

  return {
    email,
    state,
    resent,
    isSubmitting: state.status === 'submitting',
    canSubmit: isSignupEmailValid(email),
    changeEmail,
    submit: () => void send(false),
    resend: () => void send(true),
  };
}
