'use client';

import { useEffect, useRef, useState } from 'react';
import { fitScale } from './fitScale';

/** 고정 폭(시안)으로 그린 화면을 담는 틀의 폭을 지켜보다가, 맞는 배율을 돌려준다. */
export function useFitScale(designWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(fitScale(entry.contentRect.width, designWidth));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [designWidth]);

  return { ref, scale };
}
