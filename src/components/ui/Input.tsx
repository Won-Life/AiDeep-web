'use client';

import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export default function Input({ invalid = false, className = '', ...props }: InputProps) {
  return <input {...props} aria-invalid={invalid || props['aria-invalid']}
    className={`h-[42px] w-full rounded-[20px] border bg-[var(--onnode-surface)] px-6 text-[13px] text-[var(--onnode-text-secondary)] shadow-[var(--onnode-input-shadow)] outline-none placeholder:text-[var(--onnode-text-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--onnode-primary-200)] disabled:opacity-60 ${invalid ? 'border-[var(--onnode-danger)]' : 'border-[var(--onnode-primary)]'} ${className}`} />;
}
