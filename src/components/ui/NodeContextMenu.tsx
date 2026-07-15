'use client';

interface NodeContextMenuProps {
  isProjectNode?: boolean;
  onToggleNodeType?: () => void;
  onMoveToArchive?: () => void;
  onDeleteNode?: () => void;
}

export default function NodeContextMenu({
  isProjectNode = false,
  onToggleNodeType,
  onMoveToArchive,
  onDeleteNode,
}: NodeContextMenuProps) {
  return (
    <div className="flex flex-col bg-background rounded-xl border border-border shadow-md w-max min-w-40">
      {/* 노드 타입 토글 (프로젝트 ↔ 일반) */}
      <button
        type="button"
        onClick={onToggleNodeType}
        className="flex items-center px-4 pt-3.5 pb-2.5 rounded-t-xl hover:bg-surface-hover transition-colors cursor-pointer"
      >
        <span className="typo-cap2 text-foreground whitespace-nowrap">
          {isProjectNode ? '일반 노드로 변경' : '프로젝트 노드로 변경'}
        </span>
      </button>

      {/* 아카이브로 이동 */}
      <button
        type="button"
        onClick={onMoveToArchive}
        className="flex items-center px-4 py-2.5 hover:bg-surface-hover transition-colors cursor-pointer"
      >
        <span className="typo-cap2 text-foreground whitespace-nowrap">
          아카이브로 이동
        </span>
      </button>

      {/* 노드 삭제 */}
      <button
        type="button"
        onClick={onDeleteNode}
        className="flex items-center px-4 pt-2.5 pb-3.5 rounded-b-xl hover:bg-surface-hover transition-colors cursor-pointer"
      >
        <span className="typo-cap2 text-foreground whitespace-nowrap">
          노드 삭제
        </span>
      </button>
    </div>
  );
}
