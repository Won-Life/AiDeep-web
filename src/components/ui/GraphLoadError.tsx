'use client';

/*
 * CONTEXT
 * - Problem      : 최초 그래프 로드(getWorkspaces/getNodes)가 네트워크·서버 오류로 실패하면
 *                  기존엔 setSynced(true)로 빈 캔버스를 열어, 데이터가 "없는" 건지 "못 불러온"
 *                  건지 구분이 안 됐다 (Figma L2 미구현).
 * - Why          : 실패를 syncError로 분리해(layout.tsx) 이 화면을 띄운다. "다시 시도"는
 *                  syncError를 풀어 sync effect를 재실행한다 — 페이지 리로드 없이 복구.
 * - Alternatives : 토스트만 띄우고 빈 캔버스 유지 — 사용자가 빈 워크스페이스로 오인, 기각.
 * - Trade-offs   : 로딩 화면과 동일한 전체화면 점유 — 부분 로드 성공분은 못 보여주지만,
 *                  최초 sync는 all-or-nothing이라(노드 전체 fetch) 의미 없음.
 * - Edge Case    : 닫기(onDismiss)는 "빈 캔버스로 계속" — 재시도 없이 작업을 시작하고 싶은
 *                  사용자를 위해 synced=true로 넘긴다(호출부에서 처리).
 */
export default function GraphLoadError({
  onRetry,
  onDismiss,
}: {
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-background p-6">
      <div className="relative flex w-[360px] max-w-[90vw] flex-col items-center gap-5 rounded-[16px] border border-gray-700 bg-background px-6 py-8 text-center">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="닫기"
          className="absolute top-4 right-4 text-muted hover:text-foreground"
        >
          ✕
        </button>

        {/* 두 블롭 일러스트 (빈 상태와 같은 파스텔 시각 언어) */}
        <div className="flex items-end gap-1.5" aria-hidden="true">
          <span
            className="h-12 w-12 rounded-[46%_54%_52%_48%/48%_46%_54%_52%]"
            style={{ backgroundColor: 'rgb(var(--ds-main-blue-light))' }}
          />
          <span
            className="h-9 w-9 rounded-[52%_48%_46%_54%/54%_52%_48%_46%]"
            style={{ backgroundColor: 'rgb(var(--ds-sub-pink))' }}
          />
        </div>

        <div>
          <h2 className="text-[16px] font-bold text-foreground">
            그래프를 불러오지 못했어요
          </h2>
          <p className="mt-1.5 text-[13px] leading-[19px] text-muted">
            네트워크 상태를 확인하고 다시 시도해 주세요
          </p>
        </div>

        <button
          type="button"
          onClick={onRetry}
          className="h-[40px] w-full rounded-[10px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'rgb(var(--ds-main-blue))' }}
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
