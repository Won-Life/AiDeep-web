import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import Image from 'next/image';

/*
 * CONTEXT
 * - Problem      : Figma 08 X1/X4 시안은 상단에 On:Node 브랜드 로고(파란 음파 마크 +
 *                  워드마크)를 둔다. 앱에는 이 애셋이 없어 사이드바에 로고 행이 비어 있었다.
 * - Why          : 브랜드 마크를 별도 파일(png/svg) 대신 인라인 SVG로 둔다 — 색을 디자인
 *                  토큰(--ds-main-blue)에 묶어 테마/리브랜딩에 자동 추종하고, 레일(24~28px)과
 *                  헤더(24px) 양쪽에서 size prop만으로 재사용한다.
 * - Alternatives : public/*.svg 파일 임포트 — 색이 하드코딩돼 토큰과 어긋나고, 레일/헤더
 *                  크기 변형마다 파일이 늘어 기각.
 * - Trade-offs   : 로고 형상이 코드에 박혀 디자이너가 직접 못 바꾼다. MVP 단계라 수용.
 * - Edge Case    : 음파 막대는 좌우 대칭(가운데가 가장 큼)으로 viewBox 비율 고정 — size가
 *                  바뀌어도 막대 비율이 일정하게 유지된다.
 */

/** On:Node 브랜드 마크 — 파란 라운드 사각형(레일에서는 원형) + 흰 이퀄라이저(음파) 막대 */
export function OnNodeMark({ size = 28, round = false }: { size?: number; round?: boolean }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: round ? '50%' : Math.round(size * 0.3),
        backgroundColor: round ? '#607AFF' : 'rgb(var(--ds-main-blue))',
      }}
      aria-hidden="true"
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 20 20" fill="#fff">
        <rect x="1" y="6.5" width="2.6" height="7" rx="1.3" />
        <rect x="5" y="4.5" width="2.6" height="11" rx="1.3" />
        <rect x="8.7" y="2.5" width="2.6" height="15" rx="1.3" />
        <rect x="12.4" y="4.5" width="2.6" height="11" rx="1.3" />
        <rect x="16.4" y="6.5" width="2.6" height="7" rx="1.3" />
      </svg>
    </span>
  );
}

export const sidebarFont = localFont({
  src: '../../../../public/onnode/fonts/PretendardVariable.woff2',
  display: 'swap', weight: '100 900',
});

/*
 * CONTEXT
 * - Problem      : X1 이미지와 현재 사이드바의 로고·간격·프로필 형태가 다르다.
 * - Why          : 기존 로고 SVG와 로컬 Pretendard를 사용하고 240px 시안의 치수를 적용한다.
 * - Alternatives : 캡처를 배경으로 사용하면 실제 데이터와 검색·선택 동작이 사라진다.
 * - Trade-offs   : 디자인은 시안을 따르지만 이름과 회의 보유 상태는 실제 데이터를 따른다.
 * - Edge Case    : 긴 이름·이메일은 말줄임하며 접힌 레일과 드롭다운 동작은 유지한다.
 */
export function OnNodeLogo() {
  return <span role="img" aria-label="On:Node" className="sidebar-logo" />;
}


export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span className="sidebar-avatar" role="img" aria-label={`${name || '사용자'} 프로필`} style={{ width: size, height: size }}>
      <svg width="100%" height="100%" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#C3CDFF" />
        <ellipse cx="11.5" cy="16" rx="1.7" ry="3" fill="#111111" />
        <ellipse cx="20.5" cy="16" rx="1.7" ry="3" fill="#111111" />
      </svg>
    </span>
  );
}

export function MenuItem({
  children,
  onClick,
  disabled,
  title,
  className = 'text-foreground',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface disabled:opacity-50 disabled:hover:bg-transparent ${className}`}
    >
      {children}
    </button>
  );
}

export function SidebarIcon({ name, width, height = width, className }: { name: 'search' | 'ai-chat' | 'help'; width: number; height?: number; className?: string }) {
  return <Image src={`/onnode/sidebar/${name}.svg`} alt="" width={width} height={height} unoptimized aria-hidden className={`shrink-0 ${className ?? ''}`} />;
}
