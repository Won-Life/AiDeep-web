'use client';

import Image from 'next/image';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import AuthBackground from './AuthBackground';

const pretendard = localFont({ src: '../../../public/onnode/fonts/PretendardVariable.woff2', variable: '--font-onnode', display: 'swap', weight: '100 900' });

export default function AuthLayout({ children, recovery = false, reset = false, error = false }: { children: ReactNode; recovery?: boolean; reset?: boolean; error?: boolean }) {
  return (
    <main lang="ko" className={`onnode-auth ${pretendard.variable} relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[image:var(--onnode-auth-gradient)] px-6 py-12`}>
      <AuthBackground recovery={recovery} error={error} />
      <section aria-label="계정" className={`relative z-10 w-full max-w-[490px] bg-[var(--onnode-surface)] px-[min(5vw,64px)] shadow-[var(--onnode-card-shadow)] ${recovery ? (reset ? 'pt-[51px] pb-[46px] min-[900px]:translate-y-[19px]' : 'pt-[51px] pb-[55px] min-[900px]:-translate-y-[7px]') : 'pt-[55px] pb-[39px] min-[1280px]:pr-[63px]'} ${error ? 'rounded-[10px]' : 'rounded-[20px]'}`}>
        <Image src="/onnode/auth/imgGroup268.svg" width={116.811} height={22.2767} alt="On:Node" className="mx-auto" unoptimized preload />
        {children}
      </section>
      <p className="absolute bottom-[4.625%] z-10 text-center text-[10px] font-thin leading-[12px] text-[var(--onnode-text-tertiary)] max-[600px]:static max-[600px]:mt-6">© 2026 On:Node All rights reserved</p>
    </main>
  );
}
