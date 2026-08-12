'use client';
import { SHOW_TEMP_HIDDEN_UI } from '@/lib/uiFlags';

interface NodeContextMenuProps {
  isProjectNode?: boolean;
  onToggleNodeType?: () => void;
  onDeleteNode?: () => void;
}

export default function NodeContextMenu({
  isProjectNode = false,
  onToggleNodeType,
  onDeleteNode,
}: NodeContextMenuProps) {
  return (
    // 메뉴 클릭이 노드 DOM으로 버블링돼 React Flow onNodeClick(에디터 오픈)을 유발하는 것을 차단
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex flex-col bg-background rounded-xl border border-border shadow-md w-max min-w-40"
    >
      {/* 노드 타입 토글은 임시 숨김 (프로젝트 노드 전환 #158 미구현) */}
      {SHOW_TEMP_HIDDEN_UI && (
        <button
          type="button"
          onClick={onToggleNodeType}
          className="flex items-center px-4 pt-3.5 pb-2.5 rounded-t-xl hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <span className="typo-cap2 text-foreground whitespace-nowrap">
            {isProjectNode ? '일반 노드로 변경' : '프로젝트 노드로 변경'}
          </span>
        </button>
      )}

      {/* 보관하기 — 삭제·보관·아카이브 용어를 '보관'으로 통일 (#203).
          실동작도 soft delete + 보관함 복원이라 라벨과 일치한다.
          숨김 항목이 있으면 하단만, 단독이면 전체 라운딩 */}
      <button
        type="button"
        onClick={onDeleteNode}
        className={`flex items-center px-4 hover:bg-surface-hover transition-colors cursor-pointer ${
          SHOW_TEMP_HIDDEN_UI
            ? 'pt-2.5 pb-3.5 rounded-b-xl'
            : 'py-3.5 rounded-xl'
        }`}
      >
        <span className="typo-cap2 text-foreground whitespace-nowrap">
          보관하기
        </span>
      </button>
    </div>
  );
}
