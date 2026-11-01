import LandingLogo from '../LandingLogo';
import { FOOTER_COLUMNS, INSTAGRAM_URL } from '../footerLinks';

const LINK_CLASS = 'text-[var(--landing-text-muted)] hover:text-[var(--landing-text)]';

export default function LandingFooter() {
  return (
    <footer className="bg-[var(--landing-surface-pale)] pt-[68px] pb-[51px]">
      <div className="mx-auto w-[calc(100%-48px)] max-w-[1192px]">
        <div className="flex items-start justify-between gap-10 text-[13.8px] leading-[1.5]">
          <div className="w-[255px] shrink-0 pt-[10.4px]">
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
              className={`mt-[13.2px] block w-fit whitespace-pre ${LINK_CLASS}`}
            >
              {'Instagram  @onnode.official'}
            </a>
          </div>
          <nav aria-label="푸터 메뉴" className="flex gap-[85.1px] whitespace-nowrap">
            {FOOTER_COLUMNS.map(({ title, links }) => (
              <div key={title} className="flex flex-col gap-[12.8px]">
                <p className="font-bold text-[var(--landing-text)]">{title}</p>
                {links.map(({ label, href }) => (
                  <a key={label} href={href} className={LINK_CLASS}>
                    {label}
                  </a>
                ))}
              </div>
            ))}
          </nav>
        </div>
        <hr className="mt-[43.9px] border-0 border-t border-[var(--landing-divider)]" />
        <p className="mt-[42.6px] text-[12.8px] leading-[1.5] text-[var(--landing-text-muted)]">© 2026 On:Node. All rights reserved.</p>
      </div>
    </footer>
  );
}
