'use client';

import { useId } from 'react';
import type { GuideStep } from './tryGuide';
import TryStepForm from './TryStepForm';
import { MAX_CONTENTS, completedSteps, isStepUnlocked, type DemoData } from './tryDemoState';

type TryGuideStepProps = {
  step: GuideStep;
  index: number;
  data: DemoData;
  open: boolean;
  touched: boolean;
  onToggle: () => void;
  onSubmit: (raw: string) => boolean;
};

/** 접힌 줄에 보여 줄, 이미 만든 노드 이름 */
function summaryOf(step: GuideStep, data: DemoData): string {
  if (step.id === 'project') return data.project;
  if (step.id === 'title') return data.title;
  return `${data.contents.length}개`;
}

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 6.5 5 9l4.5-5.5" />
    </svg>
  );
}

/** 안내 한 단계. 제목 줄을 누르면 펼쳐지고, 앞 단계를 끝내기 전에는 잠겨 있다. */
export default function TryGuideStep({ step, index, data, open, touched, onToggle, onSubmit }: TryGuideStepProps) {
  const bodyId = useId();
  const done = index < completedSteps(data);
  const locked = !isStepUnlocked(data, index);
  const { input } = step;
  const full = step.id === 'content' && data.contents.length >= MAX_CONTENTS;
  const initialValue = step.id === 'project' ? data.project : step.id === 'title' ? data.title : '';

  return (
    <div
      className={`flex w-[312px] shrink-0 flex-col items-start rounded-[12px] ${
        open
          ? 'gap-[10px] border-2 border-[var(--landing-primary)] bg-white p-4'
          : 'gap-1 border border-[var(--landing-divider)] bg-[var(--landing-guide-bg)] px-4 py-3'
      } ${locked ? 'opacity-70' : ''}`}
    >
      <button
        type="button"
        disabled={locked}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
        className="flex w-full items-center gap-[10px] text-left disabled:cursor-not-allowed"
      >
        <span
          className={`flex size-[26px] shrink-0 items-center justify-center rounded-full text-[12px] leading-[1.5] font-bold ${
            open || done
              ? 'bg-[var(--landing-primary)] text-white'
              : 'bg-[var(--landing-placeholder)] text-[var(--landing-text-muted)]'
          }`}
        >
          {done && !open ? <CheckIcon /> : index + 1}
        </span>
        <span
          className={`font-bold whitespace-nowrap ${
            open ? 'text-[15px] text-[var(--landing-text)]' : 'text-[14px] text-[var(--landing-text-muted)]'
          } leading-[1.5]`}
        >
          {step.title}
        </span>
      </button>

      {open ? (
        <div id={bodyId} role="region" aria-label={step.title} className="flex flex-col items-start gap-[10px]">
          <p className="w-[280px] text-[13px] leading-[1.5] text-[var(--landing-text-muted)]">{step.description}</p>
          {input ? (
            <TryStepForm
              label={step.title}
              placeholder={input.placeholder}
              actionLabel={input.actionLabel}
              maxLength={input.maxLength}
              initialValue={initialValue}
              clearOnSubmit={step.id === 'content'}
              blockedMessage={full ? '콘텐츠 노드를 모두 놓았어요. 위의 "처음부터 다시"로 다시 해 볼 수 있어요.' : undefined}
              focusOnOpen={touched}
              onSubmit={onSubmit}
            />
          ) : null}
          {step.id === 'content' && data.contents.length > 0 && !full ? (
            <p className="text-[12px] leading-[1.5] text-[var(--landing-text-muted)]">
              만든 콘텐츠 노드 {data.contents.length}/{MAX_CONTENTS} · 더 만들어 보세요
            </p>
          ) : null}
        </div>
      ) : (
        <p id={bodyId} className="w-[276px] text-[12px] leading-[1.5] text-[var(--landing-text-muted)]">
          {done ? `만든 노드: ${summaryOf(step, data)}` : step.description}
        </p>
      )}
    </div>
  );
}
