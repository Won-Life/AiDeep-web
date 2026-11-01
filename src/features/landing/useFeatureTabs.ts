'use client';

import { useState } from 'react';
import type { Feature } from './features';

/** 주요 기능 탭: 선택한 기능을 기억하고, 처음에는 첫 항목을 연다. */
export function useFeatureTabs(features: readonly Feature[]) {
  const [activeId, setActiveId] = useState(features[0]?.id);
  const activeFeature = features.find((feature) => feature.id === activeId) ?? features[0];

  return { activeFeature, select: setActiveId };
}
