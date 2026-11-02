'use client';

import Image from 'next/image';
import FeatureTabItem from './FeatureTabItem';
import { FEATURES } from './features';
import { useFeatureTabs } from './useFeatureTabs';

/*
 * 왼쪽 기능 탭 + 오른쪽 기능 화면.
 * 탭 목록은 위에서부터 놓아(시안 위치) 설명 길이가 달라도 위쪽 줄이 흔들리지 않게 한다.
 */
export default function FeatureShowcase() {
  const { activeFeature, select } = useFeatureTabs(FEATURES);

  return (
    <div className="mx-auto grid w-full max-w-[1120px] grid-cols-[320px_1fr] gap-x-12 rounded-[20px] border-2 border-[var(--landing-primary-border)] bg-white p-[39px]">
      <div role="tablist" aria-label="주요 기능" className="mt-[47px] flex flex-col gap-6 self-start">
        {FEATURES.map((feature, index) => (
          <div key={feature.id} role="presentation" className="flex flex-col gap-6">
            {index > 0 ? <div className="h-px w-[320px] bg-[var(--landing-divider)]" /> : null}
            <FeatureTabItem feature={feature} active={feature.id === activeFeature?.id} onSelect={select} />
          </div>
        ))}
      </div>
      <div
        role="tabpanel"
        className="relative aspect-[672/420] self-center overflow-hidden rounded-[12px] border-2 border-[var(--landing-primary-deep)] bg-[var(--landing-placeholder)]"
      >
        {/* 세 장 모두 미리 불러 두고 보이는 것만 바꿔, 처음 탭을 눌러도 빈 틀이 비치지 않게 한다 */}
        {FEATURES.map(({ id, image }) => (
          <Image
            key={id}
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            unoptimized
            loading="eager"
            className={`size-full object-cover ${id === activeFeature?.id ? '' : 'hidden'}`}
          />
        ))}
      </div>
    </div>
  );
}
