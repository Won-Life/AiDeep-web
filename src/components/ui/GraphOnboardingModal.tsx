'use client';
import { useState, useSyncExternalStore } from 'react';

/*
 * CONTEXT
 * - Problem      : 첫 진입 사용자가 그래프의 정보 구조(프로젝트 → 타이틀 → 콘텐츠 3단계)를
 *                  알 방법이 없었다. 기존 GraphUsageGuide는 조작법(클릭·드래그) 안내 위주라
 *                  구조 자체를 설명하지 못한다.
 * - Why          : Figma 08 G3 시안 그대로의 구조 설명 모달. 표시 여부는 localStorage
 *                  키 하나로 관리하고, "다시 보지 않기"를 체크했을 때만 저장한다 —
 *                  체크 없이 닫으면 다음 진입 때 다시 보여준다(시안의 체크박스 의미).
 * - Alternatives : 기존 OnboardingPopup에 step으로 합치기 — Meet 확장 홍보·고지(#206)와
 *                  수명주기(키·닫힘 조건)가 달라 결합 시 둘 다 복잡해져 기각.
 * - Trade-offs   : 첫 진입에 OnboardingPopup(z-50, layout)과 겹칠 수 있어, 자동 오픈을
 *                  Meet 온보딩 확인 이후로 미룬다(호출부 GraphCanvas에서 제어).
 * - Edge Case    : /workspace는 정적 프리렌더라 서버에 window가 없다 — OnboardingPopup과
 *                  동일하게 useSyncExternalStore로 서버 스냅샷(true=안 보임)을 고정해
 *                  하이드레이션 불일치를 막는다.
 */

export const GRAPH_ONBOARDING_SEEN_KEY = 'aideep_graph_onboarding_seen';

const noopSubscribe = () => () => {};

/** 그래프 구조 온보딩(G3)을 "다시 보지 않기"로 닫은 적이 있는지 */
export function useGraphOnboardingSeen(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => localStorage.getItem(GRAPH_ONBOARDING_SEEN_KEY) !== null,
    () => true,
  );
}

/*
 * CONTEXT
 * - Problem      : 기존 축약 노드와 440px 모달은 제공된 시안의 모양·비율과 다르다.
 * - Why          : SVG 경로로 탭, 흰 외곽선, 배너와 아이콘을 재현하고 시안의 632px 폭을 따른다.
 * - Alternatives : 실제 캔버스 노드는 ReactFlow 의존성이 있어 안내용 정적 SVG를 사용한다.
 * - Trade-offs   : 시안 전용 색은 모달 내부 변수로 한정하고 노드 모형을 별도로 유지한다.
 * - Edge Case    : 좁은 화면에서는 여백과 열 너비를 줄이고, 낮은 화면에서는 스크롤한다.
 */
function MiniProjectNode() {
  return (
    <svg width="86" height="66" viewBox="0 0 86 66" fill="none" aria-hidden="true" className="max-w-full overflow-visible drop-shadow-[0_2px_2px_rgb(0_0_0/0.16)]">
      <path d="M3 12V9a6 6 0 0 1 6-6h16a6 6 0 0 1 6 5v4" fill="var(--guide-blue)" stroke="white" strokeWidth="3" />
      <rect x="2" y="7" width="82" height="57" rx="5" fill="white" />
      <text x="43" y="40" textAnchor="middle" fill="rgb(var(--ds-text-gray))" fontSize="14" fontWeight="700">OS</text>
    </svg>
  );
}

function MiniTitleNode() {
  return (
    <svg width="106" height="36" viewBox="0 0 106 36" fill="none" aria-hidden="true" className="max-w-full overflow-visible drop-shadow-[0_2px_2px_rgb(0_0_0/0.2)]">
      <path d="M15 7a5 5 0 0 1 5-4h9a5 5 0 0 1 5 4h56a14 14 0 0 1 0 28H16a14 14 0 0 1-1-28Z" fill="var(--guide-blue)" stroke="white" strokeWidth="2.5" />
      <text x="53" y="25" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">9/23 강의</text>
    </svg>
  );
}

function MiniContentNode() {
  return (
    <svg width="92" height="32" viewBox="0 0 92 32" fill="none" aria-hidden="true" className="max-w-full overflow-visible drop-shadow-[0_2px_2px_rgb(0_0_0/0.16)]">
      <path d="M5 3h73l10 13-10 13H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" fill="var(--guide-content)" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="5.5" stroke="white" />
      <path d="M13 16h6m-3-3v6M28 6v20" stroke="white" strokeLinecap="round" />
      <text x="54" y="19.5" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">강의 필기</text>
    </svg>
  );
}

function StageArrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 6h7M6 3l3 3-3 3" stroke="rgb(var(--ds-gray-300))" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Figma 08 G3: '콘텐츠 노드는 이렇게 써요' — 타입 분화 없이 글쓰기/첨부 2가지 사용법만 안내
const CONTENT_USAGE: Array<[name: string, desc: string]> = [
  ['글 쓰기', '바로 쓰거나 강의 필기 · 회의 메모 템플릿으로 시작해요'],
  ['첨부', '파일 올리고, 링크는 본문에 붙여넣어요'],
];

