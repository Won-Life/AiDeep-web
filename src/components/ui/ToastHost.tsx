'use client';

import { useSyncExternalStore } from 'react';
import { pendingSaves } from './saveRetryStore';
import { subscribeToasts, getToasts } from './toastStore';

const EMPTY: ReturnType<typeof getToasts> = [];

/** 저장 실패 등 전역 토스트를 하단 중앙에 띄운다 (Figma L3). workspace layout 1곳 마운트. */
export default function ToastHost() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, () => EMPTY);

  const pending = useSyncExternalStore(pendingSaves.subscribe, pendingSaves.getCount, () => 0);

  if (!items.length && !pending) return null;

  return (
    <>
    {pending > 0 && <div role="status" className="fixed right-8 bottom-[26%] z-[70] flex max-w-[calc(100vw-32px)] items-center gap-2 rounded-full bg-[#4062E5] px-6 py-3 text-[13px] text-white shadow-md">
      저장하지 못했어요
      <button type="button" className="font-semibold underline underline-offset-2" onClick={() => { void pendingSaves.retry(); }}>다시 시도</button>
    </div>}
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2">
      {items.map((t) =>
        t.variant === 'announce' ? (
          // 알림 토스트 (Figma 08) — 파란 라운드 필 + 확성기 아이콘
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-[var(--onnode-primary-600)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-md"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m3 11 18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
            </svg>
            {t.message}
          </div>
        ) : (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2 rounded-[10px] bg-foreground px-4 py-2.5 text-[13px] font-medium text-background shadow-md"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {t.message}
          </div>
        ),
      )}
    </div>
    </>
  );
}
