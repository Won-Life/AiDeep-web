'use client';

import { useId, type FormEvent, type ReactNode } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LetterChip from '@/components/ui/LetterChip';

/*
 * CONTEXT
 * - Problem      : 워크스페이스 모달 3개가 포털·백드롭·버튼 스타일을 각자 만들어 Esc·포커스 가두기가 빠져 있었다.
 * - Why          : 공통 Modal(native dialog)과 Button·Input 위에 시안(X7~X9) 크기만 얹은 틀을 한 곳에 둔다.
 * - Alternatives : 모달마다 Modal을 직접 쓰기 → 제목·폼·버튼 줄이 세 번 반복된다.
 * - Trade-offs   : 공통 Button·Input의 색 토큰을 따르므로 기존 hex(#617BFF 등)와 미세하게 다르다.
 * - Edge Case    : 요청 중에는 바깥 클릭·버튼을 막고, Enter 제출은 form 이 맡는다.
 */
export function WorkspaceDialog({
  title,
  subtitle,
  onClose,
  onSubmit,
  pending = false,
  submitLabel,
  submitVariant = 'primary',
  submitDisabled = false,
  error,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  onSubmit: () => void;
  pending?: boolean;
  submitLabel: string;
  submitVariant?: 'primary' | 'danger';
  submitDisabled?: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  const headingId = useId();
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!submitDisabled && !pending) onSubmit();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      labelledBy={headingId}
      closeOnBackdrop={!pending}
      contentClassName="px-6 py-9 sm:px-[54px]"
      closeButtonClassName="right-5 top-8 text-muted sm:right-7 sm:top-9"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <h2 id={headingId} className="px-3 text-center text-[16px] font-bold [overflow-wrap:anywhere] text-foreground">{title}</h2>
        <p className="-mt-2 text-center text-[11px] leading-4 text-muted">{subtitle}</p>
        <fieldset disabled={pending} className="flex flex-col gap-3.5">
          {children}
        </fieldset>
        {error && <p role="alert" className="text-[12px] text-red-500">{error}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" disabled={pending} onClick={onClose} className="flex-1 !h-[46px] !text-[12px]">취소</Button>
          <Button type="submit" variant={submitVariant} loading={pending} disabled={submitDisabled} className="flex-1 !h-[46px] !text-[12px]">{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}

/** 이름 입력 + 첫 글자 아이콘 미리보기(새 워크스페이스 · 설정 공통) */
export function WorkspaceNameField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold text-foreground">이름</p>
      <div className="flex items-center gap-2">
        <LetterChip text={value} fallback="새" size={44} fontSize={14} background="rgb(var(--ds-main-blue-deep))" />
        <Input data-autofocus value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label="워크스페이스 이름" autoComplete="off" className="min-w-0 flex-1 !h-9 !rounded-full !px-4 !text-[12px]" />
      </div>
      <p className="mt-1.5 pl-[52px] text-[10px] text-gray-500">아이콘은 이름 첫 글자로 자동 생성돼요.</p>
    </div>
  );
}
