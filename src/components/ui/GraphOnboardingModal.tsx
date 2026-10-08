'use client';
import { useState, useSyncExternalStore, type ReactNode } from 'react';

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
 * - Problem      : 3단계 다이어그램이 제네릭 알약(StagePill)이라 실제 캔버스 노드 모양
 *                  (프로젝트=흰 박스+꽁다리 / 타이틀=솔리드 알약+꽁다리 / 콘텐츠=오른쪽
 *                  뾰족 배너)과 전혀 달라, 사용자가 팝업과 실제 그래프를 연결 짓지 못했다.
 * - Why          : 온보딩은 "무엇이 어떤 모양인지" 가르치는 화면이므로 실제 노드 비주얼을
 *                  미니로 미러링해야 교육 효과가 있다. Figma 08 showcase 색(Main Blue)으로
 *                  통일 — 색은 노드별 랜덤이지만 모양 학습이 목적이라 단일 색이 더 명확.
 * - Alternatives : 실제 TextUpdateNode를 모달에 재사용 — @xyflow Handle·ResizeObserver·
 *                  provider 의존이 커 모달에서 깨지고 과함. 정적 미니 모형으로 분리.
 * - Trade-offs   : 모양이 코드에 중복(진짜 노드는 SVG). 온보딩 전용 축약이라 수용.
 * - Edge Case    : 콘텐츠 배너의 오른쪽 뾰족함은 clip-path로 표현 — 라운드 코너는 포기
 *                  (미니 illustration이라 캔버스 SVG만큼 정밀할 필요 없음).
 */

const STAGE_BLUE = 'rgb(var(--ds-main-blue))';

/** 폴더 꽁다리 — 노드 상단 왼쪽의 작은 라운드 탭 */
function MiniTab({ color }: { color: string }) {
  return (
    <span
      className="absolute -top-[5px] left-2.5 h-[7px] w-[15px] rounded-t-[3px]"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

/** 프로젝트 노드 모형 — 흰 박스 + 색 꽁다리 + 검은 볼드 (가장 상위) */
function MiniProjectNode({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex items-center rounded-[10px] border border-gray-700 bg-background px-4 py-2 text-[13px] font-bold whitespace-nowrap text-foreground">
      <MiniTab color={STAGE_BLUE} />
      {children}
    </span>
  );
}

/** 타이틀 노드 모형 — 솔리드 색 알약 + 흰 꽁다리 + 흰 텍스트 */
function MiniTitleNode({ children }: { children: ReactNode }) {
  return (
    <span
      className="relative inline-flex items-center rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold whitespace-nowrap text-white"
      style={{ backgroundColor: STAGE_BLUE }}
    >
      <MiniTab color="#ffffff" />
      {children}
    </span>
  );
}

/** 콘텐츠 노드 모형 — 연한 색 + 오른쪽 뾰족 배너 */
function MiniContentNode({ children }: { children: ReactNode }) {
  return (
    <span
      className="relative inline-flex items-center py-1.5 pr-5 pl-3.5 text-[12.5px] font-medium whitespace-nowrap"
      style={{
        backgroundColor: 'rgb(var(--ds-main-blue-pale))',
        color: 'rgb(var(--ds-main-blue-deep))',
        clipPath:
          'polygon(0 10%, 0 90%, calc(100% - 9px) 90%, 100% 50%, calc(100% - 9px) 10%, 0 10%)',
        borderRadius: 7,
      }}
    >
      {children}
    </span>
  );
}

function StageArrow() {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden="true">
      <path
        d="M1 5 H16 M12.5 1.5 L17 5 L12.5 8.5"
        stroke="rgb(var(--muted))"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Figma 08 G3: '콘텐츠 노드는 이렇게 써요' — 타입 분화 없이 글쓰기/첨부 2가지 사용법만 안내
const CONTENT_USAGE: Array<[name: string, desc: string]> = [
  ['글 쓰기', '바로 쓰거나 강의 필기·회의 메모 템플릿으로 시작해요'],
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
        className="flex max-h-[90vh] w-[440px] max-w-[92vw] flex-col gap-[16px] overflow-y-auto rounded-[16px] border border-gray-700 bg-background p-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[18px] font-bold text-foreground">
              그래프는 이렇게 구성돼요
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              프로젝트 → 타이틀 → 콘텐츠, 3단계로 정리돼요
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* 3단계 다이어그램 */}
        <div className="rounded-[12px] bg-surface px-4 py-5">
          <div className="flex items-center justify-between gap-1">
            <div className="flex flex-1 flex-col items-center gap-2">
              <MiniProjectNode>OS</MiniProjectNode>
            </div>
            <StageArrow />
            <div className="flex flex-1 flex-col items-center gap-2">
              <MiniTitleNode>9/23 강의</MiniTitleNode>
            </div>
            <StageArrow />
            <div className="flex flex-1 flex-col items-center gap-2">
              <MiniContentNode>강의 필기</MiniContentNode>
            </div>
          </div>
          <div className="mt-3 flex items-start justify-between gap-1 text-center">
            <div className="flex-1">
              <p className="text-[13px] font-bold text-foreground">프로젝트</p>
              <p className="mt-0.5 text-[11px] leading-[15px] text-muted">
                과목 단위
                <br />
                (가장 상위)
              </p>
            </div>
            <span className="w-[20px]" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-[13px] font-bold text-foreground">타이틀</p>
              <p className="mt-0.5 text-[11px] leading-[15px] text-muted">
                날짜·세션 단위
                <br />
                예: 260923 오늘 강의
              </p>
            </div>
            <span className="w-[20px]" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-[13px] font-bold text-foreground">콘텐츠</p>
              <p className="mt-0.5 text-[11px] leading-[15px] text-muted">
                실제 내용
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-[16px]">
          <p className="text-[14px] font-bold text-foreground">
            콘텐츠 노드는 이렇게 써요
          </p>
          <div className="mt-3 flex flex-col gap-2.5">
            {CONTENT_USAGE.map(([name, desc]) => (
              <div key={name} className="flex items-center gap-2.5">
                <span className="w-[56px] shrink-0 text-[13px] font-semibold text-foreground">
                  {name}
                </span>
                <span className="text-[13px] text-muted">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="rounded-[8px] bg-surface px-3.5 py-3 text-[12.5px] leading-[19px] text-foreground">
          회의는 타이틀 위{' '}
          <span className="font-semibold whitespace-nowrap">
            <span className="text-red-500">●</span> 회의 녹음
          </span>{' '}
          버튼으로 녹음해요. 봇이 대화를 콘텐츠 노드로 정리해줘요
        </p>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-4 w-4 accent-[rgb(var(--ds-black))]"
            />
            다시 보지 않기
          </label>
          <button
            type="button"
            onClick={close}
            className="rounded-[20px] px-6 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'rgb(var(--ds-main-blue))' }}
          >
            시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
