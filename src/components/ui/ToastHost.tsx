'use client';

import { useSyncExternalStore } from 'react';
import { pendingSaves } from './saveRetryStore';
import { subscribeToasts, getToasts } from './toastStore';

const EMPTY: ReturnType<typeof getToasts> = [];

/** 전역 토스트. 안내는 하단 중앙(Figma L3), 알림·저장 실패는 오른쪽 아래(Figma S1). workspace layout 1곳 마운트. */
export default function ToastHost() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, () => EMPTY);

  const pending = useSyncExternalStore(pendingSaves.subscribe, pendingSaves.getCount, () => 0);

  if (!items.length && !pending) return null;

  const announces = items.filter((t) => t.variant === 'announce');
  const infos = items.filter((t) => t.variant !== 'announce');

  return (
    <>
      {/* 오른쪽 알림 영역(Figma S1) — 저장 실패 안내와 회의 노드 생성 같은 알림이 같은 자리에 쌓인다 */}
      {(pending > 0 || announces.length > 0) && (
        <div className="pointer-events-none fixed right-8 bottom-[26%] z-[70] flex max-w-[calc(100vw-32px)] flex-col items-end gap-2">
          {pending > 0 && (
            <div role="status" className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#4062E5] px-6 py-3 text-[13px] text-white shadow-md">
              저장하지 못했어요
              <button type="button" className="font-semibold underline underline-offset-2" onClick={() => { void pendingSaves.retry(); }}>다시 시도</button>
            </div>
          )}
          {announces.map((t) => (
            <div key={t.id} role="status" className="pointer-events-auto rounded-full bg-[#4062E5] px-6 py-3 text-[13px] font-semibold text-white shadow-md">
              {t.message}
            </div>
          ))}
        </div>
      )}
      {infos.length > 0 && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2">
          {infos.map((t) => (
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
      )}
    </>
  );
}
