'use client';

import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import AuthLayout from './AuthLayout';
import AuthField from './AuthField';
import { BackToLogin, RecoveryFace, RecoveryHeading, RecoveryLinkButton } from './RecoveryParts';
import { RESET_LINK_TTL_MINUTES } from './passwordRecovery';
import { usePasswordResetConfirm } from './usePasswordResetConfirm';

export default function PasswordResetPanel() {
  const token = useSearchParams().get('token') ?? '';
  const form = usePasswordResetConfirm(token);
  const { state } = form;

  if (state.status === 'invalid') {
    return (
      <AuthLayout recovery>
        <RecoveryFace asleep />
        <RecoveryHeading title="링크가 만료됐어요">
          재설정 링크 유효 시간({RESET_LINK_TTL_MINUTES}분)이 지났어요. 다시 요청해주세요
        </RecoveryHeading>
        <RecoveryLinkButton href="/forgot-password" className="mt-[26px]">재설정 링크 다시 받기</RecoveryLinkButton>
        <BackToLogin className="mt-[26px]" />
      </AuthLayout>
    );
  }

  if (state.status === 'done') {
    return (
      <AuthLayout recovery>
        <RecoveryFace />
        <RecoveryHeading title="비밀번호가 변경됐어요">새 비밀번호로 다시 로그인해주세요</RecoveryHeading>
        <RecoveryLinkButton href="/login" className="mt-[26px]">로그인하러 가기</RecoveryLinkButton>
      </AuthLayout>
    );
  }

  const message = state.status === 'error' ? state.message : '';
  return (
    <AuthLayout recovery reset>
      <h1 className="mt-[42px] text-center text-[20px] font-bold leading-6 text-[var(--onnode-text)]">새 비밀번호로 다시 시작해요</h1>
      <p className="mt-[11px] text-center text-[13px] font-medium leading-[14px]">안전을 위해 이전에 사용하지 않은 비밀번호를 설정해주세요.</p>
      <form onSubmit={form.submit} noValidate aria-busy={form.isSubmitting} className="mt-[26px]">
        <fieldset disabled={form.isSubmitting} className="flex flex-col gap-[24px]">
          <AuthField
            label="비밀번호"
            type="password"
            name="newPassword"
            autoComplete="new-password"
            placeholder="새 비밀번호를 입력하세요"
            hint="영문, 숫자, 특수문자를 포함해 8자 이상"
            labelInset="recovery"
            value={form.password}
            onChange={(event) => form.setPassword(event.target.value)}
          />
          <AuthField
            label="비밀번호 확인"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="비밀번호를 한번 더 입력하세요"
            labelInset="recovery"
            value={form.confirmation}
            invalid={form.mismatch}
            hint={form.mismatch ? '비밀번호가 일치하지 않습니다' : undefined}
            onChange={(event) => form.setConfirmation(event.target.value)}
          />
        </fieldset>
        {message && <p role="alert" className="mt-[14px] pl-[19px] text-[10px] leading-[12px] text-[var(--onnode-danger)]">{message}</p>}
        <Button type="submit" loading={form.isSubmitting} disabled={!form.valid} className="mt-[38px] w-full">
          {form.isSubmitting ? '변경 중...' : '비밀번호 변경하기'}
        </Button>
      </form>
      <div className="h-[22px]" />
    </AuthLayout>
  );
}
