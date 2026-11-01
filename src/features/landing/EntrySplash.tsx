import Image from 'next/image';

/** 로그인 확인 중에 랜딩을 덮는 스플래시. 기존 루트 화면과 같은 모양이다. */
export default function EntrySplash() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8"
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
