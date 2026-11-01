'use client';

import { useFitScale } from '../useFitScale';
import TryGuidePanel from './TryGuidePanel';
import TryNodeCanvas from './TryNodeCanvas';

const DEMO_WIDTH = 1120;
const DEMO_HEIGHT = 600;

/*
 * 체험 화면(안내 패널 + 캔버스). 시안 폭(1120px)으로 그린 뒤 창 폭에 맞춰 통째로 줄인다.
 * 좌표로 놓은 그림이라 레이아웃을 흘리는 것보다 비율을 지키는 편이 시안과 같게 보인다.
 */
export default function TryDemo() {
  const { ref, scale } = useFitScale(DEMO_WIDTH);

  return (
    <div ref={ref} className="mx-auto w-full max-w-[1120px]" style={{ height: DEMO_HEIGHT * scale }}>
      <div
        className="flex origin-top-left gap-6"
        style={{ width: DEMO_WIDTH, height: DEMO_HEIGHT, transform: `scale(${scale})` }}
      >
        <TryGuidePanel />
        <TryNodeCanvas />
      </div>
    </div>
  );
}