export default function GraphOnboardingModal({
  open,
  onClose,
}: {
  open: boolean;
  /** 닫기 — dontShowAgain이 true면 localStorage에 저장돼 다시 자동 오픈되지 않는다 */
  onClose: () => void;
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!open) return null;

  const close = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(GRAPH_ONBOARDING_SEEN_KEY, 'true');
      } catch {
        // localStorage 접근 실패(사생활 보호 모드 등)는 무시 — 다음 진입 때 다시 보일 뿐
      }
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="graph-onboarding-title"
        style={{ '--guide-blue': '#617bff', '--guide-pale': '#e5ebff', '--guide-content': '#829dff' } as React.CSSProperties}
        className="flex max-h-[calc(100dvh-32px)] w-[632px] max-w-[calc(100vw-32px)] flex-col overflow-y-auto rounded-[24px] bg-background px-5 pt-[38px] pb-5 min-[600px]:px-[38px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pl-0 min-[600px]:pl-5">
          <div>
            <h2 id="graph-onboarding-title" className="text-[20px] leading-7 font-bold text-foreground">
              그래프는 이렇게 구성돼요
            </h2>
            <p className="mt-0.5 text-[14px] leading-5 text-muted">
              프로젝트 → 타이틀 → 콘텐츠, 3단계로 정리돼요
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="mt-1 -mr-1 flex size-5 items-center justify-center text-muted hover:text-foreground"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="m4 4 12 12M16 4 4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* 시안의 노드 중심과 설명 열을 동일한 grid로 정렬한다. */}
        <div className="mt-[27px] rounded-[24px] bg-[var(--guide-pale)] px-2 pt-[26px] pb-[18px] min-[600px]:px-[18px]">
          <div className="grid h-[66px] grid-cols-[minmax(0,1fr)_12px_minmax(0,1fr)_12px_minmax(0,1fr)] items-center justify-items-center">
            <MiniProjectNode />
            <StageArrow />
            <MiniTitleNode />
            <StageArrow />
            <MiniContentNode />
          </div>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_12px_minmax(0,1fr)_12px_minmax(0,1fr)] text-center text-[rgb(var(--ds-text-gray))]">
            <div>
              <p className="text-[12px] leading-[18px] font-bold">프로젝트</p>
              <p className="mt-0.5 text-[8px] leading-[10px] text-gray-400">과목 단위<br />(가장 상위)</p>
            </div>
            <span />
            <div>
              <p className="text-[12px] leading-[18px] font-bold">타이틀</p>
              <p className="mt-0.5 text-[8px] leading-[10px] text-gray-400">날짜·세션 단위<br />예: 260923 오늘 강의</p>
            </div>
            <span />
            <div>
              <p className="text-[12px] leading-[18px] font-bold">콘텐츠</p>
              <p className="mt-0.5 text-[8px] leading-[10px] text-gray-400">실제 내용을 담아요</p>
            </div>
          </div>
        </div>

        <div className="mt-[22px] border-t-2 border-[var(--guide-pale)] px-0 pt-[15px] min-[600px]:px-5">
          <p className="text-[14px] font-bold text-foreground">
            콘텐츠 노드는 이렇게 써요
          </p>
          <div className="mt-[36px] flex flex-col gap-[15px]">
            {CONTENT_USAGE.map(([name, desc]) => (
              <div key={name} className="flex items-start gap-[19px]">
                <span className="w-[56px] shrink-0 text-[13px] font-semibold text-foreground">
                  {name}
                </span>
                <span className="text-[13px] text-muted">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-[24px] rounded-[24px] bg-[var(--guide-pale)] px-4 py-3 text-center text-[12px] leading-[19px] font-semibold text-[rgb(var(--ds-text-gray))]">
          회의는 타이틀 위{' '}
          <span className="font-semibold whitespace-nowrap text-red-500">
            <span className="text-red-500">●</span> 회의 녹음
          </span>{' '}
          버튼으로 녹음해요. 봇이 대화를 콘텐츠 노드로 정리해줘요
        </p>

        <div className="mt-[19px] flex items-center justify-between pl-1 min-[600px]:pl-6">
          <label className="flex cursor-pointer items-center gap-[14px] text-[13px] text-muted">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="size-5 shrink-0 appearance-none rounded-[6px] border border-[var(--guide-blue)] bg-background checked:bg-[var(--guide-blue)] checked:before:block checked:before:text-center checked:before:text-white checked:before:content-['✓'] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--guide-blue)]"
            />
            다시 보지 않기
          </label>
          <button
            type="button"
            onClick={close}
            className="h-[47px] w-[134px] rounded-full bg-[var(--guide-blue)] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
