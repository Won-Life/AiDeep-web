'use client';
import {
  useImperativeHandle,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { useOnboardingSeen } from '@/components/layout/OnboardingPopup';
import MouseIcon from '@/components/ui/MouseIcon';

/** 외부(빈 캔버스 안내 등)에서 사용법 창을 열기 위한 핸들 */
export interface GraphUsageGuideHandle {
  open: () => void;
}

/*
 * CONTEXT
 * - Problem      : 사용법 창이 단축키 나열 위주라 처음 온 사용자가 동작을 상상하기
 *                  어려웠고, "드래그·하위로 이동" 같은 표현이 실제 화면과 연결되지 않음.
 * - Why          : 노드 만들기 / 끌어서 연결 / 연결점에서 만들기 / 내용 적기 4개 카드로
 *                  재구성. 각 카드는 실제 노드 모양을 축소한 일러스트 + 한 줄 설명.
 *                  카드 그리드는 auto-fit minmax라 패널 폭에 따라 2×2 ↔ 1열로 반응.
 * - Alternatives : 단축키 표 유지 + 문구만 수정 — 어휘는 나아져도 동작이 그림으로
 *                  전달되지 않아 기각.
 * - Trade-offs   : Shift/Alt 이동 같은 보조 단축키는 하단 팁 한 줄로 축소.
 * - Edge Case    : 좁은 화면에서는 패널 폭이 100vw 기준으로 줄고 카드가 1열로 떨어짐.
 */

// 노드 표면색은 UI 가이드의 고정 팔레트(라이트/다크 동일)라 하드코딩 허용
const MAIN_RECT = {
  backgroundColor: '#FFFFFF',
  borderColor: '#D9D9D9',
  color: '#2C2C2C',
};
const SUB_PILL = { backgroundColor: '#D0EEFB', color: '#254756' };
const SNAP_BLUE = '#93C5FD';

function Term({ children }: { children: string }) {
  return <span className="font-bold text-main">{children}</span>;
}

/** 실제 중심 주제 노드 축소판 */
function MiniRect({
  children,
  snap = false,
}: {
  children: ReactNode;
  snap?: boolean;
}) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center rounded-md border px-3 py-1.5 text-[12px] font-medium whitespace-nowrap"
      style={{
        ...MAIN_RECT,
        ...(snap ? { borderColor: SNAP_BLUE, borderWidth: 2 } : {}),
      }}
    >
      {children}
    </span>
  );
}

/** 실제 하위 주제 노드 축소판 */
function MiniPill({
  children,
  dashed = false,
}: {
  children: ReactNode;
  dashed?: boolean;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[12px] whitespace-nowrap"
      style={{
        ...SUB_PILL,
        ...(dashed ? { border: `1.5px dashed ${SNAP_BLUE}` } : {}),
      }}
    >
      {children}
    </span>
  );
}

/** 마우스 동작 이름표 (아이콘 + 라벨) */
function KeyChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted whitespace-nowrap">
      {children}
    </span>
  );
}

/** 전체 화면 버튼 모양 — 일러스트의 ↗ 아이콘과 동일한 양쪽 화살표 */
function ExpandGlyph() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      aria-label="전체화면"
      className="-mt-0.5 inline align-middle"
    >
      <path
        d="M1 11L11 1M8 1H11V4M4 11H1V8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 이동 방향 화살표 */
function Arrow() {
  return (
    <svg width="26" height="12" viewBox="0 0 26 12" fill="none" aria-hidden="true">
      <path
        d="M1 6 H21 M16 1.5 L21.5 6 L16 10.5"
        stroke="rgb(var(--muted))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GuideCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-lg bg-surface p-3">
      <div className="flex h-[84px] items-center justify-center" aria-hidden="true">
        {children}
      </div>
      <p className="mt-1 text-[13.5px] font-bold text-foreground">{title}</p>
      {/* 설명은 muted 대신 본문색 — 파스텔 카드 배경 위 시인성 확보 */}
      <p className="mt-1.5 text-[13px] leading-[19px] text-foreground">{desc}</p>
    </div>
  );
}

