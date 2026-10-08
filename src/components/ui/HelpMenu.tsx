'use client';
import { useState } from 'react';
import { BugReportModal } from '@/components/layout/BugReportButton';
import pkg from '../../../package.json';

/*
 * CONTEXT
 * - Problem      : 사용법·단축키·피드백 진입점이 흩어져 있었다(사용법 패널 버튼,
 *                  헤더의 벌레 아이콘). Figma 08 G8 시안은 캔버스 우상단 ? 버튼
 *                  하나로 도움 관련 동작을 모은다.
 * - Why          : ? 버튼 + 드롭다운 메뉴. 항목 동작은 전부 기존 구현 재사용 —
 *                  구조 보기는 GraphOnboardingModal, 피드백은 BugReportModal.
 * - Alternatives : 헤더(ChipHeader)에 배치 — 시안이 캔버스 우상단 고정이라 기각.
 * - Trade-offs   : "단축키 보기"는 단축키 모달(#243)이 생기기 전까지 비활성.
 * - Edge Case    : 바깥 클릭 닫기는 투명 고정 레이어로 처리 — 캔버스 위라
 *                  blur 이벤트가 React Flow 포커스 이동과 얽히는 것을 피한다.
 */

export default function HelpMenu({
  onOpenGuide,
}: {
  /** "노드 구조 다시 보기" 선택 시 호출 — 그래프 구조 온보딩 모달을 연다 */
  onOpenGuide: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="도움말"
        aria-expanded={menuOpen}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-background text-[14px] text-muted transition-colors hover:bg-surface hover:text-foreground"
      >
        ?
      </button>

      {menuOpen && (
        <>
          {/* 바깥 클릭 닫기용 투명 레이어 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-10 right-0 z-50 w-[200px] rounded-[10px] border border-gray-700 bg-background py-1.5 shadow-md">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onOpenGuide();
              }}
              className="flex w-full items-center px-3.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-surface"
            >
              노드 구조 다시 보기
            </button>
            <button
              type="button"
              disabled
              title="단축키 모달은 준비 중이에요"
              className="flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] text-muted opacity-50"
            >
              단축키 보기
              <span className="text-[11px]">⌘/</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setFeedbackOpen(true);
              }}
              className="flex w-full items-center px-3.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-surface"
            >
              피드백 보내기
            </button>
            <div className="mt-1 border-t border-border px-3.5 pt-2 pb-1">
              <span className="text-[11px] text-gray-500">
                On:Node v{pkg.version} MVP
              </span>
            </div>
          </div>
        </>
      )}

      <BugReportModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
