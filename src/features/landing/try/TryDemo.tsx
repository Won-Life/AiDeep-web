'use client';

import { useFitScale } from '../useFitScale';
import LandingButton from '../LandingButton';
import { LOGIN_PATH } from '../landingNav';
import TryGuidePanel from './TryGuidePanel';
import TryNodeCanvas from './TryNodeCanvas';
import { useTryDemo } from './useTryDemo';

const DEMO_WIDTH = 1120;
const DEMO_HEIGHT = 600;

/*
 * 직접 체험(안내 패널 + 캔버스). 시안 폭(1120px)으로 그린 뒤 창 폭에 맞춰 통째로 줄인다.
 * 좌표로 놓은 그림이라 레이아웃을 흘리는 것보다 비율을 지키는 편이 시안과 같게 보인다.
 * 샘플 재생이 끝나면 캔버스만 흐리게 하고 가입을 안내한다(왼쪽 안내는 그대로 눌러 볼 수 있다).
 */
export default function TryDemo() {
  const { ref, scale } = useFitScale(DEMO_WIDTH);
  const demo = useTryDemo();
  const finished = demo.phase === 'done';

  return (
    <div ref={ref} className="mx-auto w-full max-w-[1120px]" style={{ height: DEMO_HEIGHT * scale }}>
      <div className="flex origin-top-left gap-6" style={{ width: DEMO_WIDTH, height: DEMO_HEIGHT, transform: `scale(${scale})` }}>
        <TryGuidePanel demo={demo} />

        <div className="relative h-[600px] w-[736px] shrink-0">
          <div
            inert={finished}
            className={`transition-[filter] duration-500 ${finished ? 'blur-[6px] select-none' : ''}`}
          >
            <TryNodeCanvas data={demo.data} phase={demo.phase} frame={demo.frame} onRecord={demo.startRecording} />
          </div>

          {finished ? (
            <div
              role="region"
              aria-label="체험이 끝났어요"
              tabIndex={-1}
              ref={(node) => node?.focus({ preventScroll: true })}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[16px] bg-white/60 text-center outline-none"
            >
              <p className="text-[22px] leading-[1.4] font-bold text-[var(--landing-text)]">회의가 노드로 정리됐어요</p>
              <p className="text-[15px] leading-[1.5] text-[var(--landing-text-muted)]">
                직접 회의를 녹음하면 이렇게 프로젝트 마인드맵에 쌓여요.
              </p>
              <LandingButton href={LOGIN_PATH} className="mt-1">
                가입하고 회의 해보기
              </LandingButton>
              <button
                type="button"
                onClick={demo.startRecording}
                className="text-[13px] leading-[1.5] text-[var(--landing-text-muted)] underline underline-offset-2 hover:text-[var(--landing-text)]"
              >
                다시 해 보기
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
