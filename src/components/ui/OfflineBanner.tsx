'use client';

import { pendingSaves } from './saveRetryStore';
import { useEffect, useSyncExternalStore } from 'react';

/*
 * CONTEXT
 * - Problem      : 오프라인 상태에서도 사용자는 노드를 편집·이동하지만 저장(REST/WS)이
 *                  실패해 변경이 유실된다. 상태를 알 방법이 없었다 (Figma L3 미구현).
 * - Why          : navigator.onLine + online/offline 이벤트를 useSyncExternalStore로 구독해
 *                  오프라인일 때 시안의 파란 배너를 띄우고 재연결 시 대기 저장을 재시도한다.
 * - Alternatives : 주기적 핑으로 실제 연결성 확인 — navigator.onLine은 LAN만 봐 false
 *                  positive 가능하나, MVP엔 과함. 이벤트 기반으로 충분.
 * - Trade-offs   : navigator.onLine의 한계를 수용하며 대기 중 그래프 변경은 현재 탭 메모리에만 보관한다.
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

  useEffect(() => { if (online) void pendingSaves.retry(); }, [online]);

  if (online) return null;

  return (
    <div className="pointer-events-none fixed top-8 left-1/2 z-[60] -translate-x-1/2">
      <div role="status" className="flex max-w-[calc(100vw-32px)] items-center gap-2 rounded-full bg-[#3458BF] px-7 py-[14px] text-[13px] font-medium text-white shadow-md">
        <svg className="shrink-0" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M3 7a14 14 0 0 1 11 3M3 12a9 9 0 0 1 9 9M3 17a4 4 0 0 1 4 4M3 21h.01" />
          <circle cx="18" cy="6" r="4" /><path d="M18 4v2m0 2h.01M3 3l18 18" />
        </svg>
        인터넷 연결이 끊겼어요 · 연결되면 변경사항이 자동으로 저장돼요

      </div>
    </div>
  );
}
