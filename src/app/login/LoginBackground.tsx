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
// rotate는 부유 애니메이션(transform)과 겹치지 않도록 내부 래퍼에 적용한다.
type GraphVariant = 'chain' | 'tree' | 'hub' | 'zigzag' | 'branch';

const CLUSTERS: Array<{
  className: string; // 위치·크기 (Tailwind arbitrary)
  style: CSSProperties; // animationDelay·animationDuration
  rotate: number; // 내부 래퍼 회전 각도 (deg)
  variant: GraphVariant;
}> = [
  { className: 'left-[6%] top-[12%] w-[180px]', style: { animationDelay: '0s', animationDuration: '16s' }, rotate: -6, variant: 'tree' },
  { className: 'left-[10%] bottom-[14%] w-[150px]', style: { animationDelay: '-5s', animationDuration: '19s' }, rotate: 8, variant: 'hub' },
  { className: 'right-[7%] top-[18%] w-[160px]', style: { animationDelay: '-9s', animationDuration: '14s' }, rotate: 5, variant: 'zigzag' },
  { className: 'right-[9%] bottom-[10%] w-[190px]', style: { animationDelay: '-3s', animationDuration: '18s' }, rotate: -4, variant: 'branch' },
  { className: 'left-[38%] top-[4%] hidden w-[120px] md:block', style: { animationDelay: '-12s', animationDuration: '20s' }, rotate: 10, variant: 'chain' },
  { className: 'right-[36%] bottom-[3%] hidden w-[140px] md:block', style: { animationDelay: '-7s', animationDuration: '15s' }, rotate: -9, variant: 'hub' },
];

// 미니 마인드맵 일러스트 — 엣지는 gray-700, 노드는 그린/회색 저투명도.
// 변형 5종: chain(3노드 꺾은선), tree(1→3 분기), hub(중심 방사형),
// zigzag(4노드 지그재그), branch(체인 중간 분기) — 같은 모양 반복으로 단조로워 보이지 않게.
function MiniGraph({ variant }: { variant: GraphVariant }) {
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
  if (variant === 'hub') {
    return (
      <svg viewBox="0 0 130 110" fill="none" className="h-auto w-full">
        <path d="M65 55 L22 30 M65 55 L104 22 M65 55 L114 78 M65 55 L38 92" stroke={edge} strokeWidth="1.5" opacity="0.5" />
        <circle cx="65" cy="55" r="9" fill={green} opacity="0.5" />
        <circle cx="22" cy="30" r="5" fill={gray} opacity="0.4" />
        <circle cx="104" cy="22" r="6" fill={green} opacity="0.3" />
        <circle cx="114" cy="78" r="5" fill={gray} opacity="0.4" />
        <circle cx="38" cy="92" r="6" fill={green} opacity="0.35" />
      </svg>
    );
  }
  if (variant === 'zigzag') {
    return (
      <svg viewBox="0 0 150 70" fill="none" className="h-auto w-full">
        <path d="M10 55 L50 18 L95 50 L140 15" stroke={edge} strokeWidth="1.5" opacity="0.5" />
        <circle cx="10" cy="55" r="4" fill={gray} opacity="0.4" />
        <circle cx="50" cy="18" r="7" fill={green} opacity="0.45" />
        <circle cx="95" cy="50" r="6" fill={green} opacity="0.3" />
        <circle cx="140" cy="15" r="5" fill={gray} opacity="0.4" />
      </svg>
    );
  }
  if (variant === 'branch') {
    return (
      <svg viewBox="0 0 130 100" fill="none" className="h-auto w-full">
        <path d="M15 85 L55 55 L95 30 M55 55 L105 75" stroke={edge} strokeWidth="1.5" opacity="0.5" />
        <circle cx="15" cy="85" r="5" fill={gray} opacity="0.4" />
        <circle cx="55" cy="55" r="8" fill={green} opacity="0.5" />
        <circle cx="95" cy="30" r="6" fill={green} opacity="0.3" />
        <circle cx="105" cy="75" r="5" fill={gray} opacity="0.4" />
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
          <div style={{ transform: `rotate(${c.rotate}deg)` }}>
            <MiniGraph variant={c.variant} />
          </div>
        </div>
      ))}
    </div>
  );
}
