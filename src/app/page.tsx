'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getMe } from '@/api/user';
import { getRefreshToken } from '@/api/client';

/*
 * CONTEXT
 * - Problem      : 루트 진입 시 "확인 중..."/"불러오지 못했어요" 텍스트가 떠서 오류처럼 보였다.
 * - Why          : 인증 확인은 내부 사정이므로 캐릭터 스플래시 + dot loader만 보여주고,
 *                  확인 실패는 메시지 없이 /login으로 보낸다 (사용자 지시).
 * - Alternatives : SessionLoadError 유지 → 리디렉션 중에도 오류 문구가 노출되어 기각.
 * - Trade-offs   : 일시적 조회 오류도 로그인 화면으로 떨어진다. 세션이 살아 있으면
 *                  로그인 화면의 자동 복구(기존 refresh queue)가 이어받는다.
 * - Edge Case    : refresh 거절로 세션이 정리된 경우도 동일하게 /login.
 */
export default function Page() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    if (!getRefreshToken()) {
      router.replace('/login');
      return;
    }
    getMe()
      .then(() => { if (active) router.replace('/workspace'); })
      .catch(() => { if (active) router.replace('/login'); });
    return () => { active = false; };
  }, [router]);

  return (
    <div
      className="flex h-screen w-screen flex-col items-center justify-center gap-8"
      style={{ background: 'linear-gradient(135deg, rgb(233 235 248) 0%, rgb(247 245 247) 50%, rgb(250 238 242) 100%)' }}
    >
      <Image
        src="/onnode/splash.png"
        alt="On:Node"
        width={300}
        height={315}
        priority
        className="max-w-[72vw] h-auto mix-blend-multiply"
        style={{
          // 이미지 자체 배경의 사각 경계를 페이지 그라데이션에 녹인다 (가장자리 페더링)
          maskImage: 'radial-gradient(ellipse 54% 54% at 50% 50%, black 70%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 54% 54% at 50% 50%, black 70%, transparent 100%)',
        }}
      />
      <div className="flex gap-2" role="status" aria-label="불러오는 중">
        {[0, 1, 2].map((index) => (
          <span key={index} className="splash-dot" style={{ animationDelay: `${index * 0.15}s` }} />
        ))}
      </div>
      <style>{`
        .splash-dot {
          width: 9px; height: 9px; border-radius: 9999px;
          background: rgb(var(--ds-gray-400));
          animation: splash-wave 1.2s ease-in-out infinite;
        }
        @keyframes splash-wave {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-7px); }
        }
      `}</style>
    </div>
  );
}
