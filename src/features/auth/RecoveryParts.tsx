'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export function RecoveryFace({ asleep = false }: { asleep?: boolean }) {
  return (
    <div aria-hidden="true" className="mx-auto mt-[22px] flex size-10 items-center justify-center gap-[7px] rounded-full bg-[var(--onnode-primary-200)]">
      {[0, 1].map((eye) => asleep
        ? <span key={eye} className="h-[2px] w-[6px] rounded-full bg-[var(--onnode-text)]" />
        : <span key={eye} className="h-[8px] w-[5px] rounded-full bg-[var(--onnode-text)]" />)}
    </div>
  );
}

export function RecoveryHeading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h1 className="mt-[14px] text-center text-[20px] font-bold leading-6 text-[var(--onnode-text)]">{title}</h1>
      <p className="mt-[11px] text-center text-[13px] font-medium leading-[18px]">{children}</p>
    </>
  );
}

const LINK_BUTTON =
  'inline-flex h-[42px] w-full items-center justify-center rounded-[20px] bg-[var(--onnode-primary)] px-6 text-[13px] font-semibold text-[var(--onnode-neutral-white)] transition-colors hover:bg-[var(--onnode-primary-500)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--onnode-primary-700)]';

export function RecoveryLinkButton({ href, external = false, className = '', children }: {
  href: string;
  external?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return external
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={`${LINK_BUTTON} ${className}`}>{children}</a>
    : <Link href={href} className={`${LINK_BUTTON} ${className}`}>{children}</Link>;
}

export function BackToLogin({ className = '' }: { className?: string }) {
  return <p className={`text-center leading-[14px] ${className}`}><Link href="/login" className="hover:underline">← 로그인으로 돌아가기</Link></p>;
}
