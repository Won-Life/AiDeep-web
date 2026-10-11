'use client';

/*
 * CONTEXT
 * - Problem      : 최초 그래프 로드(getWorkspaces/getNodes)가 네트워크·서버 오류로 실패하면
 *                  기존엔 setSynced(true)로 빈 캔버스를 열어, 데이터가 "없는" 건지 "못 불러온"
 *                  건지 구분이 안 됐다 (Figma L2 미구현).
 * - Why          : 시안의 484px 흰 카드·슬픈 캐릭터·파란 버튼을 배치한다. 실패를 syncError로 분리해(layout.tsx) 이 화면을 띄운다. "다시 시도"는
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
    <div className="workspace-graph-loading flex h-full items-center justify-center p-4">
      <div role="alert" className="relative flex min-h-[284px] w-[484px] max-w-full flex-col items-center rounded-[20px] bg-background px-6 pt-[36px] pb-[38px] text-center min-[600px]:px-[55px]">
        <button type="button" onClick={onDismiss} aria-label="닫기" className="absolute top-[38px] right-7 flex size-5 items-center justify-center text-muted hover:text-foreground">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
        </button>
        <h2 className="px-3 text-[16px] leading-6 font-bold text-foreground">그래프를 불러오지 못했어요</h2>
        <p className="mt-1 text-[12px] leading-[18px] text-muted">네트워크 상태를 확인하고 다시 시도해 주세요</p>
        <div className="relative mt-7 mb-9 h-[56px] w-[104px]" aria-hidden="true">
          <div className="absolute top-0 left-0 h-[55px] w-[66px] rounded-[50%_50%_55%_45%] bg-[linear-gradient(160deg,#BDCEFF,#7D92FF)]">
            <span className="absolute top-[33px] left-[22px] h-[2px] w-[7px] rounded-full bg-[#172235]" />
            <span className="absolute top-[33px] left-[40px] h-[2px] w-[7px] rounded-full bg-[#172235]" />
          </div>
          <div className="absolute right-0 bottom-0 h-[39px] w-[47px] rounded-[50%_50%_48%_52%] bg-[linear-gradient(160deg,#FFEAF3,#F48CB7)]">
            <span className="absolute top-[26px] left-[10px] h-px w-[6px] rotate-[8deg] bg-[#34212A]" />
            <span className="absolute top-[27px] left-[24px] h-px w-[6px] rotate-[8deg] bg-[#34212A]" />
          </div>
        </div>
        <button type="button" onClick={onRetry} className="h-[46px] w-full rounded-[8px] bg-[#748DFD] text-[14px] font-semibold text-white transition-opacity hover:opacity-90">
          다시 시도
        </button>
      </div>
    </div>
  );
}