export default function GraphUsageGuide({
  highlight = false,
  ref,
}: {
  /** 빈 캔버스 등에서 사용법 진입점을 main 컬러 글로우로 강조 */
  highlight?: boolean;
  ref?: Ref<GraphUsageGuideHandle>;
}) {
  // 최초 로그인(온보딩 미확인) 때만 기본 펼침, 그 외엔 기본 접힘 — 사용자가 버튼으로
  // 직접 토글하면(manualOverride) 그 이후엔 이 세션 동안 그 선택을 따른다.
  const seen = useOnboardingSeen();
  const [manualOverride, setManualOverride] = useState<boolean | null>(null);
  const isOpen = manualOverride ?? !seen;

  useImperativeHandle(ref, () => ({ open: () => setManualOverride(true) }), []);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setManualOverride(true)}
        className="rounded-[5px] border border-gray-700 bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface"
        // 정적 글로우(애니메이션 없음) — 빈 캔버스에서 사용법 위치를 알려주는 용도
        style={
          highlight
            ? {
                borderColor: 'rgb(var(--ds-main))',
                boxShadow:
                  '0 0 0 3px rgb(var(--ds-main) / 0.3), 0 0 14px rgb(var(--ds-main) / 0.45)',
              }
            : undefined
        }
      >
        사용법
      </button>
    );
  }

  return (
    <div className="w-[min(560px,calc(100vw-120px))] rounded-xl border border-gray-700 bg-background p-4 shadow-md">
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

      {/* 패널 폭에 따라 2×2 ↔ 1열 반응형 */}
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
      >
        <GuideCard
          title="단독 주제 만들기"
          desc={
            <>
              빈 곳을 우클릭하면 <Term>중심 주제</Term>,
              <br />
              더블 클릭하면 <Term>하위 주제</Term>가 생겨요.
            </>
          }
        >
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              <KeyChip>
                <MouseIcon button="right" />
                우클릭
              </KeyChip>
              <MiniRect>중심 주제</MiniRect>
            </div>
            <div className="flex items-center gap-2">
              <KeyChip>
                <MouseIcon button="double" />
                더블 클릭
              </KeyChip>
              <MiniPill>하위 주제</MiniPill>
            </div>
          </div>
        </GuideCard>

        <GuideCard
          title="연결된 주제 만들기"
          desc={
            <>
              주제의 <Term>연결점</Term>을 끌어서 놓으면,
              <br />
              연결된 <Term>하위 주제</Term>가 새로 생겨요.
            </>
          }
        >
          <div className="flex items-center">
            <span className="relative">
              <MiniRect>중심 주제</MiniRect>
              <span
                className="absolute top-1/2 -right-[4px] h-2 w-2 -translate-y-1/2 rounded-full border-2"
                style={{
                  backgroundColor: 'rgb(var(--background))',
                  borderColor: 'rgb(var(--ds-gray-700))',
                }}
              />
            </span>
            <svg width="34" height="8" viewBox="0 0 34 8" fill="none" aria-hidden="true">
              <path
                d="M2 4 H32"
                stroke={SNAP_BLUE}
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
            </svg>
            <MiniPill dashed>새 주제</MiniPill>
          </div>
        </GuideCard>

        <GuideCard
          title="주제끼리 연결하기"
          desc={
            <>
              주제를 다른 주제에 가까이 끌면
              <br />
              <Term>하위 주제</Term>로 연결돼요.
            </>
          }
        >
          <div className="flex items-center gap-1.5">
            <MiniPill>하위 주제</MiniPill>
            <Arrow />
            <MiniRect snap>중심 주제</MiniRect>
          </div>
        </GuideCard>

        <GuideCard
          title="내용 적기"
          desc={
            <>
              주제를 클릭하면 <Term>텍스트 편집창</Term>이 열려 글을 적을 수
              있어요.
              <br />
              전체화면도 가능해요! (<ExpandGlyph /> 버튼 클릭)
            </>
          }
        >
          <div className="flex flex-col items-center gap-1.5">
            <MiniPill>하위 주제</MiniPill>
            <div className="relative flex w-[128px] flex-col gap-1.5 rounded-md border border-gray-700 bg-background p-2">
              {/* 전체 화면 버튼 표시 */}
              <svg
                width="8"
                height="8"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
                className="absolute top-1.5 right-1.5"
              >
                <path
                  d="M1 11L11 1M8 1H11V4M4 11H1V8"
                  stroke="rgb(var(--muted))"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                className="h-1.5 w-3/4 rounded-full"
                style={{ backgroundColor: 'rgb(var(--surface-hover))' }}
              />
              <span
                className="h-1.5 w-full rounded-full"
                style={{ backgroundColor: 'rgb(var(--surface-hover))' }}
              />
              <span
                className="h-1.5 w-1/2 rounded-full"
                style={{ backgroundColor: 'rgb(var(--surface-hover))' }}
              />
            </div>
          </div>
        </GuideCard>
      </div>

      {/* 보조 팁 — 서로 다른 동작이므로 줄을 나누고 본문색으로 강조 */}
      <div className="mt-3 flex flex-col gap-1 border-t border-border pt-2.5">
        <p className="text-[12px] font-bold text-main">Tip!</p>
        <p className="text-[12px] text-foreground">
          <span className="font-semibold">Shift + 드래그</span>
          <span className="text-muted"> — </span>여러 주제를 한번에 이동
        </p>
        <p className="text-[12px] text-foreground">
          <span className="font-semibold">Option(Alt) + 드래그</span>
          <span className="text-muted"> — </span>주제 하나만 이동
        </p>
      </div>
    </div>
  );
}
