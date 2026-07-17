'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMe } from '@/api/user';

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    // getMe()가 401을 받으면 client.ts의 refresh queue가 자동으로 access/refresh
    // 토큰 유효성을 검증한다 — 갱신 성공 시 재시도해 resolve, 실패 시 자체적으로
    // window.location.href = '/login' 이동까지 처리한다(src/api/client.ts).
    getMe()
      .then(() => router.replace('/workspace'))
      .catch(() => router.replace('/login'));
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center text-[14px] text-muted">
      확인 중...
    </div>
  );
}
