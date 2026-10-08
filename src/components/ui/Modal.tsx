'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/*
 * CONTEXT
 * - Problem      : 모달 공통 동작과 도메인 화면/요청을 분리해야 한다.
 * - Why          : native dialog의 top layer, focus trap, inert 배경을 재사용한다.
 * - Alternatives : 직접 portal/focus trap → 브라우저가 제공하는 기능 중복.
 * - Trade-offs   : 최신 브라우저 dialog 지원을 전제로 한다.
 * - Edge Case    : Escape, backdrop 정책, 스크롤 잠금/해제, 이전 포커스 복원.
 */
export default function Modal({ isOpen, onClose, children, labelledBy, size = 'md', className = '', overlayClassName = '', closeOnBackdrop = true, contentClassName = 'p-6', closeButtonClassName = 'right-4 top-3' }: {
  isOpen: boolean; onClose: () => void; children: ReactNode; labelledBy: string;
  size?: 'sm' | 'md' | 'lg'; className?: string; overlayClassName?: string; closeOnBackdrop?: boolean;
  contentClassName?: string; closeButtonClassName?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!isOpen || !dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isOpen]);
  const sizes = { sm: 'max-w-[360px]', md: 'max-w-[490px]', lg: 'max-w-[640px]' };
  return (
    <dialog ref={ref} aria-labelledby={labelledBy} onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (closeOnBackdrop && event.target === event.currentTarget) onClose(); }}
      className={`m-auto max-h-[calc(100dvh-48px)] w-[calc(100%-48px)] overflow-y-auto rounded-[20px] bg-[var(--onnode-surface)] p-0 text-[var(--onnode-text)] backdrop:bg-[var(--onnode-overlay)] ${sizes[size]} ${overlayClassName} ${className}`}>
      <div className={`relative ${contentClassName}`}>
        <button type="button" aria-label="닫기" onClick={onClose} className={`absolute size-8 rounded-full text-[20px] focus-visible:outline-2 ${closeButtonClassName}`}>×</button>
        {children}
      </div>
    </dialog>
  );
}
