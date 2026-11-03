'use client';

import { useRef, useState } from 'react';
import { useDismissable } from '@/hooks/useDismissable';
import GraphOnboardingModal from '@/components/ui/GraphOnboardingModal';
import { BugReportModal } from '@/components/layout/BugReportButton';
import { TERMS_URL, PRIVACY_URL } from '@/lib/legalLinks';
import { SidebarIcon } from './SidebarParts';

const APP_VERSION_LABEL = 'On:Node v1.0';

/*
 * CONTEXT
 * - Problem      : 도움말 팝업이 시안(설명 줄 · 구분선 · 버전)과 다르고 Esc로 닫히지 않았다.
 * - Why          : 열린 동안만 Esc를 듣고, 닫히면 도움말 버튼으로 포커스를 돌려 키보드 흐름을 잇는다.
 * - Alternatives : 전체 화면 투명 버튼으로 바깥 클릭을 받던 방식 → 포커스 순서에 끼어들어 mousedown 감지로 교체.
 * - Trade-offs   : 문서 리스너 두 개가 열린 동안만 붙는다.
 * - Edge Case    : 모달(온보딩·피드백)을 연 뒤에는 팝업을 먼저 닫아 Esc가 모달로 넘어간다.
 */
export default function SidebarHelp({ collapsed = false }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useDismissable({ open, onClose: () => setOpen(false), rootRef, restoreFocusRef: triggerRef });

  const choose = (action: () => void) => () => { setOpen(false); action(); };
  const itemClass = 'block w-full text-left outline-none focus-visible:underline';

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="도움말"
        className={`relative flex h-[44px] w-full items-center gap-3 text-[13.4px] text-[#727272] ${collapsed ? 'justify-center' : 'px-6'} ${open ? 'bg-main-blue-pale' : ''}`}
      >
        {open && <span aria-hidden className="absolute top-1/2 left-0 h-[30px] w-[5px] -translate-y-1/2 rounded-r-[3px] bg-[#748dfd]" />}
        <span className="relative flex size-[21px] shrink-0 items-center justify-center">
          <SidebarIcon name="help" width={21} className="absolute inset-0" />
          <span aria-hidden className="relative text-[13px] leading-none font-bold text-[#748dfd]">?</span>
        </span>
        {!collapsed && '도움말'}
      </button>
      {open && (
        <div role="menu" aria-label="도움말" className="absolute bottom-0 left-full z-50 ml-2 w-[232px] rounded-[20px] border border-[#5679f4] bg-background px-5 py-4 shadow-[0_2px_8.4px_#b7bcd3]">
          <button type="button" role="menuitem" autoFocus onClick={choose(() => setGuide(true))} className={`${itemClass} mb-3`}>
            <span className="block text-[13px] font-bold text-main-blue-deep">온보딩 다시 보기</span>
            <span className="block text-[11px] text-[#727272]">노드 구조와 녹음 방법 안내</span>
          </button>
          <button type="button" role="menuitem" onClick={choose(() => setFeedback(true))} className={`${itemClass} mb-3`}>
            <span className="block text-[13px] font-bold text-main-blue-deep">문의 · 피드백 보내기</span>
            <span className="block text-[11px] text-[#727272]">불편한 점이나 아이디어를 알려주세요</span>
          </button>
          <p className="text-[11px] text-[#727272]">
            <a role="menuitem" href={TERMS_URL} target="_blank" rel="noreferrer" className="outline-none focus-visible:underline">이용약관</a>
            {' · '}
            <a role="menuitem" href={PRIVACY_URL} target="_blank" rel="noreferrer" className="outline-none focus-visible:underline">개인정보처리방침</a>
          </p>
          <div className="my-2 border-t-2 border-main-blue-pale" />
          <p className="text-[11px] text-[#c4c4c4]">{APP_VERSION_LABEL}</p>
        </div>
      )}
      <GraphOnboardingModal open={guide} onClose={() => setGuide(false)} />
      <BugReportModal open={feedback} onClose={() => setFeedback(false)} />
    </div>
  );
}
