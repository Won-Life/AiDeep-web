'use client';

import { useId } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { AGREEMENTS, type AgreementKey } from './legal/agreements';

/*
 * CONTEXT
 * - Problem      : 승인된 약관 전문을 가입 흐름에서 읽을 수 있어야 한다.
 * - Why          : 공용 dialog와 기존 Markdown 라이브러리로 스크롤/포커스를 재사용한다.
 * - Alternatives : 외부 링크 → 가입 맥락 이탈, HTML 삽입 → 불필요한 보안 부담.
 * - Trade-offs   : Figma 본문 상자는 유지하되 실제 긴 문서의 표와 줄바꿈을 지원한다.
 * - Edge Case    : 보기/X/Escape는 동의하지 않고 명시적 동의 버튼만 값을 변경한다.
 */
export default function AgreementModal({ agreement, onClose, onAgree }: {
  agreement: AgreementKey;
  onClose: () => void;
  onAgree: (key: AgreementKey) => void;
}) {
  const titleId = useId();
  const document = AGREEMENTS[agreement];
  return (
    <Modal isOpen onClose={onClose} labelledBy={titleId} size="lg"
      className="max-w-[561px]! shadow-[0_4px_30.2px_rgb(0_0_0/30%)]"
      overlayClassName="backdrop:backdrop-blur-sm"
      contentClassName="px-[min(5vw,33px)] pt-[33px] pb-[29px] min-[600px]:pr-[42px]"
      closeButtonClassName="right-[25px] top-[25px] text-[var(--onnode-text-tertiary)]">
      <h2 id={titleId} className="pr-7 text-[16px] font-semibold leading-[19px] text-[var(--onnode-text)]">{document.title}</h2>
      <div tabIndex={0} role="region" aria-label={`${document.title} 본문`}
        className="mt-[23px] h-[310px] max-h-[calc(100dvh-214px)] overflow-y-auto overscroll-contain rounded-[20px] bg-[var(--onnode-neutral-200)] px-[22px] py-[23px] text-[10px] leading-[1.5] text-[var(--onnode-text)] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-[var(--onnode-primary)] [&_h1]:mb-3 [&_h1]:text-[12px] [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-[12px] [&_h2]:font-semibold [&_h3]:my-2 [&_h3]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-1 [&_hr]:my-4 [&_hr]:border-[var(--onnode-border)] [&_a]:underline [&_a]:break-all [&_th]:border [&_th]:border-[var(--onnode-border)] [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-[var(--onnode-border)] [&_td]:p-2 [&_td]:align-top">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
          table: ({ children }) => <div className="overflow-x-auto"><table className="w-full min-w-[400px] border-collapse">{children}</table></div>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
        }}>{document.markdown}</ReactMarkdown>
      </div>
      <Button className="mt-5 w-full" onClick={() => onAgree(agreement)}>동의하고 닫기</Button>
    </Modal>
  );
}
