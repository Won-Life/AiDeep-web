'use client';

import Image from 'next/image';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { PRIVACY_URL, TERMS_URL } from '@/lib/legalLinks';
import AuthLayout from './AuthLayout';
import AuthField from './AuthField';
import { useLoginForm } from './useLoginForm';

export default function LoginScreen({ onSignup, checking }: { onSignup: () => void; checking: boolean }) {
  const form = useLoginForm();
  return (
    <AuthLayout error={form.state.status === 'error' || form.locked}>
      <h1 className="sr-only">로그인</h1>
      <p className="mt-[13px] text-center font-medium leading-[13.07px]">Just say it, We’ll node it.</p>
      <div className="mt-[15px] flex min-h-[28px] items-center justify-center">
        {form.state.message && <p id="login-error" role="alert" className="w-full whitespace-pre-line rounded-[20px] bg-[var(--onnode-danger-surface)] px-3 py-[6px] text-center text-[13px] leading-4 text-[var(--onnode-danger)]">{form.state.message}</p>}
      </div>
      <form onSubmit={form.submit} className="mt-[17px]" aria-busy={form.isSubmitting}>
        <fieldset disabled={checking || form.isSubmitting} className="flex flex-col gap-[17px]">
          <AuthField label="이메일" type="email" autoComplete="username" name="email" required placeholder="example@email.com"
            value={form.email} onChange={(event) => form.setEmail(event.target.value)} aria-describedby={form.state.message ? 'login-error' : undefined} />
          <AuthField label="비밀번호" type="password" autoComplete="current-password" name="password" required placeholder="비밀번호"
            value={form.password} onChange={(event) => form.setPassword(event.target.value)} aria-describedby={form.state.message ? 'login-error' : undefined} />
          <div className="mt-1 flex items-center justify-between gap-2 text-[13px] font-medium leading-[17px]">
            <label className="flex cursor-pointer items-center gap-2">
              <span className="relative flex size-4 shrink-0 items-center justify-center">
                <input type="checkbox" checked={form.remember} onChange={(event) => form.setRemember(event.target.checked)} className="peer size-4 appearance-none rounded-[5px] border border-[var(--onnode-primary)] checked:bg-[var(--onnode-primary)] focus-visible:outline-2 focus-visible:outline-offset-2" />
                <Image src="/onnode/auth/imgCheck.svg" width={16} height={16} alt="" unoptimized className="pointer-events-none absolute hidden peer-checked:block" />
              </span>
              로그인 상태 유지
            </label>
            {checking || form.isSubmitting ? (
              <span aria-disabled="true" className="cursor-not-allowed">비밀번호를 잊으셨나요?</span>
            ) : (
              <Link href="/forgot-password" className="hover:underline">비밀번호를 잊으셨나요?</Link>
            )}
          </div>
          <Button type="submit" loading={form.isSubmitting} disabled={form.locked}
            className={`mt-[17px] w-full ${form.locked ? 'bg-[var(--onnode-text-tertiary)]! opacity-100!' : ''}`}>{form.isSubmitting ? '로그인 중...' : '로그인'}</Button>
        </fieldset>
        <div className="my-[9px] flex items-center gap-[13px] text-[10px] leading-[11px] text-[var(--onnode-border)]"><span className="h-px flex-1 bg-[var(--onnode-border)]" />또는<span className="h-px flex-1 bg-[var(--onnode-border)]" /></div>
        <Button variant="secondary" className="w-full" disabled={checking || form.isSubmitting} onClick={form.startGoogleLogin}>
          <Image src="/onnode/auth/google-logo.png" width={20} height={20} alt="" unoptimized className="size-5 shrink-0 object-contain" />구글로 계속하기
        </Button>
      </form>
      <p className="mt-[37px] text-center font-medium leading-[14px]">계정이 없으신가요? <button type="button" onClick={onSignup} disabled={checking || form.isSubmitting} className="hover:underline">회원가입</button></p>
      <nav aria-label="이용 정책" className="mt-[15px] flex justify-center gap-[46px] text-[10px] font-thin leading-[11px] text-[var(--onnode-text-tertiary)]">
        <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">이용약관</a><a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">개인정보처리방침</a>
      </nav>
    </AuthLayout>
  );
}
