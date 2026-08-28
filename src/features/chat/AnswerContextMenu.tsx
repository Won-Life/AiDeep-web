'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ExportState } from './export/useAnswerImageExport';
import type { ShareLinkState } from './export/useAnswerShareLink';

/** 메뉴가 뷰포트 밖으로 삐져나가지 않도록 잡아두는 대략 치수. 가장 긴 문구 기준. */
const MENU_WIDTH = 212;
const MENU_HEIGHT = 96;
const VIEWPORT_GAP = 8;

const EXPORT_LABELS: Record<ExportState, string> = {
  idle: '이미지로 저장',
  working: '만드는 중…',
  error: '이미지를 만들지 못했어요',
};

const SHARE_LABELS: Record<ShareLinkState, string> = {
  idle: '공유 링크 복사',
  working: '만드는 중…',
  copied: '링크를 복사했어요',
  error: '링크를 만들지 못했어요',
};

interface AnswerContextMenuProps {
  x: number;
  y: number;
  exportState: ExportState;
  shareState: ShareLinkState;
  onExport: () => void;
  onShare: () => void;
  onClose: () => void;
}

const ITEM_CLASS =
  'flex items-center px-4 py-3 transition-colors hover:bg-surface-hover disabled:cursor-default disabled:hover:bg-transparent';

export default function AnswerContextMenu({
  x,
  y,
  exportState,
  shareState,
  onExport,
  onShare,
  onClose,
}: AnswerContextMenuProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    // capture 단계로 잡아야 패널 내부 스크롤에도 반응한다.
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  const isBusy = exportState === 'working' || shareState === 'working';
  const left = Math.min(x, window.innerWidth - MENU_WIDTH - VIEWPORT_GAP);
  const top = Math.min(y, window.innerHeight - MENU_HEIGHT - VIEWPORT_GAP);

  return createPortal(
    <>
      {/* 바깥 클릭(좌·우 모두)으로 닫기 */}
      <div
        className="fixed inset-0 z-[60]"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div
        role="menu"
        className="fixed z-[61] flex w-max min-w-40 flex-col rounded-xl border border-border bg-background py-1 shadow-md"
        style={{ left, top }}
      >
        <button type="button" role="menuitem" disabled={isBusy} onClick={onShare} className={ITEM_CLASS}>
          <span className={`typo-cap2 whitespace-nowrap ${shareState === 'error' ? 'text-muted' : 'text-foreground'}`}>
            {SHARE_LABELS[shareState]}
          </span>
        </button>
        <button type="button" role="menuitem" disabled={isBusy} onClick={onExport} className={ITEM_CLASS}>
          <span className={`typo-cap2 whitespace-nowrap ${exportState === 'error' ? 'text-muted' : 'text-foreground'}`}>
            {EXPORT_LABELS[exportState]}
          </span>
        </button>
      </div>
    </>,
    document.body,
  );
}
