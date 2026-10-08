'use client';

import Image from 'next/image';
import Button from '@/components/ui/Button';
import AuthLayout from './AuthLayout';
import AuthField from './AuthField';
import SignupAgreements from './SignupAgreements';
import SignupEmailFields from './SignupEmailFields';
import { useSignupForm } from './useSignupForm';
import type { SignupFormValues } from './signupRules';

export default function SignupScreen({
  onBack,
  checking,
  onSignup,
}: {
  onBack: () => void;
  checking: boolean;
  onSignup?: (values: SignupFormValues) => Promise<void>;
}) {
  const form = useSignupForm(onSignup);
  const busy = checking || form.busy;
  return (
    <AuthLayout signup>
      <h1 className="sr-only">회원가입</h1>
      <p className="mt-[21px] text-center font-medium leading-4">
        몇 가지 정보만 입력하면 시작할 수 있어요
      </p>
      <form onSubmit={form.submit} aria-busy={form.busy} className="mt-[17px]">
        <fieldset disabled={busy} className="flex flex-col gap-[22px]">
          <SignupEmailFields verification={form.verification} busy={busy} />
          <AuthField
            label="비밀번호"
            labelInset="signup"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="비밀번호를 입력하세요"
            required
            minLength={8}
            value={form.password}
            onChange={(event) => form.setPassword(event.target.value)}
            invalid={Boolean(form.password) && !form.passwordValid}
            hint="영문, 숫자, 특수문자를 포함해 8자 이상"
          />
          <AuthField
            label="비밀번호 확인"
            labelInset="signup"
            type="password"
            name="password-confirm"
            autoComplete="new-password"
            placeholder="비밀번호를 한 번 더 입력하세요"
            required
            value={form.confirm}
            onChange={(event) => form.setConfirm(event.target.value)}
            invalid={form.confirmInvalid}
            hint={
              form.confirmInvalid ? '비밀번호가 일치하지 않습니다' : undefined
            }
          />
          <SignupAgreements
            value={form.agreements}
            onChange={form.setAgreements}
          />
          {form.message && (
            <p role="alert" className="text-[11px] text-[var(--onnode-danger)]">
              {form.message}
            </p>
          )}
          <Button
            type="submit"
            disabled={!form.canSubmit}
            loading={form.submitting}
            className="w-full"
          >
            가입하기
          </Button>
        </fieldset>
        <div className="my-[9px] flex items-center gap-[13px] text-[10px] leading-[11px] text-[var(--onnode-border)]">
          <span className="h-px flex-1 bg-[var(--onnode-border)]" />
          또는
          <span className="h-px flex-1 bg-[var(--onnode-border)]" />
        </div>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={form.startGoogleLogin}
          className="w-full"
        >
          <Image
            src="/onnode/auth/google-logo.png"
            width={20}
            height={20}
            alt=""
            unoptimized
            className="size-5 shrink-0 object-contain"
          />
          구글로 계속하기
        </Button>
      </form>
      <p className="mt-[37px] text-center font-medium leading-4">
        이미 계정이 있으신가요?{' '}
        <button
          type="button"
          disabled={busy}
          onClick={onBack}
          className="text-[var(--onnode-text)] underline"
        >
          로그인
        </button>
      </p>
    </AuthLayout>
  );
}
