'use client';

import Image from 'next/image';
import FeatureTabItem from './FeatureTabItem';
import { FEATURES } from './features';
import { useFeatureTabs } from './useFeatureTabs';

/** 왼쪽 기능 탭 + 오른쪽 기능 화면. 화면 이미지는 아직 없어 회색 빈 틀로 둔다. */
export default function FeatureShowcase() {
  const { activeFeature, select } = useFeatureTabs(FEATURES);

  return (
    <div className="mx-auto grid w-full max-w-[1120px] grid-cols-[320px_1fr] items-center gap-x-12 rounded-[20px] border-2 border-[var(--landing-primary-border)] bg-white p-[39px]">
      <div role="tablist" aria-label="주요 기능" className="flex flex-col gap-6">
        {FEATURES.map((feature, index) => (
          <div key={feature.id} role="presentation" className="flex flex-col gap-6">
            {index > 0 ? <div className="h-px w-[320px] bg-[var(--landing-divider)]" /> : null}
            <FeatureTabItem feature={feature} active={feature.id === activeFeature?.id} onSelect={select} />
          </div>
        ))}
      </div>
      <div role="tabpanel" className="relative h-[420px] overflow-hidden rounded-[12px] bg-[var(--landing-placeholder)]">
        {activeFeature?.image ? (
          <Image src={activeFeature.image.src} alt={activeFeature.image.alt} fill className="object-cover" />
        ) : null}
      </div>
    </div>
  );
}
