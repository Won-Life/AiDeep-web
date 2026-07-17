'use client';
import { useState, type ReactNode } from 'react';
import { MAIN_NODE_COLOR } from '@/features/graph/constants/colors';
import { useOnboardingSeen } from '@/components/layout/OnboardingPopup';

// ponytail: 실제 노드 팔레트의 green은 파스텔톤이라 미리보기에서 흐릿함 — 가이드 전용으로 진한 메인 그린 토큰 사용
const PREVIEW_GREEN = 'rgb(var(--ds-main))';

function Term({ children }: { children: string }) {
  return <span className="font-bold text-main">{children}</span>;
}

function Effect({ children }: { children: ReactNode }) {
  return <span className="font-bold text-foreground">{children}</span>;
}

const SHORTCUTS = [
  {
    action: '빈공간 우클릭',
    effect: (
      <Effect>
        <Term>중심 주제 노드</Term> 생성
      </Effect>
    ),
  },
  {
    action: '빈공간 더블 클릭',
    effect: (
      <Effect>
        <Term>일반 주제 노드</Term> 생성
      </Effect>
    ),
  },
  {
    action: '노드를 다른 노드 위로 드래그',
    effect: <Effect>그 노드의 하위로 이동</Effect>,
  },
  {
    action: 'Shift + 드래그',
    effect: <Effect>여러 노드를 한번에 이동</Effect>,
  },
  {
    action: 'Option(Alt) + 드래그',
    effect: <Effect>노드 하나만 이동</Effect>,
  },
];

export default function GraphUsageGuide() {
  // 최초 로그인(온보딩 미확인) 때만 기본 펼침, 그 외엔 기본 접힘 — 사용자가 버튼으로
  // 직접 토글하면(manualOverride) 그 이후엔 이 세션 동안 그 선택을 따른다.
  const seen = useOnboardingSeen();
  const [manualOverride, setManualOverride] = useState<boolean | null>(null);
  const isOpen = manualOverride ?? !seen;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setManualOverride(true)}
        className="rounded-[5px] border border-gray-700 bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface"
      >
        사용법
      </button>
    );
  }

  return (
    <div className="w-[320px] rounded-xl border border-gray-700 bg-background p-4 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">사용법</p>
        <button
          type="button"
          onClick={() => setManualOverride(false)}
          aria-label="사용법 닫기"
          className="flex h-5 w-5 items-center justify-center text-muted transition-colors hover:text-foreground"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M1 1L11 11M11 1L1 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* 노드란? — 실제 노드 모양을 그대로 미리보기로 보여줘 원문 없이도 형태로 이해되게 함 */}
      <div className="mb-3 rounded-lg bg-surface p-3">
        <p className="mb-2 text-sm font-bold text-foreground">노드란?</p>
        <p className="mb-3 text-sm text-muted">
          그래프 위의 동그라미·네모 하나하나가 <Term>노드</Term>입니다. 각각
          하나의 주제를 담는 단위예요.
        </p>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <div
              className="shrink-0 rounded-sm border"
              style={{
                width: 40,
                height: 26,
                backgroundColor: MAIN_NODE_COLOR.bg,
                borderColor: 'rgb(var(--ds-gray-700))',
              }}
            />
            <span className="text-sm text-muted">
              <Term>중심 주제 노드</Term> — 그래프의 중심이 되는 주제
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="shrink-0 rounded-full"
              style={{
                width: 40,
                height: 26,
                backgroundColor: PREVIEW_GREEN,
              }}
            />
            <span className="text-sm text-muted">
              <Term>일반 주제 노드</Term> — 중심 주제에서 뻗어나가는 하위 주제
            </span>
          </div>
        </div>
      </div>

      <ul>
        {SHORTCUTS.map((s) => (
          <li
            key={s.action}
            className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-0"
          >
            <span className="min-w-0 flex-1 text-muted">{s.action}</span>
            <span className="shrink-0 whitespace-nowrap text-right">{s.effect}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
