'use client';

interface NodeContextMenuProps {
  onChangeToProjectNode?: () => void;
  onMoveToArchive?: () => void;
  onDeleteNode?: () => void;
}

export default function NodeContextMenu({
  onChangeToProjectNode,
  onMoveToArchive,
  onDeleteNode,
}: NodeContextMenuProps) {
  return (
    <div className="flex flex-col bg-white rounded-lg shadow-[0px_0px_4px_0px_rgba(44,44,44,0.25)] w-fit">
      {/* 프로젝트 노드로 변경 */}
      <button
        type="button"
        onClick={onChangeToProjectNode}
        className="flex items-center px-[10px] pt-[10px] pb-[8px] rounded-t-lg hover:bg-surface-hover transition-colors cursor-pointer"
      >
        <span className="typo-cap2 text-black whitespace-nowrap">
          프로젝트 노드로 변경
        </span>
      </button>

      {/* 아카이브로 이동 */}
      <button
        type="button"
        onClick={onMoveToArchive}
        className="flex items-center px-[10px] py-[8px] hover:bg-surface-hover transition-colors cursor-pointer"
      >
        <span className="typo-cap2 text-black whitespace-nowrap">
          아카이브로 이동
        </span>
      </button>

      {/* 노드 삭제 */}
      <button
        type="button"
        onClick={onDeleteNode}
        className="flex items-center px-[10px] pt-[8px] pb-[10px] rounded-b-lg hover:bg-surface-hover transition-colors cursor-pointer"
      >
        <span className="typo-cap2 text-black whitespace-nowrap">
          노드 삭제
        </span>
      </button>
    </div>
  );
}
