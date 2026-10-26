'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from '@/components/ui/Button';
import type { AttachmentDisplay } from './attachmentPresentation';

export function AttachmentMenu({ x, y, trigger, display, canPreview, editable, onDisplay, onOpen, onClose }: {
  x: number; y: number; trigger: HTMLElement; display: AttachmentDisplay; canPreview: boolean; editable: boolean;
  onDisplay: (display: AttachmentDisplay) => void; onOpen: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus(); }, []);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) onClose(); };
    const close = () => onClose();
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('pointerdown', outside, true); window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); };
  }, [onClose]);
  return createPortal(
    <div ref={ref} role="menu" aria-label="첨부 파일 표시 방식" className="fixed z-[1000] w-52 overflow-hidden rounded-xl border border-[var(--onnode-primary)] bg-[var(--onnode-surface)] p-1 text-[var(--onnode-text)]"
      style={{ left: Math.max(8, Math.min(x, window.innerWidth - 216)), top: Math.max(8, Math.min(y, window.innerHeight - 144)) }}
      onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Tab') { if (event.key === 'Escape') { event.preventDefault(); trigger.focus(); } onClose(); return; }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[index]?.focus();
      }}>
      <Button variant="ghost" size="sm" role="menuitemradio" aria-checked={display === 'preview'} disabled={!canPreview || !editable} className="w-full !justify-start !rounded-lg" onClick={() => onDisplay('preview')}>미리보기로 표시 {display === 'preview' ? '✓' : ''}</Button>
      <Button variant="ghost" size="sm" role="menuitemradio" aria-checked={display === 'file'} disabled={!editable} className="w-full !justify-start !rounded-lg" onClick={() => onDisplay('file')}>파일로 표시 {display === 'file' ? '✓' : ''}</Button>
      <div className="my-1 border-t border-[var(--onnode-border)]" />
      <Button variant="ghost" size="sm" role="menuitem" className="w-full !justify-start !rounded-lg" onClick={onOpen}>크게 보기</Button>
    </div>, document.body,
  );
}
