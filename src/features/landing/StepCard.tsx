import type { Step } from './steps';

export default function StepCard({ step, order }: { step: Step; order: number }) {
  return (
    <li className="flex min-w-0 flex-1 flex-col items-start gap-[14px] rounded-[16px] bg-white p-7">
      <span className="flex size-9 items-center justify-center rounded-full bg-[var(--landing-primary)] text-[16px] leading-[1.5] font-bold text-white">
        {order}
      </span>
      <h3 className="text-[20px] leading-[1.5] font-bold text-[var(--landing-text)]">{step.title}</h3>
      <p className="text-[14px] leading-[1.5] text-[var(--landing-text-muted)]">{step.description}</p>
    </li>
  );
}
