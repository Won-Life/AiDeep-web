import Link from 'next/link';
import type { ReactNode } from 'react';

type LandingButtonProps = {
  href: string;
  variant?: 'primary' | 'secondary';
  /** large는 마지막 호출 영역처럼 한 단계 키운 버튼(시안 비율 약 1.08배) */
  size?: 'default' | 'large';
  className?: string;
  children: ReactNode;
};

/*
 * 이동이 목적인 버튼. 공통 Button은 <button>만 지원해서, 링크로 열리는 랜딩 버튼은
 * 같은 모양(라운드 20, 파란 채움/테두리)을 앵커로 그린다.
 */
const variants = {
  primary: 'bg-[var(--landing-primary)] text-white hover:bg-[var(--landing-primary-deep)]',
  secondary: 'border border-[var(--landing-primary)] bg-white text-[var(--landing-primary)] hover:bg-[var(--landing-tint)]',
};

const sizes = {
  default: 'rounded-[20px] px-6 py-[14px] text-[16px]',
  large: 'rounded-[21.7px] px-[26.1px] py-[15.2px] text-[17.4px]',
};

export default function LandingButton({
  href,
  variant = 'primary',
  size = 'default',
  className = '',
  children,
}: LandingButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center font-medium leading-[1.5] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--landing-primary-deep)] ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
