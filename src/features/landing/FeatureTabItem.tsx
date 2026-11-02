import Image from 'next/image';
import type { Feature } from './features';

type FeatureTabItemProps = {
  feature: Feature;
  active: boolean;
  onSelect: (id: string) => void;
};

/**
 * 기능 탭 한 줄. 활성이면 파란 막대와 설명이 보이고 제목이 진해진다.
 * 막대(3px)+안쪽 여백(16px)과 비활성 왼쪽 여백(19px)을 맞춰 활성/비활성이 같은 줄에 선다.
 */
export default function FeatureTabItem({ feature, active, onSelect }: FeatureTabItemProps) {
  const { icon, title, description } = feature;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onSelect(feature.id)}
      className={`flex w-[320px] flex-col items-start text-left ${
        active ? 'border-l-[3px] border-[var(--landing-primary)] pl-4' : 'pl-[19px]'
      }`}
    >
      {/* 아이콘 그림은 칸보다 1px씩 바깥으로 번지는 모양이라 활성일 때만 시안대로 1px 당긴다 */}
      <span aria-hidden className="relative block h-8 w-full">
        <Image
          src={icon.src}
          alt=""
          width={icon.width}
          height={icon.height}
          unoptimized
          className={`absolute max-w-none ${active ? '-top-px -left-px' : 'top-0 left-0'}`}
        />
      </span>
      <span
        className={`text-[18px] leading-[1.5] font-bold ${
          active ? 'text-[var(--landing-text)]' : 'text-[var(--landing-text-muted)]'
        }`}
      >
        {title}
      </span>
      {active ? (
        <span className="mt-2 text-[14px] leading-[1.5] text-[var(--landing-text-muted)]">{description}</span>
      ) : null}
    </button>
  );
}
