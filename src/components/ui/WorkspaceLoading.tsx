'use client';

/*
 * CONTEXT
 * - Problem      : 워크스페이스 동기화 전(!workspaceId || !synced)에 흰 화면에 회색
 *                  텍스트 한 줄만 떠서 멈춘 것처럼 보임.
 * - Why          : 실제 노드 모양(중심 사각형 + 하위 알약)이 차례로 밝아지는 루프
 *                  애니메이션 + 알약형 상태 라벨. 빈 캔버스 온보딩 일러스트와 같은
 *                  시각 언어라 로딩→캔버스 전환이 자연스럽다.
 * - Alternatives : 범용 스피너 — 브랜드 무관 + UI 가이드의 장식 지양 원칙과 어긋남.
 * - Trade-offs   : UI 가이드는 keyframe 애니메이션을 금지하지만 로딩 표시는 반복
 *                  애니메이션이 본질이라 예외로 채택(사용자 요청). reduced-motion에서는
 *                  정지 상태로 표시.
 * - Edge Case    : prefers-reduced-motion — globals.css에서 animation 해제.
 */

// 노드 표면색은 UI 가이드의 고정 팔레트(라이트/다크 동일)라 하드코딩 허용
const PULSE = 'workspace-loading-pulse';

export default function WorkspaceLoading() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-background">
      {/* 중심 주제 → 연결선 → 하위 주제 순으로 밝아지는 미니 그래프 */}
      <div className="flex items-center" aria-hidden="true">
        <span
          className={`${PULSE} h-9 w-16 rounded-lg border`}
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#D9D9D9',
            animationDelay: '0s',
          }}
        />
        <svg width="40" height="72" viewBox="0 0 40 72" fill="none">
          <path
            className={PULSE}
            d="M0 36 H16 V18 H40"
            stroke="#D9D9D9"
            strokeWidth="1.5"
            fill="none"
            style={{ animationDelay: '0.25s' }}
          />
          <path
            className={PULSE}
            d="M0 36 H16 V54 H40"
            stroke="#D9D9D9"
            strokeWidth="1.5"
            fill="none"
            style={{ animationDelay: '0.55s' }}
          />
        </svg>
        <div className="flex flex-col gap-4">
          <span
            className={`${PULSE} h-[22px] w-[52px] rounded-full`}
            style={{ backgroundColor: '#D0EEFB', animationDelay: '0.4s' }}
          />
          <span
            className={`${PULSE} h-[22px] w-[52px] rounded-full`}
            style={{ backgroundColor: '#D0EEFB', animationDelay: '0.7s' }}
          />
        </div>
      </div>

      <p
        className="rounded-full bg-surface px-5 py-2 text-sm text-muted"
        role="status"
      >
        워크스페이스를 불러오는 중...
      </p>
    </div>
  );
}
