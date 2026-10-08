'use client';

import { useRef, useState, type FormEvent } from 'react';
import { rememberOAuthPersistence } from '@/api/tokenStorage';
import { login, signup } from '@/api/auth';
import { getMe } from '@/api/user';
import { useRouter } from 'next/navigation';
import { getAuthDestination, markOnboardingPending, markOnboardingPendingSession } from '@/features/onboarding/onboardingEntry';
import { useEmailVerification } from './useEmailVerification';
import { isSignupPasswordValid, type SignupFormValues } from './signupRules';

/*
 * CONTEXT
 * - Problem      : 가입 후 인증되어야 온보딩 답변을 저장할 수 있다.
 * - Why          : 가입 → 로그인 → 사용자 조회 순서를 훅이 소유한다.
 * - Alternatives : 로그인 화면 이동 → 같은 정보를 다시 입력해야 한다.
 * - Trade-offs   : 가입 성공은 별도 보관해 이후 실패 시 가입을 반복하지 않는다.
 * - Edge Case    : 로그인 재시도, 이메일 인증 만료, 중복 클릭.
 */
export function useSignupForm() {
  const router = useRouter();
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
  const registered = useRef<SignupFormValues | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);
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
    if ((!registered.current && !canSubmit) || busy || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setMessage('');
    try {
      const values = registered.current ?? {
        email: verification.email.trim(),
        password,
        agreedToTerms: agreements.terms,
        agreedToPrivacy: agreements.privacy,
        marketing: agreements.marketing,
      };
      if (!registered.current) {
        await signup({ email: values.email, password: values.password,
          termsOfService: values.agreedToTerms, privacyPolicy: values.agreedToPrivacy, marketing: values.marketing });
        registered.current = values;
        setAccountCreated(true);
      }
      await login({ email: values.email, password: values.password }, 'session');
      markOnboardingPendingSession();
      const user = await getMe();
      markOnboardingPending(user.userId);
      router.replace(getAuthDestination(user, true));
    } catch {
      setMessage(registered.current
        ? '회원가입은 완료됐어요. 계속하기를 눌러 다시 로그인해주세요.'
        : '회원가입에 실패했습니다. 다시 시도해주세요.');
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
    accountCreated,
    message,
    canSubmit: accountCreated || canSubmit,
    submit,
    startGoogleLogin,
  };
}
