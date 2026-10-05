'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';
import AuthLayout from './AuthLayout';
import AuthField from './AuthField';

export default function PasswordRecoveryScreen({ reset = false }: { reset?: boolean }) {
  return (
    <AuthLayout recovery reset={reset}>
      <h1 className="mt-[42px] text-center text-[20px] font-bold leading-6 text-[var(--onnode-text)]">{reset ? '새 비밀번호로 다시 시작해요' : '비밀번호가 기억나지 않으세요?'}</h1>
      <p className="mt-[11px] text-center text-[13px] font-medium leading-[14px]">{reset ? '안전을 위해 이전에 사용하지 않은 비밀번호를 설정해주세요.' : '가입하신 이메일만 알려주시면 재설정 링크를 바로 보내드릴게요.'}</p>
      <form onSubmit={(event) => event.preventDefault()} className={reset ? 'mt-[26px]' : 'mt-[42px]'}>
        {reset ? (
          <div className="flex flex-col gap-[24px]">
            <AuthField label="비밀번호" type="password" autoComplete="new-password" placeholder="새 비밀번호를 입력하세요" hint="영문, 숫자, 특수문자를 포함해 8자 이상" labelInset="recovery" />
            <AuthField label="비밀번호 확인" type="password" autoComplete="new-password" placeholder="비밀번호를 한번 더 입력하세요" labelInset="recovery" />
          </div>
        ) : <AuthField label="이메일" type="email" autoComplete="email" placeholder="example@email.com" labelInset="recovery" />}
        <Button type="submit" className={`w-full ${reset ? 'mt-[38px]' : 'mt-[21px]'}`}>{reset ? '비밀번호 변경하기' : '재설정 링크 보내기'}</Button>
      </form>
      {!reset && <p className="mt-[60px] text-center leading-[14px]"><Link href="/login" className="hover:underline">← 로그인으로 돌아가기</Link></p>}
      {reset && <div className="h-[22px]" />}
    </AuthLayout>
  );
}
