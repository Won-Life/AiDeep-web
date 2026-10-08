'use client';

import { useSyncExternalStore } from 'react';

/*
 * CONTEXT
 * - Problem      : 오프라인 상태에서도 사용자는 노드를 편집·이동하지만 저장(REST/WS)이
 *                  실패해 변경이 유실된다. 상태를 알 방법이 없었다 (Figma L3 미구현).
 * - Why          : navigator.onLine + online/offline 이벤트를 useSyncExternalStore로 구독해
 *                  오프라인일 때만 상단 배너를 띄운다. 전역(workspace layout) 1곳 마운트.
 * - Alternatives : 주기적 핑으로 실제 연결성 확인 — navigator.onLine은 LAN만 봐 false
 *                  positive 가능하나, MVP엔 과함. 이벤트 기반으로 충분.
 * - Trade-offs   : navigator.onLine의 한계(프록시/캡티브 포털 오탐)를 수용.
 * - Edge Case    : SSR(window 없음) — getServerSnapshot은 true(온라인)로 고정해
 *                  하이드레이션 불일치·초기 깜빡임을 막는다.
 */

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export default function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  if (online) return null;

  return (
    <div className="pointer-events-none fixed top-3 left-1/2 z-[60] -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-[12.5px] font-medium text-amber-700 shadow-md">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        오프라인 상태예요 · 변경사항이 저장되지 않을 수 있어요
      </div>
    </div>
  );
}
