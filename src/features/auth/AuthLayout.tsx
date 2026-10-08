'use client';

import Image from 'next/image';
import localFont from 'next/font/local';
import { useRef, type ReactNode } from 'react';
import AuthBackground from './AuthBackground';
import SignupBackground from './SignupBackground';

const pretendard = localFont({
  src: '../../../public/onnode/fonts/PretendardVariable.woff2',
  variable: '--font-onnode',
  display: 'swap',
  weight: '100 900',
});

/*
 * CONTEXT
 * - Problem      : 회원가입 카드는 뷰포트보다 길어 스크롤이 필요하다.
 * - Why          : 회원가입에서 화면은 고정하고 카드 내부만 스크롤한다.
 * - Alternatives : 별도 미리보기 경로는 실제 진입 화면과 달라진다.
 * - Trade-offs   : 로그인 배치는 유지하고 회원가입 배치만 분기한다.
 * - Edge Case    : 작은 화면에서도 푸터가 입력 영역을 가리지 않는다.
 */
export default function AuthLayout({
  children,
  recovery = false,
  reset = false,
  error = false,
  signup = false,
  cardClassName,
  background,
  logoSrc = '/onnode/auth/imgGroup268.svg',
}: {
  children: ReactNode;
  recovery?: boolean;
  reset?: boolean;
  error?: boolean;
  signup?: boolean;
  cardClassName?: string;
  background?: ReactNode;
  logoSrc?: string;
}) {
  const scrollContainer = useRef<HTMLDivElement>(null);
  const scrollContent = useRef<HTMLDivElement>(null);
  const content = (
    <>
      <Image
        src={logoSrc}
        width={116.811}
        height={22.2767}
        alt="On:Node"
        className="mx-auto"
        unoptimized
        preload
      />
      {children}
    </>
  );
  return (
    <main
      lang="ko"
      className={`onnode-auth ${pretendard.variable} ${signup ? 'fixed inset-0 h-dvh py-[50px]' : 'relative min-h-dvh py-12'} flex flex-col items-center justify-center overflow-hidden bg-[image:var(--onnode-auth-gradient)] px-6`}
    >
      {background ?? (signup ? (
        <SignupBackground container={scrollContainer} content={scrollContent} />
      ) : (
        <AuthBackground recovery={recovery} error={error} />
      ))}
      <section
        aria-label="계정"
        className={`relative z-10 w-full max-w-[490px] bg-[var(--onnode-surface)] shadow-[var(--onnode-card-shadow)] ${cardClassName ?? (signup ? 'min-h-0 overflow-hidden' : `px-[min(5vw,64px)] ${recovery ? (reset ? 'pt-[51px] pb-[46px] min-[900px]:translate-y-[19px]' : 'pt-[51px] pb-[55px] min-[900px]:-translate-y-[7px]') : 'pt-[55px] pb-[39px] min-[1280px]:pr-[63px]'}`)} ${error ? 'rounded-[10px]' : 'rounded-[20px]'}`}
      >
        {signup ? (
          <div
            ref={scrollContainer}
            tabIndex={0}
            role="region"
            aria-label="회원가입 입력"
            className="relative max-h-[calc(100dvh-100px)] overflow-y-auto overscroll-contain [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--onnode-primary)]"
          >
            <div
              ref={scrollContent}
              className="relative px-[min(5vw,64px)] pt-[51px] pb-[52px] min-[1280px]:pl-[63px]"
            >
              {content}
            </div>
          </div>
        ) : (
          content
        )}
      </section>
      <p
        className={`absolute bottom-[4.625%] ${signup ? '' : 'max-[600px]:static max-[600px]:mt-6'} z-10 text-center text-[10px] font-thin leading-[12px] text-[var(--onnode-text-tertiary)]`}
      >
        © 2026 On:Node All rights reserved
      </p>
    </main>
  );
}
