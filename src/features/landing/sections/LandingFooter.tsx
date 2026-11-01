import LandingLogo from '../LandingLogo';
import { FOOTER_SERVICE_LINKS, INSTAGRAM_URL } from '../landingNav';

export default function LandingFooter() {
  return (
    <footer className="bg-[var(--landing-surface-pale)] pt-[68px] pb-[51px]">
      <div className="mx-auto w-[calc(100%-48px)] max-w-[1192px]">
        <div className="flex items-start justify-between gap-10 text-[13.8px] leading-[1.5]">
          <div className="w-[255px] pt-[10.4px]">
            <LandingLogo />
            <p className="mt-[13.4px] text-[var(--landing-text-muted)]">
              회의 음성을 노드로 구조화하는
              <br />
              AI 회의록 서비스
            </p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-[13.2px] block w-fit whitespace-pre text-[var(--landing-text-muted)] hover:text-[var(--landing-text)]"
            >
              {'Instagram  @onnode.official'}
            </a>
          </div>
          <nav aria-label="푸터 메뉴" className="flex flex-col gap-[12.8px] whitespace-nowrap">
            <p className="font-bold text-[var(--landing-text)]">서비스</p>
            {FOOTER_SERVICE_LINKS.map(({ label, targetId }) => (
              <a key={targetId} href={`#${targetId}`} className="text-[var(--landing-text-muted)] hover:text-[var(--landing-text)]">
                {label}
              </a>
            ))}
          </nav>
        </div>
        <hr className="mt-[43.9px] border-0 border-t border-[var(--landing-divider)]" />
        <p className="mt-[42.6px] text-[12.8px] leading-[1.5] text-[var(--landing-text-muted)]">© 2026 On:Node. All rights reserved.</p>
      </div>
    </footer>
  );
}
