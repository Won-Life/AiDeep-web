'use client';

import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

const variants = {
  primary: 'bg-[var(--onnode-primary)] text-[var(--onnode-neutral-white)] hover:bg-[var(--onnode-primary-500)]',
  secondary: 'border border-[var(--onnode-primary)] bg-[var(--onnode-surface)] text-[var(--onnode-text)] hover:bg-[var(--onnode-primary-100)]',
  danger: 'bg-[var(--onnode-danger)] text-[var(--onnode-neutral-white)]',
  ghost: 'text-[var(--onnode-text-secondary)] hover:text-[var(--onnode-text)]',
};
const sizes = { sm: 'h-8 px-3 text-[12px]', md: 'h-[42px] px-6 text-[13px]', lg: 'h-12 px-6 text-[15px]' };

export default function Button({ variant = 'primary', size = 'md', loading = false, disabled, className = '', type = 'button', children, ...props }: ButtonProps) {
  return (
    <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-[20px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--onnode-primary-700)] disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  );
}
