'use client';

import { useEffect, useRef } from 'react';
import {
  CONTENT_TEMPLATES,
  describeTemplate,
  type ContentTemplateId,
} from '@/features/editor/contentTemplates';

interface ContentNodeMenuProps {
  onSelect: (templateId?: ContentTemplateId) => void;
  onClose: () => void;
}

const ITEM_CLASS =
  'flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#EAEDFF]';

/* Figma 08 C1 "콘텐츠 노드 만들기": 바로 쓰기 + 템플릿 4종. */
export function ContentNodeMenu({ onSelect, onClose }: ContentNodeMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="콘텐츠 노드 만들기"
      className="nodrag nopan w-[248px] rounded-xl border border-[#D9DEFF] bg-background p-1.5 shadow-lg"
      onClick={(event) => event.stopPropagation()}
    >
      <p className="px-3 pb-1 pt-1.5 text-[12px] font-semibold text-[#748DFD]">콘텐츠 노드 만들기</p>
      <button type="button" role="menuitem" className={ITEM_CLASS} onClick={() => onSelect()}>
        <span className="text-[13px] font-semibold text-foreground">바로 쓰기</span>
        <span className="text-[11px] text-muted-foreground">빈 노드에서 시작</span>
      </button>
      {CONTENT_TEMPLATES.map((template) => (
        <button
          key={template.id}
          type="button"
          role="menuitem"
          className={ITEM_CLASS}
          onClick={() => onSelect(template.id)}
        >
          <span className="text-[13px] font-semibold text-foreground">{template.label}</span>
          <span className="text-[11px] text-muted-foreground">{describeTemplate(template)}</span>
        </button>
      ))}
    </div>
  );
}
