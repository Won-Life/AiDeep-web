'use client';

import { useEffect, useRef, useState } from 'react';
import { sendEmailCode, verifyEmailCode } from '@/api/auth';
import { ApiError } from '@/api/types';
import {
  EMAIL_CODE_TTL_SECONDS,
  VERIFIED_EMAIL_TTL_SECONDS,
  isEmailCodeValid,
  isSignupEmailValid,
} from './signupRules';
import {
  completeEmailVerification,
  expireEmailVerification,
  initialEmailVerification,
  remainingVerificationSeconds,
} from './emailVerificationState';

const expiredMessage = '인증 시간이 만료됐어요. 인증번호를 다시 받아주세요.';

/*
 * CONTEXT
 * - Problem      : 변경된 이메일에 이전 인증 결과가 붙거나 요청이 중복될 수 있다.
 * - Why          : 입력 변경 시 인증을 초기화하고 요청 중 입력을 잠근다.
 * - Alternatives : 화면 컴포넌트에서 처리 → 타이머와 요청 상태가 UI에 섞인다.
 * - Trade-offs   : 새로고침하면 폼 상태는 초기화한다.
 * - Edge Case    : unmount, 재전송 실패, 코드 5회 실패, 서버 인증 완료 10분 만료.
 */
export function useEmailVerification() {
  const [email, setEmail] = useState('');
  const [verification, setVerification] = useState(initialEmailVerification);
  const { code, status, deadline, seconds } = verification;
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const inFlight = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => {
      const remaining = remainingVerificationSeconds(deadline, Date.now());
      setVerification((current) =>
        current.deadline !== deadline || current.seconds === remaining
          ? current
          : remaining
            ? { ...current, seconds: remaining }
            : expireEmailVerification(),
      );
      if (!remaining) {
        setMessage(expiredMessage);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [deadline]);

  function changeEmail(value: string) {
    if (inFlight.current) return;
    setEmail(value);
    setVerification(initialEmailVerification);
    setMessage('');
  }

  function setCode(value: string) {
    if (inFlight.current) return;
    setVerification((current) => ({ ...current, code: value }));
  }

  async function requestCode() {
    if (inFlight.current || !isSignupEmailValid(email) || status === 'verified')
      return;
    inFlight.current = true;
    const startedAt = Date.now();
    // 서버는 SMTP 전 기존 코드를 덮어쓸 수 있으므로 실패해도 복원하지 않는다.
    setVerification(expireEmailVerification());
    setPending(true);
    setMessage('');
    try {
      await sendEmailCode({ email: email.trim() });
      if (!mounted.current) return;
      const next = completeEmailVerification(
        'sent',
        startedAt,
        EMAIL_CODE_TTL_SECONDS,
        Date.now(),
      );
      setVerification(next);
      if (next.status === 'expired') setMessage(expiredMessage);
    } catch (error) {
      if (mounted.current)
        setMessage(
          error instanceof ApiError
            ? error.reason
            : '인증번호 발송에 실패했습니다. 다시 시도해주세요.',
        );
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
  }

  async function confirmCode() {
    if (
      inFlight.current ||
      status !== 'sent' ||
      deadline <= Date.now() ||
      !isEmailCodeValid(code)
    )
      return;
    inFlight.current = true;
    const startedAt = Date.now();
    setPending(true);
    setMessage('');
    try {
      await verifyEmailCode({ email: email.trim(), code: Number(code) });
      if (!mounted.current) return;
      const next = completeEmailVerification(
        'verified',
        startedAt,
        VERIFIED_EMAIL_TTL_SECONDS,
        Date.now(),
      );
      setVerification(next);
      if (next.status === 'expired') setMessage(expiredMessage);
    } catch (error) {
      if (!mounted.current) return;
      setMessage(
        error instanceof ApiError
          ? error.reason
          : '인증번호 확인에 실패했습니다. 다시 시도해주세요.',
      );
      if (
        error instanceof ApiError &&
        [
          'AUTH_VERIFICATION_CODE_EXPIRED',
          'AUTH_VERIFICATION_ATTEMPTS_EXCEEDED',
        ].includes(error.errorCode)
      ) {
        setVerification(expireEmailVerification());
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
  }
  return {
    email,
    code,
    status,
    pending,
    message,
    seconds,
    changeEmail,
    setCode,
    requestCode,
    confirmCode,
  };
}
