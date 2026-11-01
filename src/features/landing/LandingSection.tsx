import type { ReactNode } from 'react';

type LandingSectionProps = {
  /** 상단 메뉴가 스크롤로 찾아오는 앵커 */
  id?: string;
  className?: string;
  children: ReactNode;
};

/** 랜딩 섹션 공통 틀: 1440px 시안 기준 가운데 정렬 */
export default function LandingSection({ id, className = '', children }: LandingSectionProps) {
  return (
    <section id={id} className={`scroll-mt-[92px] ${className}`}>
      <div className="mx-auto w-full max-w-[1440px]">{children}</div>
    </section>
  );
}
