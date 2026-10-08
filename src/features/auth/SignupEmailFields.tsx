'use client';

import { useId } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { useEmailVerification } from './useEmailVerification';
import {
  formatVerificationTime,
  isEmailCodeValid,
  isSignupEmailValid,
} from './signupRules';

export default function SignupEmailFields({
  verification,
  busy,
}: {
  verification: ReturnType<typeof useEmailVerification>;
  busy: boolean;
}) {
  const emailId = useId();
  const codeId = useId();
  const feedbackId = useId();
  const verified = verification.status === 'verified';
  const activeCode = verification.status === 'sent';
  return (
    <div>
      <div className="flex flex-col gap-[9px]">
        <label htmlFor={emailId} className="pl-4 font-medium leading-4">
          이메일
        </label>
        <div className="flex gap-[10px]">
          <Input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            required
            value={verification.email}
            onChange={(event) => verification.changeEmail(event.target.value)}
            disabled={busy}
            placeholder="example@email.com"
            className="min-w-0 flex-1 px-4"
            aria-describedby={verification.message ? feedbackId : undefined}
          />
          <Button
            variant="secondary"
            disabled={
              busy || verified || !isSignupEmailValid(verification.email)
            }
            onClick={verification.requestCode}
            className="w-[74px] shrink-0 whitespace-nowrap px-0!"
          >
            {verified ? '인증완료' : '인증하기'}
          </Button>
        </div>
      </div>
      <div className="mt-[22px] flex flex-col gap-[8px]">
        <label htmlFor={codeId} className="pl-4 font-medium leading-4">
          인증번호
        </label>
        <div className="flex gap-[10px]">
          <Input
            id={codeId}
            name="verification-code"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            value={verification.code}
            onChange={(event) =>
              verification.setCode(
                event.target.value.replace(/\D/g, '').slice(0, 6),
              )
            }
            disabled={busy || !activeCode}
            placeholder="인증번호 6자리 입력"
            className="min-w-0 flex-1 px-4"
            aria-describedby={feedbackId}
          />
          <Button
            disabled={
              busy || !activeCode || !isEmailCodeValid(verification.code)
            }
            onClick={verification.confirmCode}
            className="w-[74px] shrink-0 whitespace-nowrap px-0!"
          >
            확인
          </Button>
        </div>
      </div>
      <div className="mt-[7px] flex min-h-[12px] items-center justify-between pl-4 pr-[5px] text-[10px] font-light leading-3">
        <span
          className={
            verified
              ? 'text-[var(--onnode-primary-600)]'
              : 'text-[var(--onnode-danger)]'
          }
        >
          {verified
            ? '인증이 완료됐어요'
            : `남은시간 ${formatVerificationTime(verification.seconds)}`}
        </span>
        <button
          type="button"
          disabled={busy || verified || verification.status === 'idle'}
          onClick={verification.requestCode}
          className="hover:underline disabled:cursor-not-allowed"
        >
          인증번호 재전송
        </button>
      </div>
      <p
        id={feedbackId}
        role={verification.message ? 'alert' : undefined}
        className={
          verification.message
            ? 'mt-2 pl-4 text-[11px] text-[var(--onnode-danger)]'
            : 'sr-only'
        }
      >
        {verification.message || '인증번호는 발송 후 3분 동안 유효합니다.'}
      </p>
    </div>
  );
}
