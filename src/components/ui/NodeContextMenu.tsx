'use client';
import { SHOW_TEMP_HIDDEN_UI } from '@/lib/uiFlags';

/*
 * CONTEXT
 * - Problem      : Figma 08 G7 우클릭 메뉴는 "이름 바꾸기 / 삭제(빨강)" 2항목 + 파란 테두리 +
 *                  구분선인데, 기존 메뉴는 "삭제하기" 단일 항목(회색 테두리)뿐이었다.
 * - Why          : 이름 바꾸기 → 노드 제목 인라인 편집(G5) 트리거. 삭제는 복구 수단(보관함 #203)
 *                  전까지 영구 삭제라 빨강으로 위험 표시. 시안 그대로 2항목·중앙 정렬·구분선.
 * - Alternatives : 노드 타입 토글(#158)은 미구현이라 SHOW_TEMP_HIDDEN_UI 뒤에 숨긴 채 유지.
 * - Edge Case    : overflow-hidden으로 둥근 모서리에 맞춰 hover 배경·구분선을 클립한다.
 */

interface NodeContextMenuProps {
  isProjectNode?: boolean;
  onToggleNodeType?: () => void;
  onRename?: () => void;
  onDeleteNode?: () => void;
}

// Figma 08 G7 — 메뉴 테두리·구분선은 연한 페리윙클
const MENU_BORDER = '#C3CFFB';
const MENU_DIVIDER = '#E6EBFF';

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
      className="flex flex-col overflow-hidden rounded-xl bg-background shadow-md w-max min-w-40"
      style={{ border: `1.5px solid ${MENU_BORDER}` }}
    >
      {/* 노드 타입 토글은 임시 숨김 (프로젝트 노드 전환 #158 미구현) */}
      {SHOW_TEMP_HIDDEN_UI && (
        <>
          <button
            type="button"
            onClick={onToggleNodeType}
            className="px-5 py-3 text-center hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <span className="typo-cap2 text-foreground whitespace-nowrap">
              {isProjectNode ? '일반 노드로 변경' : '프로젝트 노드로 변경'}
            </span>
          </button>
          <div className="h-px" style={{ backgroundColor: MENU_DIVIDER }} />
        </>
      )}

      <button
        type="button"
        onClick={onRename}
        className="px-5 py-3 text-center hover:bg-surface-hover transition-colors cursor-pointer"
      >
        <span className="typo-cap2 text-foreground whitespace-nowrap">
          이름 바꾸기
        </span>
      </button>

      <div className="h-px" style={{ backgroundColor: MENU_DIVIDER }} />

      {/* 삭제 — 보관함(복구) 전까지 영구 삭제라 빨강으로 위험 표시 (#203) */}
      <button
        type="button"
        onClick={onDeleteNode}
        className="px-5 py-3 text-center hover:bg-surface-hover transition-colors cursor-pointer"
      >
        <span className="typo-cap2 text-red-500 whitespace-nowrap">삭제</span>
      </button>
    </div>
  );
}
