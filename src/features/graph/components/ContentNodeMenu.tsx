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
  'flex min-h-[52px] w-full flex-col items-start justify-center gap-1 px-[22px] text-left hover:bg-[#E6EBFF] focus-visible:bg-[#E6EBFF] focus-visible:outline-none';

/*
 * CONTEXT
 * - Problem      : hover 메뉴가 시안의 여백·테두리·템플릿 구분을 따르지 않는다.
 * - Why          : 256px 흰 패널에 파란 외곽과 전체 폭 강조 행으로 계층을 구분한다.
 * - Alternatives : 별도 템플릿 목록 복제 대신 기존 공통 정의를 유지한다.
 * - Trade-offs   : 노드와 함께 확대되며 설명은 줄바꿈할 수 있다.
 * - Edge Case    : 선택은 기존 템플릿 생성 API를 사용하고 Escape로 닫힌다.
 */
export function ContentNodeMenu({ onSelect, onClose }: ContentNodeMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element;
      // "+" 버튼은 자체 토글로 닫으므로, 여기서 먼저 닫으면 곧바로 다시 열린다.
      if (target.closest?.('[aria-label="자식 노드 추가"]')) return;
      if (ref.current && !ref.current.contains(target)) onClose();
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
      className="nodrag nopan w-[256px] overflow-hidden rounded-[22px] border border-[#627AFF] bg-white pb-3 shadow-[0_2px_2px_rgba(53,62,112,0.22)]"
      onClick={(event) => event.stopPropagation()}
    >
      <p className="px-[22px] py-[11px] text-[9px] leading-3 font-semibold text-[#999999]">콘텐츠 노드 만들기</p>
      <button type="button" role="menuitem" className={`${ITEM_CLASS} bg-[#E6EBFF]`} onClick={() => onSelect()}>
        <span className="text-[11px] leading-4 font-semibold text-[#222222]">바로 쓰기</span>
        <span className="text-[9px] leading-3 text-[#777777]">빈 콘텐츠에서 바로 입력해요</span>
      </button>
      <p className="px-[22px] pt-[11px] pb-1 text-[9px] leading-3 font-semibold text-[#999999]">템플릿으로 추가</p>
      {CONTENT_TEMPLATES.map((template) => (
        <button
          key={template.id}
          type="button"
          role="menuitem"
          className={ITEM_CLASS}
          onClick={() => onSelect(template.id)}
        >
          <span className="text-[11px] leading-4 font-semibold text-[#222222]">{template.label}</span>
          <span className="text-[9px] leading-3 text-[#777777]">{describeTemplate(template)}</span>
        </button>
      ))}
    </div>
  );
}
