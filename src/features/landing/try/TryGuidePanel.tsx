'use client';

import TryGuideStep from './TryGuideStep';
import { GUIDE_INTRO, GUIDE_STEPS } from './tryGuide';
import type { TryDemo } from './useTryDemo';

/** 체험 화면 왼쪽 "따라 해 보세요" 안내. 단계는 순서대로 열리는 아코디언이다. */
export default function TryGuidePanel({ demo }: { demo: TryDemo }) {
  const { data, openIndex, touched, submit, toggle, reset } = demo;

  return (
    <aside className="flex h-[600px] w-[360px] flex-col items-start gap-[10px] overflow-hidden rounded-[16px] border border-[var(--landing-divider)] bg-white px-6 py-5">
      <div className="flex w-[312px] items-center justify-between">
        <h3 className="text-[16px] leading-[1.5] font-bold whitespace-nowrap text-[var(--landing-text)]">따라 해 보세요</h3>
        {touched ? (
          <button
            type="button"
            onClick={reset}
            className="text-[12px] leading-[1.5] text-[var(--landing-text-muted)] underline underline-offset-2 hover:text-[var(--landing-text)]"
          >
            처음부터 다시
          </button>
        ) : null}
      </div>
      <p className="w-[312px] text-[13px] leading-[1.5] text-[var(--landing-text-muted)]">{GUIDE_INTRO}</p>

      {GUIDE_STEPS.map((step, index) => (
        <TryGuideStep
          key={step.id}
          step={step}
          index={index}
          data={data}
          open={openIndex === index}
          touched={touched}
          onToggle={() => toggle(index)}
          onSubmit={(raw) => submit(index, raw)}
        />
      ))}
    </aside>
  );
}
