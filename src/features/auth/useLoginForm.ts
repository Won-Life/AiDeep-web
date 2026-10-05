'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/api/auth';
import { rememberOAuthPersistence } from '@/api/tokenStorage';
import { getLoginErrorMessage } from './loginError';

type LoginState = { status: 'idle' | 'submitting' | 'error'; message: string };

/*
 * CONTEXT
 * - Problem      : 로그인 상태가 회원가입 상태와 섞여 오류/로딩이 공유된다.
 * - Why          : 도메인 훅이 입력과 제출 상태를 소유하고 UI는 값과 액션을 받는다.
 * - Alternatives : 전역 스토어 → 로그인 화면 밖에 공유할 상태가 없다.
 * - Trade-offs   : 서버 정책인 잠금/이메일 인증 실패는 이번 범위에서 추가하지 않는다.
 * - Edge Case    : 중복 제출, 실패 후 재입력, OAuth 전체 페이지 이동.
 */
export function useLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [state, setState] = useState<LoginState>({ status: 'idle', message: '' });
  const submitting = useRef(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current || !email.trim() || !password) return;
    submitting.current = true;
    setState({ status: 'submitting', message: '' });
    try {
      await login({ email: email.trim(), password }, remember ? 'local' : 'session');
      router.replace('/workspace');
    } catch (error) {
      setState({ status: 'error', message: getLoginErrorMessage(error) });
      submitting.current = false;
    }
  }

  function startGoogleLogin() {
    rememberOAuthPersistence(remember ? 'local' : 'session');
    window.location.assign('/api/auth/google');
  }

  function changeEmail(value: string) {
    setEmail(value);
    if (state.status === 'error') setState({ status: 'idle', message: '' });
  }
  function changePassword(value: string) {
    setPassword(value);
    if (state.status === 'error') setState({ status: 'idle', message: '' });
  }
  return { email, password, remember, setRemember, setEmail: changeEmail, setPassword: changePassword,
    state, isSubmitting: state.status === 'submitting', submit, startGoogleLogin };
}
