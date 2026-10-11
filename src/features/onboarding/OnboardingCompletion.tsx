'use client';

import Image from 'next/image';
import AuthLayout from '@/features/auth/AuthLayout';
import Button from '@/components/ui/Button';
import { OnboardingCompletionBackground } from './OnboardingBackground';
import { useOnboardingWorkspace } from './useOnboardingWorkspace';

export default function OnboardingCompletion({ nickname }: { nickname: string }) {
  const workspace = useOnboardingWorkspace();
  return (
    <AuthLayout logoSrc="/onnode/onboarding/74281.svg" background={<OnboardingCompletionBackground />}
      cardClassName="px-[min(5vw,63px)] pt-[51px] pb-[53px]">
      <p className="mt-[13px] text-center leading-[13px]">Just say it, We’ll node it.</p>
      <div className="relative mx-auto mt-[31px] size-14">
        <Image src="/onnode/onboarding/0d3f9.svg" width={56} height={56} alt="" unoptimized />
        <span className="absolute left-[17px] top-[23px] h-[10px] w-[6.667px] rounded-[5px] bg-black" />
        <span className="absolute left-[33.67px] top-[23px] h-[10px] w-[6.667px] rounded-[5px] bg-black" />
      </div>
      <h1 className="mt-[13px] text-center text-[20px] font-bold leading-6 text-[var(--onnode-text)]">{nickname.trim()}님, 준비됐어요!</h1>
      <p className="mt-[10px] text-center leading-[1.2] min-[600px]:-mx-3">첫 프로젝트를 만들고 다음 회의부터 논의를 노드로 정리해보세요</p>
      <div className="mt-[25px] flex flex-col gap-[17px]">
        <Button loading={workspace.busy} disabled={workspace.busy} onClick={() => void workspace.enter(true)} className="w-full">첫 프로젝트 만들기</Button>
        <Button variant="secondary" disabled={workspace.busy} onClick={() => void workspace.enter(false)} className="w-full text-[var(--onnode-primary)]">나중에 할게요</Button>
      </div>
      {workspace.error && <p role="alert" className="mt-3 text-[11px] text-[var(--onnode-danger)]">{workspace.error}</p>}
    </AuthLayout>
  );
}
