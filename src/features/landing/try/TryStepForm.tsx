'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { normalizeLabel } from './tryDemoState';

type TryStepFormProps = {
  label: string;
  placeholder: string;
  actionLabel: string;
  maxLength: number;
  /** 이미 만든 단계를 다시 열었을 때 채워 둘 값 */
  initialValue?: string;
  /** 반영되면 입력칸을 비운다(콘텐츠처럼 여러 개를 더하는 단계) */
  clearOnSubmit?: boolean;
  /** 더 만들 수 없을 때 이유를 보여 주고 막는다 */
  blockedMessage?: string;
  /** 사용자가 이미 체험을 만졌을 때만 열리자마자 입력칸으로 커서를 옮긴다 */
  focusOnOpen: boolean;
  onSubmit: (raw: string) => boolean;
};

/** 체험 단계 안의 입력칸 + 버튼. Enter로도 만들어진다. */
export default function TryStepForm({
  label,
  placeholder,
  actionLabel,
  maxLength,
  initialValue = '',
  clearOnSubmit = false,
  blockedMessage,
  focusOnOpen,
  onSubmit,
}: TryStepFormProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const blocked = Boolean(blockedMessage);

  useEffect(() => {
    if (focusOnOpen) inputRef.current?.focus({ preventScroll: true });
  }, [focusOnOpen]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (blocked || onSubmit(value) === false) return;
    if (clearOnSubmit) setValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-[280px] flex-col items-start gap-[10px]">
      <input
        ref={inputRef}
        type="text"
        aria-label={label}
        value={value}
        maxLength={maxLength}
        disabled={blocked}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        className="w-full rounded-[10px] border border-[var(--landing-divider)] bg-white px-3 py-[10px] text-[13px] leading-[1.5] text-[var(--landing-text)] outline-none placeholder:text-[var(--landing-input-placeholder)] focus:border-[var(--landing-primary)] disabled:bg-[var(--landing-guide-bg)]"
      />
      <button
        type="submit"
        disabled={blocked || !normalizeLabel(value)}
        className="rounded-[8px] bg-[var(--landing-primary)] px-4 py-[9px] text-[13px] leading-[1.5] font-medium whitespace-nowrap text-white transition-colors hover:bg-[var(--landing-primary-deep)] disabled:cursor-not-allowed disabled:bg-[var(--landing-input-placeholder)]"
      >
        {actionLabel}
      </button>
      {blockedMessage ? <p className="text-[12px] leading-[1.5] text-[var(--landing-text-muted)]">{blockedMessage}</p> : null}
    </form>
  );
}
