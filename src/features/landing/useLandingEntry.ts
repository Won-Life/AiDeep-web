'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { getMe } from '@/api/user';
import { getRefreshToken } from '@/api/client';
import { isCheckingSession } from './landingEntry';

const subscribeNothing = () => () => {};

/*
 * CONTEXT
 * - Problem      : 루트(/)가 로그인 확인 후 바로 리디렉션만 하던 화면에서, 비로그인 방문자에게 랜딩을 보여주는 화면이 됐다.
 * - Why          : 랜딩 HTML은 서버가 그대로 내려주고(검색 노출·첫 화면 속도), 로그인 여부는 브라우저에서만 안다.
 *                  토큰 읽기를 useSyncExternalStore로 해서 서버 스냅샷(false)과 하이드레이션이 어긋나지 않게 한다.
 * - Trade-offs   : 로그인한 사용자는 첫 페인트에 랜딩이 잠깐 보일 수 있다(토큰 확인 직후 스플래시가 덮는다).
 * - Edge Case    : 조회가 거절되면(만료 등) 로그인 화면이 아니라 랜딩에 남는다.
 */
export function useLandingEntry(): { checking: boolean } {
  const router = useRouter();
  const hasToken = useSyncExternalStore(subscribeNothing, () => !!getRefreshToken(), () => false);
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    if (!hasToken) return;
    let active = true;
    getMe()
      .then(() => { if (active) router.replace('/workspace'); })
      .catch(() => { if (active) setRejected(true); });
    return () => { active = false; };
  }, [hasToken, router]);

  return { checking: isCheckingSession({ hasToken, rejected }) };
}
