'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe } from '@/api/user';
import SessionLoadError from '@/features/auth/SessionLoadError';

export default function Page() {
  const router = useRouter();
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    // 인증 만료 이동은 client가 담당하고 일시적 조회 오류는 현재 화면에서 재시도한다.
    getMe()
      .then(() => { if (active) router.replace('/workspace'); })
      .catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, [router, attempt]);

  if (loadFailed) return <SessionLoadError onRetry={() => {
    setLoadFailed(false);
    setAttempt((value) => value + 1);
  }} />;

  return (
    <div className="flex h-screen w-screen items-center justify-center text-[14px] text-muted">
      확인 중...
    </div>
  );
}
