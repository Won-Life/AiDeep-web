'use client';

import type { CSSProperties } from 'react';

/*
 * CONTEXT
 * - Problem      : 로그인 페이지가 흰 배경 + 넓은 카드뿐이라 제품 정체성(마인드맵)이 드러나지 않음.
 * - Why          : 미니 그래프 SVG 클러스터 + 그린 글로우를 장식 레이어로 깔면 토큰만으로 라이트/다크
 *                  자동 대응되고, CSS-only 애니메이션이라 성능·번들 비용이 사실상 0이다.
 * - Alternatives : canvas/JS 애니메이션(과함), 이미지 에셋(다크 대응·용량 불리).
 * - Trade-offs   : 표현력은 제한적이지만 유지보수·접근성(정적 폴백)이 단순해진다.
 * - Edge Case    : prefers-reduced-motion(motion-safe로 정지), 모바일(중앙 상하단 클러스터 숨김),
 *                  다크 모드(토큰 자동 전환).
 */

// 클러스터 배치 — 중앙(카드 영역)을 피해서 가장자리에만 둔다. 렌더마다 동일해야 하므로 모듈 상수.
// delay·duration은 Tailwind arbitrary property 대신 인라인 style — animate-[...] 쇼트핸드와의
// CSS 생성 순서 경합을 피해 클러스터별 주기를 결정적으로 보장한다.
const CLUSTERS: Array<{
  className: string; // 위치·크기 (Tailwind arbitrary)
  style: CSSProperties; // animationDelay·animationDuration
  variant: 'chain' | 'tree';
}> = [
  { className: 'left-[6%] top-[12%] w-[180px]', style: { animationDelay: '0s', animationDuration: '16s' }, variant: 'tree' },
  { className: 'left-[10%] bottom-[14%] w-[140px]', style: { animationDelay: '-5s', animationDuration: '19s' }, variant: 'chain' },
  { className: 'right-[7%] top-[18%] w-[150px]', style: { animationDelay: '-9s', animationDuration: '14s' }, variant: 'chain' },
  { className: 'right-[9%] bottom-[10%] w-[190px]', style: { animationDelay: '-3s', animationDuration: '18s' }, variant: 'tree' },
  { className: 'left-[38%] top-[4%] hidden w-[120px] md:block', style: { animationDelay: '-12s', animationDuration: '20s' }, variant: 'chain' },
  { className: 'right-[36%] bottom-[3%] hidden w-[130px] md:block', style: { animationDelay: '-7s', animationDuration: '15s' }, variant: 'chain' },
];

// 미니 마인드맵 일러스트 — 엣지는 gray-700, 노드는 그린/회색 저투명도
function MiniGraph({ variant }: { variant: 'chain' | 'tree' }) {
  const edge = 'rgb(var(--ds-gray-700))';
  const green = 'rgb(var(--ds-main))';
  const gray = 'rgb(var(--ds-gray-500))';
  if (variant === 'chain') {
    return (
      <svg viewBox="0 0 120 60" fill="none" className="h-auto w-full">
        <path d="M14 40 L52 22 L98 34" stroke={edge} strokeWidth="1.5" opacity="0.5" />
        <circle cx="14" cy="40" r="6" fill={green} opacity="0.35" />
        <circle cx="52" cy="22" r="8" fill={green} opacity="0.5" />
        <circle cx="98" cy="34" r="5" fill={gray} opacity="0.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 140 90" fill="none" className="h-auto w-full">
      <path d="M70 24 L34 58 M70 24 L74 66 M70 24 L112 50" stroke={edge} strokeWidth="1.5" opacity="0.5" />
      <circle cx="70" cy="24" r="9" fill={green} opacity="0.5" />
      <circle cx="34" cy="58" r="6" fill={gray} opacity="0.4" />
      <circle cx="74" cy="66" r="5" fill={green} opacity="0.3" />
      <circle cx="112" cy="50" r="6" fill={gray} opacity="0.4" />
    </svg>
  );
}

// 로그인 페이지 전용 장식 배경 — 상호작용·스크린리더 대상 아님
export default function LoginBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* 그린 라디얼 글로우 2개 — 모서리에서 은은하게 번짐 */}
      <div
        className="absolute -left-[10%] -top-[15%] h-[55vh] w-[55vw]"
        style={{ background: 'radial-gradient(closest-side, rgb(var(--ds-main) / 0.10), transparent)' }}
      />
      <div
        className="absolute -bottom-[20%] -right-[12%] h-[60vh] w-[50vw]"
        style={{ background: 'radial-gradient(closest-side, rgb(var(--ds-main) / 0.08), transparent)' }}
      />
      {/* 부유하는 미니 그래프 클러스터 */}
      {CLUSTERS.map((c, i) => (
        <div
          key={i}
          className={`absolute motion-safe:animate-[login-float_16s_ease-in-out_infinite] ${c.className}`}
          style={c.style}
        >
          <MiniGraph variant={c.variant} />
        </div>
      ))}
    </div>
  );
}
