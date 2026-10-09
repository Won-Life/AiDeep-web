'use client';
import { SHOW_TEMP_HIDDEN_UI } from '@/lib/uiFlags';

/*
 * CONTEXT
 * - Problem      : Figma 08 G7 우클릭 메뉴는 "이름 바꾸기 / 삭제(빨강)" 2항목 + 파란 테두리 +
 *                  구분선인데, 기존 메뉴는 "삭제하기" 단일 항목(회색 테두리)뿐이었다.
 * - Why          : 이름 바꾸기 → 노드 제목 인라인 편집(G5) 트리거. 삭제는 복구 수단(보관함 #203)
 *                  전까지 영구 삭제라 빨강으로 위험 표시. 시안 그대로 2항목·중앙 정렬·구분선.
 * - Alternatives : 노드 타입 토글(#158)은 미구현이라 SHOW_TEMP_HIDDEN_UI 뒤에 숨긴 채 유지.
 * - Trade-offs   : 고정 160px 폭과 32px 행으로 시안 비율을 유지하며 캔버스 배율을 따른다.
 * - Edge Case    : overflow-hidden으로 둥근 모서리에 맞춰 hover 배경·구분선을 클립한다.
 */

interface NodeContextMenuProps {
  isProjectNode?: boolean;
  onToggleNodeType?: () => void;
  onRename?: () => void;
  onDeleteNode?: () => void;
}

// Figma 08 G7 — 메뉴 테두리·구분선은 연한 페리윙클
const MENU_BORDER = '#617BFF';
const MENU_DIVIDER = MENU_BORDER;

export default function NodeContextMenu({
  isProjectNode = false,
  onToggleNodeType,
  onRename,
  onDeleteNode,
}: NodeContextMenuProps) {
  return (
    // 메뉴 클릭이 노드 DOM으로 버블링돼 React Flow onNodeClick(에디터 오픈)을 유발하는 것을 차단
    <div
      onClick={(e) => e.stopPropagation()}
      className="nodrag nopan flex w-[160px] flex-col overflow-hidden rounded-[20px] bg-background shadow-[0_3px_4px_rgba(53,62,112,0.2)]"
      style={{ border: `1px solid ${MENU_BORDER}` }}
    >
      {/* 노드 타입 토글은 임시 숨김 (프로젝트 노드 전환 #158 미구현) */}
      {SHOW_TEMP_HIDDEN_UI && (
        <>
          <button
            type="button"
            onClick={onToggleNodeType}
            className="h-8 px-4 text-center hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <span className="text-[11px] leading-none font-medium text-foreground whitespace-nowrap">
              {isProjectNode ? '일반 노드로 변경' : '프로젝트 노드로 변경'}
            </span>
          </button>
          <div className="h-px" style={{ backgroundColor: MENU_DIVIDER }} />
        </>
      )}

      <button
        type="button"
        onClick={onRename}
        className="bg-[#F3F5FF] h-8 px-4 text-center hover:bg-surface-hover transition-colors cursor-pointer"
      >
        <span className="text-[11px] leading-none font-medium text-foreground whitespace-nowrap">
          이름 바꾸기
        </span>
      </button>

      <div className="h-px" style={{ backgroundColor: MENU_DIVIDER }} />

      {/* 삭제 — 보관함(복구) 전까지 영구 삭제라 빨강으로 위험 표시 (#203) */}
      <button
        type="button"
        onClick={onDeleteNode}
        className="h-8 px-4 text-center hover:bg-surface-hover transition-colors cursor-pointer"
      >
        <span className="text-[11px] leading-none font-medium text-red-500 whitespace-nowrap">삭제</span>
      </button>
    </div>
  );
}
