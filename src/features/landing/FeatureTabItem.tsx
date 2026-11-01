import type { Feature } from './features';

type FeatureTabItemProps = {
  feature: Feature;
  active: boolean;
  onSelect: (id: string) => void;
};

/** 기능 탭 한 줄. 활성이면 파란 막대·아이콘·설명이 보이고, 아니면 회색 제목만 보인다. */
export default function FeatureTabItem({ feature, active, onSelect }: FeatureTabItemProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onSelect(feature.id)}
      className={`flex w-[320px] flex-col items-start gap-2 text-left ${
        active ? 'border-l-[3px] border-[var(--landing-primary)] pl-4' : ''
      }`}
    >
      <span
        aria-hidden
        className={`size-6 rounded-[6px] ${active ? 'bg-[var(--landing-primary)]' : 'bg-[var(--landing-placeholder)]'}`}
      />
      <span
        className={`text-[18px] leading-[1.5] font-bold ${
          active ? 'text-[var(--landing-text)]' : 'text-[var(--landing-text-muted)]'
        }`}
      >
        {feature.title}
      </span>
      {active && feature.description ? (
        <span className="text-[14px] leading-[1.5] text-[var(--landing-text-muted)]">{feature.description}</span>
      ) : null}
    </button>
  );
}
