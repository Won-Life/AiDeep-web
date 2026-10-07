'use client';

import { useSyncExternalStore } from 'react';
import { subscribeToasts, getToasts } from './toastStore';

const EMPTY: ReturnType<typeof getToasts> = [];

/** 저장 실패 등 전역 토스트를 하단 중앙에 띄운다 (Figma L3). workspace layout 1곳 마운트. */
export default function ToastHost() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, () => EMPTY);

  if (!items.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2">
      {items.map((t) => (
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
      ))}
    </div>
  );
}
