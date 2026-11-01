type SectionHeaderProps = {
  title: string;
  description?: string;
  className?: string;
};

/** 섹션 제목(32px 굵게)과 선택 설명(16px). 랜딩 섹션들이 같이 쓴다. */
export default function SectionHeader({ title, description, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex flex-col items-center gap-3 text-center ${className}`}>
      <h2 className="text-[32px] leading-[1.5] font-bold text-[var(--landing-text)]">{title}</h2>
      {description ? (
        <p className="text-[16px] leading-[1.5] text-[var(--landing-text-muted)]">{description}</p>
      ) : null}
    </div>
  );
}
