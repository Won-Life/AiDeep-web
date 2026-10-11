'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';
import AuthLayout from './AuthLayout';
import AuthField from './AuthField';
import { BackToLogin, RecoveryFace, RecoveryHeading, RecoveryLinkButton } from './RecoveryParts';
import { RESET_LINK_TTL_MINUTES, getMailboxUrl } from './passwordRecovery';
import { usePasswordResetRequest } from './usePasswordResetRequest';

export default function PasswordRequestPanel() {
  const form = usePasswordResetRequest();
  const { state } = form;

  if (state.status === 'sent') {
    return (
      <AuthLayout recovery>
        <RecoveryFace />
        <RecoveryHeading title="이메일을 확인해주세요">
          <span className="break-all">{form.email.trim()}</span> 으로 재설정 링크를 보내드렸어요
        </RecoveryHeading>
        <RecoveryLinkButton href={getMailboxUrl(form.email)} external className="mt-[26px]">메일함 열기</RecoveryLinkButton>
        <p className="mt-[17px] text-center leading-[14px]">
          이메일을 못 받으셨나요?{' '}
          <button type="button" onClick={form.resend} disabled={form.isSubmitting} className="font-semibold underline">재전송</button>
        </p>
        <BackToLogin className="mt-[26px]" />
        <p className="mt-[28px] text-center text-[10px] font-light leading-[13px] text-[var(--onnode-text-tertiary)]">
          재설정 링크는 {RESET_LINK_TTL_MINUTES}분동안 유효합니다.<br />메일이 없다면 스팸함도 확인해보세요
        </p>
        {form.resent && (
          <p role="status" className="fixed bottom-[12%] left-1/2 z-20 -translate-x-1/2 rounded-full bg-[var(--onnode-primary-600)] px-4 py-2 text-[11px] font-semibold text-[var(--onnode-neutral-white)] shadow-[var(--onnode-card-shadow)]">
            ✓ 재설정 링크를 다시 보냈어요
          </p>
        )}
      </AuthLayout>
    );
  }

  const notFound = state.status === 'not-found';
  const message = state.status === 'error' ? state.message : '';
  return (
    <AuthLayout recovery>
      <h1 className="mt-[42px] text-center text-[20px] font-bold leading-6 text-[var(--onnode-text)]">비밀번호가 기억나지 않으세요?</h1>
      <p className="mt-[11px] text-center text-[13px] font-medium leading-[14px]">가입하신 이메일만 알려주시면 재설정 링크를 바로 보내드릴게요.</p>
      <form
        onSubmit={(event) => { event.preventDefault(); form.submit(); }}
        noValidate
        aria-busy={form.isSubmitting}
        className="mt-[42px]"
      >
        <fieldset disabled={form.isSubmitting} className="flex flex-col">
          <AuthField
            label="이메일"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="example@email.com"
            labelInset="recovery"
            value={form.email}
            invalid={notFound}
            onChange={(event) => form.changeEmail(event.target.value)}
            aria-describedby={notFound || message ? 'recovery-feedback' : undefined}
          />
          {notFound && (
            <p id="recovery-feedback" role="alert" className="mt-[7px] pl-[19px] text-[10px] leading-[12px] text-[var(--onnode-danger)]">
              가입되지 않은 이메일이에요.{' '}
              <Link href="/login?mode=signup" className="font-semibold underline">회원가입하기→</Link>
            </p>
          )}
          {message && <p id="recovery-feedback" role="alert" className="mt-[7px] pl-[19px] text-[10px] leading-[12px] text-[var(--onnode-danger)]">{message}</p>}
          <Button type="submit" loading={form.isSubmitting} disabled={!form.canSubmit} className="mt-[21px] w-full">
            {form.isSubmitting ? '보내는 중...' : '재설정 링크 보내기'}
          </Button>
        </fieldset>
      </form>
      <BackToLogin className="mt-[60px]" />
    </AuthLayout>
  );
}
