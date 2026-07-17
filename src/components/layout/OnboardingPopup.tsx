'use client';
import { useEffect, useState } from 'react';

const ONBOARDING_URL = 'https://won-life.github.io/Aideep_graph_onboard/';
const SEEN_KEY = 'aideep_onboarding_seen';

export default function OnboardingPopup() {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem(SEEN_KEY);
  });

  useEffect(() => {
    if (isOpen) localStorage.setItem(SEEN_KEY, 'true');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={() => setIsOpen(false)}
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
            onClick={() => setIsOpen(false)}
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
            onClick={() => setIsOpen(false)}
            className="h-[44px] flex-1 rounded-[8px] border border-border bg-background text-[14px] font-semibold text-muted transition-colors hover:bg-surface"
          >
            나중에
          </button>
          <a
            href={ONBOARDING_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="flex h-[44px] flex-1 items-center justify-center rounded-[8px] bg-main text-[14px] font-semibold text-white transition-colors hover:opacity-90"
          >
            사용법 보기
          </a>
        </div>
      </div>
    </div>
  );
}
