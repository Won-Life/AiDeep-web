import Link from 'next/link';
import LandingButton from '../LandingButton';
import LandingLogo from '../LandingLogo';
import { LOGIN_PATH, NAV_ITEMS } from '../landingNav';

export default function LandingNav() {
  return (
    <header className="sticky top-0 z-50 bg-white">
      <div className="mx-auto flex h-[92px] w-full max-w-[1440px] items-center pr-[161px] pl-[73px]">
        <Link href="/" aria-label="On:Node 처음으로">
          <LandingLogo />
        </Link>
        <nav aria-label="랜딩 메뉴" className="ml-[298px] flex items-center gap-10 text-[15px] leading-[1.5] text-[var(--landing-text-muted)]">
          {NAV_ITEMS.map(({ label, targetId }) => (
            <a key={targetId} href={`#${targetId}`} className="whitespace-nowrap hover:text-[var(--landing-text)]">
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-5">
          <Link href={LOGIN_PATH} className="text-[15px] font-medium leading-[1.5] whitespace-nowrap text-[var(--landing-text)]">
            로그인
          </Link>
          <LandingButton href={LOGIN_PATH}>무료로 시작하기</LandingButton>
        </div>
      </div>
    </header>
  );
}
