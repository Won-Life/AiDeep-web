import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import LandingLogo from '@/features/landing/LandingLogo';
import { AGREEMENTS, type AgreementKey } from './agreements';

/*
 * 약관 전문을 주소가 있는 정적 페이지로 보여 준다. 본문은 가입 흐름의 팝업과 같은 Markdown을 쓴다.
 * 서버에서 그려 내려보내므로 클라이언트 번들에는 본문이 더해지지 않는다.
 */
const DOCUMENT_CLASS =
  'text-[15px] leading-[1.7] text-[var(--landing-text)] [&_h1]:mb-6 [&_h1]:text-[28px] [&_h1]:leading-[1.4] [&_h1]:font-bold [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-[19px] [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-bold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_hr]:my-8 [&_hr]:border-[var(--landing-divider)] [&_a]:break-all [&_a]:text-[var(--landing-primary-deep)] [&_a]:underline [&_th]:border [&_th]:border-[var(--landing-divider)] [&_th]:bg-[var(--landing-guide-bg)] [&_th]:p-3 [&_th]:text-left [&_td]:border [&_td]:border-[var(--landing-divider)] [&_td]:p-3 [&_td]:align-top';

export default function LegalDocument({ agreement }: { agreement: AgreementKey }) {
  const { markdown } = AGREEMENTS[agreement];
  return (
    <div className="landing min-h-screen bg-white">
      <header className="border-b border-[var(--landing-divider)]">
        <div className="mx-auto flex h-[72px] w-full max-w-[860px] items-center px-6">
          <Link href="/" aria-label="On:Node 처음으로">
            <LandingLogo />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[860px] px-6 py-14">
        <article className={DOCUMENT_CLASS}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children }) => (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] border-collapse">{children}</table>
                </div>
              ),
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {markdown}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  );
}
