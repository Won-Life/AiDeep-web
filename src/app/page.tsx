'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getMe } from '@/api/user';
import { getRefreshToken } from '@/api/client';

/*
 * CONTEXT
 * - Problem      : 첫 조회가 일시 오류(서버 지연·5xx·네트워크)로 실패하면 바로 /login으로 보냈고,
 *                  /login이 다시 조회하다 또 실패하면 "로그인 정보를 불러오지 못했어요"가 떠서 스플래시 대신 오류 화면이 보였다.
 * - Why          : 인증 확인은 내부 사정이므로 캐릭터 스플래시 + dot loader를 유지한 채 일시 오류만 재시도한다.
 * - Alternatives : 실패 즉시 /login → 일시 오류도 오류 문구로 이어져 기각. 무한 재시도 → 서버 장애 때 무기한 대기.
 * - Trade-offs   : 서버 장애 시 최대 약 7초(1·2·4초 간격 3회) 더 스플래시에 머문 뒤 /login으로 간다.
 * - Edge Case    : refresh 거절로 세션이 정리되면(토큰 없음) 재시도 없이 바로 /login.
 */
export default function Page() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    if (!getRefreshToken()) {
      router.replace('/login');
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const check = (attempt: number) => {
      getMe()
        .then(() => { if (active) router.replace('/workspace'); })
        .catch(() => {
          if (!active) return;
          if (!getRefreshToken() || attempt >= 3) router.replace('/login');
          else timer = setTimeout(() => check(attempt + 1), 1000 * 2 ** attempt);
        });
    };
    check(0);
    return () => { active = false; clearTimeout(timer); };
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
