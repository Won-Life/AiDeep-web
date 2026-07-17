'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';

export const ONBOARDING_URL = 'https://won-life.github.io/Aideep_graph_onboard/';
export const ONBOARDING_SEEN_KEY = 'aideep_onboarding_seen';

const noopSubscribe = () => () => {};

// /workspace는 정적 프리렌더 대상이라 서버에서는 window가 없다. lazy useState로 바로
// localStorage를 읽으면 서버(false)·클라(fresh 방문자면 true) 스냅샷이 달라져 하이드레이션
// 불일치가 나고, 그 불일치 때문에 팝업 자체가 조용히 렌더되지 않는 문제가 있었다.
// useSyncExternalStore는 getServerSnapshot을 강제해 첫 페인트를 서버와 동일하게 맞추고,
// 마운트 후에만 실제 값으로 갱신한다.
export function useOnboardingSeen(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => localStorage.getItem(ONBOARDING_SEEN_KEY) !== null,
    () => true,
  );
}

export default function OnboardingPopup() {
  const seen = useOnboardingSeen();
  const [dismissed, setDismissed] = useState(false);
  const isOpen = !seen && !dismissed;

  useEffect(() => {
    if (!seen) localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
  }, [seen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={() => setDismissed(true)}
    >
      <div
        className="flex w-[420px] max-w-[90vw] flex-col gap-[20px] rounded-[16px] border border-gray-700 bg-background p-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-[20px] font-bold text-foreground">
            AIDeep이 처음이신가요?
          </h2>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="닫기"
            className="text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <p className="text-[14px] leading-[22px] text-muted">
          그래프 만들기, 노드 안에서 바로 편집하기, 자유롭게 옮기며 정리하기까지 —
          AIDeep 사용법을 1분 만에 보여드릴게요.
        </p>

        <div className="flex gap-[12px]">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="h-[44px] flex-1 rounded-[8px] border border-border bg-background text-[14px] font-semibold text-muted transition-colors hover:bg-surface"
          >
            나중에
          </button>
          <a
            href={ONBOARDING_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setDismissed(true)}
            className="flex h-[44px] flex-1 items-center justify-center rounded-[8px] bg-main text-[14px] font-semibold text-white transition-colors hover:opacity-90"
          >
            사용법 보기
          </a>
        </div>
      </div>
    </div>
  );
}
