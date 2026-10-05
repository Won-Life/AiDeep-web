'use client';

import { useRef, useState, type FormEvent } from 'react';
import { rememberOAuthPersistence } from '@/api/tokenStorage';
import { useEmailVerification } from './useEmailVerification';
import { isSignupPasswordValid, type SignupFormValues } from './signupRules';

/*
 * CONTEXT
 * - Problem      : 디자인 폼과 최종 가입 API의 필드가 다르다.
 * - Why          : 화면 값은 관리하되 서버 계약이 맞는 submit 연결만 받는다.
 * - Alternatives : 가짜 name/phone 전송 → 사용자 정보 오염.
 * - Trade-offs   : 최종 가입 버튼은 submit 연결 전 비활성화한다.
 * - Edge Case    : 선택 마케팅 동의는 payload에 포함하지 않는다.
 */
export function useSignupForm(
  onSignup?: (values: SignupFormValues) => Promise<void>,
) {
  const verification = useEmailVerification();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    marketing: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const inFlight = useRef(false);
  const passwordValid = isSignupPasswordValid(password);
  const confirmInvalid = Boolean(confirm) && password !== confirm;
  const canSubmit =
    verification.status === 'verified' &&
    passwordValid &&
    password === confirm &&
    agreements.terms &&
    agreements.privacy;
  const busy = verification.pending || submitting;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!onSignup || !canSubmit || busy || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setMessage('');
    try {
      await onSignup({
        email: verification.email.trim(),
        password,
        agreedToTerms: agreements.terms,
        agreedToPrivacy: agreements.privacy,
      });
    } catch {
      setMessage('회원가입에 실패했습니다. 다시 시도해주세요.');
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }
  function startGoogleLogin() {
    if (busy || inFlight.current) return;
    rememberOAuthPersistence('local');
    window.location.assign('/api/auth/google');
  }
  return {
    verification,
    password,
    confirm,
    setPassword,
    setConfirm,
    passwordValid,
    confirmInvalid,
    agreements,
    setAgreements,
    busy,
    submitting,
    message,
    canSubmit: Boolean(onSignup) && canSubmit,
    submit,
    startGoogleLogin,
  };
}
