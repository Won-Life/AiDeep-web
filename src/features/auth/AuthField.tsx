'use client';

import Image from 'next/image';
import { useId, useState, type ComponentProps } from 'react';
import Input from '@/components/ui/Input';

type AuthFieldProps = ComponentProps<typeof Input> & { label: string; hint?: string; labelInset?: 'login' | 'recovery' };

export default function AuthField({ label, hint, id, type, labelInset = 'login', ...props }: AuthFieldProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="flex flex-col gap-[9px]">
      <label htmlFor={inputId} className={`${labelInset === 'login' ? 'pl-6 leading-[13.07px]' : 'pl-[19px] leading-[14px]'} text-[13px] font-medium`}>{label}</label>
      <div className="relative">
        <Input {...props} id={inputId} type={isPassword && visible ? 'text' : type}
          aria-describedby={hint ? `${inputId}-hint` : props['aria-describedby']}
          className={`${labelInset === 'recovery' ? 'px-[19px]' : ''} ${isPassword ? 'pr-[50px]' : ''} ${props.className ?? ''}`} />
        {isPassword && (
          <button type="button" aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'} aria-pressed={visible}
            onClick={() => setVisible(!visible)} className="absolute right-[10px] top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-[var(--onnode-primary)]">
            <Image src={visible ? '/onnode/auth/eye-open.svg' : '/onnode/auth/imgGroup8.svg'} width={19.8956} height={15.5735} alt="" unoptimized />
          </button>
        )}
      </div>
      {hint && <p id={`${inputId}-hint`} className="pl-[19px] text-[10px] font-light">{hint}</p>}
    </div>
  );
}
