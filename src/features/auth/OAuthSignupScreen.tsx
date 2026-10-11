'use client';

import AuthLayout from './AuthLayout';
import SignupAgreements from './SignupAgreements';
import Button from '@/components/ui/Button';
import { useOAuthSignup } from './useOAuthSignup';

export default function OAuthSignupScreen({ ticket }: { ticket: string }) {
  const form = useOAuthSignup(ticket);
  return (
    <AuthLayout>
      <h1 className="mt-8 text-center text-[20px] font-bold text-[var(--onnode-text)]">구글로 시작하기</h1>
      <p className="mt-3 text-center">서비스 이용을 위한 약관에 동의해주세요</p>
      <form onSubmit={form.submit} className="mt-8" aria-busy={form.busy}>
        <fieldset disabled={form.busy || form.accountCreated}><SignupAgreements value={form.agreements} onChange={form.setAgreements} /></fieldset>
        {form.error && <p role="alert" className="mt-4 text-[11px] text-[var(--onnode-danger)]">{form.error}</p>}
        <Button type="submit" loading={form.busy} disabled={!form.agreements.terms || !form.agreements.privacy} className="mt-6 w-full">{form.accountCreated ? '계속하기' : '동의하고 계속하기'}</Button>
      </form>
    </AuthLayout>
  );
}
