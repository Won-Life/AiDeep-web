import { ACTIVE_STEP, GUIDE_INTRO, NEXT_STEPS } from './tryGuide';

/** 체험 화면 왼쪽 "따라 해 보세요" 안내. 화면만 있고 동작은 없다. */
export default function TryGuidePanel() {
  return (
    <aside className="flex h-[600px] w-[360px] flex-col items-start gap-[10px] overflow-hidden rounded-[16px] border border-[var(--landing-divider)] bg-white px-6 py-5">
      <h3 className="text-[16px] leading-[1.5] font-bold whitespace-nowrap text-[var(--landing-text)]">따라 해 보세요</h3>
      <p className="w-[312px] text-[13px] leading-[1.5] text-[var(--landing-text-muted)]">{GUIDE_INTRO}</p>

      <div className="flex w-[312px] shrink-0 flex-col items-start gap-[10px] rounded-[12px] border-2 border-[var(--landing-primary)] bg-white p-4">
        <div className="flex items-center gap-[10px]">
          <span className="flex size-[26px] items-center justify-center rounded-full bg-[var(--landing-primary)] text-[12px] leading-[1.5] font-bold text-white">
            1
          </span>
          <p className="text-[15px] leading-[1.5] font-bold whitespace-nowrap text-[var(--landing-text)]">{ACTIVE_STEP.title}</p>
        </div>
        <p className="w-[280px] text-[13px] leading-[1.5] text-[var(--landing-text-muted)]">{ACTIVE_STEP.description}</p>
        <div className="w-[280px] rounded-[10px] border border-[var(--landing-divider)] bg-white px-3 py-[10px]">
          <p className="text-[13px] leading-[1.5] whitespace-nowrap text-[var(--landing-input-placeholder)]">{ACTIVE_STEP.placeholder}</p>
        </div>
        <p className="rounded-[8px] bg-[var(--landing-primary)] px-4 py-[9px] text-[13px] leading-[1.5] font-medium whitespace-nowrap text-white">
          {ACTIVE_STEP.actionLabel}
        </p>
      </div>

      {NEXT_STEPS.map((step, index) => (
        <div
          key={step.id}
          className="flex w-[312px] shrink-0 flex-col items-start gap-1 rounded-[12px] border border-[var(--landing-divider)] bg-[var(--landing-guide-bg)] px-4 py-3"
        >
          <div className="flex items-center gap-[10px]">
            <span className="flex size-[26px] items-center justify-center rounded-full bg-[var(--landing-placeholder)] text-[12px] leading-[1.5] font-bold text-[var(--landing-text-muted)]">
              {index + 2}
            </span>
            <p className="text-[14px] leading-[1.5] font-bold whitespace-nowrap text-[var(--landing-text-muted)]">{step.title}</p>
          </div>
          <p className="w-[276px] text-[12px] leading-[1.5] text-[var(--landing-text-muted)]">{step.description}</p>
        </div>
      ))}
    </aside>
  );
}
