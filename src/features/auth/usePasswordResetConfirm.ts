'use client';

import { useRef, useState } from 'react';
import { confirmPasswordReset } from '@/api/auth';
import { getResetConfirmMessage, isResetLinkInvalid } from './passwordRecovery';
import { isSignupPasswordValid } from './signupRules';

type ConfirmState =
  | { status: 'idle' | 'submitting' | 'done' | 'invalid' }
  | { status: 'error'; message: string };

/*
 * CONTEXT
 * - Problem      : 링크로 들어온 사용자가 새 비밀번호를 정하는 화면이 만료·완료·오류를 구분해야 한다.
 * - Why          : 토큰은 URL에서 받고 AUTH-034만 "링크 만료"로, 나머지는 입력을 유지한 채 오류로 보인다.
 * - Alternatives : 모든 실패를 만료로 처리 → 네트워크 오류에서 새 링크를 요구하게 된다.
 * - Trade-offs   : 토큰 없이 진입하면 서버를 호출하지 않고 만료 화면을 보인다.
 * - Edge Case    : 두 입력 불일치, 중복 제출, 성공 뒤 재제출 방지.
 */
export function usePasswordResetConfirm(token: string) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [state, setState] = useState<ConfirmState>(token ? { status: 'idle' } : { status: 'invalid' });
  const busy = useRef(false);
  const mismatch = confirmation.length > 0 && password !== confirmation;
  const valid = isSignupPasswordValid(password) && password === confirmation;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || !valid || !token) return;
    busy.current = true;
    setState({ status: 'submitting' });
    try {
      await confirmPasswordReset(token, password);
      setState({ status: 'done' });
    } catch (error) {
      setState(isResetLinkInvalid(error) ? { status: 'invalid' } : { status: 'error', message: getResetConfirmMessage(error) });
      busy.current = false;
    }
  }

  function clearError() {
    if (state.status === 'error') setState({ status: 'idle' });
  }

  return {
    password,
    confirmation,
    state,
    mismatch,
    valid,
    isSubmitting: state.status === 'submitting',
    setPassword: (value: string) => { setPassword(value); clearError(); },
    setConfirmation: (value: string) => { setConfirmation(value); clearError(); },
    submit,
  };
}
