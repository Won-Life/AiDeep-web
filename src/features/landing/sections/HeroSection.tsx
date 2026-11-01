import Image from 'next/image';
import LandingButton from '../LandingButton';
import LandingSection from '../LandingSection';
import { INTRO_ID, LOGIN_PATH } from '../landingNav';

export default function HeroSection() {
  return (
    <LandingSection className="pt-[91px] pb-[100px]">
      <div className="flex flex-col items-center text-center">
        <p className="rounded-[100px] border border-[var(--landing-primary)] bg-white px-[14px] py-[6px] text-[14px] font-medium leading-[1.5] text-[var(--landing-primary)]">
          AI 회의 구조화 서비스
        </p>
        <h1 className="mt-[18px] text-[56px] leading-[1.3] font-bold text-[var(--landing-text)]">
          회의는 말로,
          <br />
          정리는 On:Node가
        </h1>
        <p className="mt-[9px] text-[20px] leading-[1.5] text-[var(--landing-text-muted)]">
          Zoom · Google Meet 회의를 녹음하면 AI가 노드로 정리하고,
          <br />
          프로젝트별 마인드맵으로 한눈에 보여드려요.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <LandingButton href={LOGIN_PATH}>무료로 시작하기</LandingButton>
          <LandingButton href={`#${INTRO_ID}`} variant="secondary">서비스 둘러보기</LandingButton>
        </div>
        <p className="mt-7 text-[16px] leading-[1.5] text-[var(--landing-text-muted)]">
          가입하고 회의당 최대 30분 무료로 녹음해 보세요
        </p>
        <p className="mt-[2px] text-[17px] leading-[1.5] font-medium text-[var(--landing-primary)]">
          Just say it. We&apos;ll node it.
        </p>
        <Image
          src="/onnode/landing/hero-visual.png"
          alt="프로젝트, 타이틀, 콘텐츠 노드가 이어진 On:Node 마인드맵 화면"
          width={1040}
          height={480}
          priority
          className="mt-[29px] h-[480px] w-[1040px] max-w-none"
        />
      </div>
    </LandingSection>
  );
}
