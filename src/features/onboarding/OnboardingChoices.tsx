'use client';

import Image from 'next/image';

export default function OnboardingChoices<T extends string>({
  options, selected, multiple = false, onSelect,
}: {
  options: { value: T; label: string; description: string }[];
  selected: T[];
  multiple?: boolean;
  onSelect: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">{multiple ? '회의 방식 선택' : '사용 목적 선택'}</legend>
      {options.map((option) => {
        const checked = selected.includes(option.value);
        return (
          <label key={option.value} className={`relative flex min-h-[51px] cursor-pointer items-center gap-[17px] rounded-[35px] border px-[17px] shadow-[var(--onnode-input-shadow)] ${checked ? 'border-[var(--onnode-primary)] ring-1 ring-[var(--onnode-primary)]' : 'border-[var(--onnode-primary-200)]'}`}>
            <input type={multiple ? 'checkbox' : 'radio'} name={multiple ? undefined : 'usage-purpose'}
              value={option.value} checked={checked} onChange={() => onSelect(option.value)}
              className="peer sr-only" />
            <span className={`flex size-4 shrink-0 items-center justify-center ${multiple ? `rounded-[5px] ${checked ? 'bg-[var(--onnode-primary)]' : 'bg-[var(--onnode-primary-200)]'}` : ''}`}>
              {multiple ? <span className="size-[10px] rounded-[3px] bg-[var(--onnode-surface)]" /> :
                <Image src={checked ? '/onnode/onboarding/6cc9e.svg' : '/onnode/onboarding/9c19d.svg'} width={16} height={16} alt="" unoptimized />}
            </span>
            <span className="flex flex-col gap-[2px] py-[9px]">
              <span className="text-[12px] font-semibold leading-[14.4px] text-[var(--onnode-text)]">{option.label}</span>
              <span className="text-[10px] font-light leading-3">{option.description}</span>
            </span>
            <span className="pointer-events-none absolute inset-0 rounded-[35px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-[var(--onnode-primary-700)]" />
          </label>
        );
      })}
    </fieldset>
  );
}
