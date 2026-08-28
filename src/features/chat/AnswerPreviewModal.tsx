'use client';

/*
 * CONTEXT
 * - Problem      : 우클릭 메뉴가 "이미지로 저장"이라는 글자만 보여줘서, 무엇이 저장되는지
 *                  눌러보기 전에는 알 수 없었다. 축제 현장에서 방문자가 바로 공유하려면
 *                  결과물이 먼저 보여야 한다.
 * - Why          : 우클릭 → 카드 미리보기 모달. 저장될 PNG와 화면에 보이는 카드가 같은 DOM이라
 *                  "보이는 그대로" 저장·공유된다.
 * - Alternatives : (1) 메뉴 유지 + 호버 썸네일 — 모바일 인앱 브라우저에 호버가 없어 기각
 *                  (2) 카드를 채팅 말풍선 안에 인라인 렌더 — 대화 흐름이 카드에 묻혀 기각
 * - Trade-offs   : 클릭이 한 단계 늘어나는 대신, 저장 전에 결과를 확인할 수 있다.
 * - Edge Case    : 카드는 540px 고정 폭이라 좁은 화면에서 넘친다. transform: scale로 줄여
 *                  보여주되 캡처 대상 노드(cardRef)는 원래 크기 그대로 둔다 —
 *                  html-to-image는 node.offsetWidth로 크기를 잡고 조상의 transform은 복제하지
 *                  않으므로, 축소해 보여줘도 PNG는 항상 1080px 폭으로 나온다.
 */

import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import FestivalAnswerCard, { CARD_WIDTH } from '@/features/festival/FestivalAnswerCard';
import type { ExportState } from './export/useAnswerImageExport';
import type { ShareLinkState } from './export/useAnswerShareLink';

const EXPORT_LABELS: Record<ExportState, string> = {
  idle: '이미지로 저장',
  working: '만드는 중…',
  saved: '저장했어요',
  error: '저장하지 못했어요',
};

const SHARE_LABELS: Record<ShareLinkState, string> = {
  idle: '링크 복사',
  working: '만드는 중…',
  copied: '복사했어요',
  error: '복사하지 못했어요',
};

/** 미리보기가 카드 좌우로 남겨두는 여백(양쪽 합). */
const H_GUTTER = 48;

interface AnswerPreviewModalProps {
  content: string;
  exportedAt: Date;
  exportState: ExportState;
  shareState: ShareLinkState;
  /** 캡처 대상 노드. 축소되지 않은 원본 카드를 가리킨다. */
  cardRef: RefObject<HTMLDivElement | null>;
  onExport: () => void;
  onShare: () => void;
  onClose: () => void;
}

const ACTION_CLASS =
  'flex-1 rounded-xl px-4 py-3 text-[13px] font-medium transition-colors disabled:cursor-default disabled:opacity-60';

export default function AnswerPreviewModal({
  content,
  exportedAt,
  exportState,
  shareState,
  cardRef,
  onExport,
  onShare,
  onClose,
}: AnswerPreviewModalProps) {
  const [scale, setScale] = useState(1);
  const [cardHeight, setCardHeight] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  // 폭은 창 크기, 높이는 카드 자신이 정한다. 웹폰트가 늦게 붙으면 높이가 바뀌므로
  // 1회 측정이 아니라 ResizeObserver로 계속 따라간다.
  useLayoutEffect(() => {
    const card = cardRef.current;
    const fitWidth = () => {
      const available = Math.min(window.innerWidth - H_GUTTER, CARD_WIDTH);
      setScale(available / CARD_WIDTH);
    };
    fitWidth();
    window.addEventListener('resize', fitWidth);

    const observer = card
      ? new ResizeObserver(() => setCardHeight(card.offsetHeight))
      : null;
    if (card && observer) {
      setCardHeight(card.offsetHeight);
      observer.observe(card);
    }
    return () => {
      window.removeEventListener('resize', fitWidth);
      observer?.disconnect();
    };
  }, [cardRef, content]);

  const isBusy = exportState === 'working' || shareState === 'working';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="답변 카드 미리보기"
      className="fixed inset-0 z-[60] flex justify-center overflow-y-auto bg-black/60 px-6 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={frameRef}
        className="flex h-max w-full flex-col"
        style={{ maxWidth: CARD_WIDTH }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] font-medium text-white/90">이렇게 저장돼요</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="미리보기 닫기"
            className="flex size-8 items-center justify-center rounded-full bg-white/15 text-lg leading-none text-white transition-colors hover:bg-white/25"
          >
            ×
          </button>
        </div>

        {/* 축소된 카드가 차지할 자리 — transform은 레이아웃 크기를 줄이지 않으므로 직접 잡아준다. */}
        <div
          className="overflow-hidden rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
          style={{ width: CARD_WIDTH * scale, height: cardHeight * scale }}
        >
          <div style={{ width: CARD_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <div ref={cardRef}>
              <FestivalAnswerCard content={content} exportedAt={exportedAt} variant="image" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onShare}
            disabled={isBusy}
            className={`${ACTION_CLASS} bg-white/15 text-white hover:bg-white/25`}
          >
            {SHARE_LABELS[shareState]}
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={isBusy}
            className={`${ACTION_CLASS} bg-white text-black hover:bg-white/90`}
          >
            {EXPORT_LABELS[exportState]}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
