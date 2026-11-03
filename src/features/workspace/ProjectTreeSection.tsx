'use client';

import { useWorkspaceLayout } from '@/app/workspace/context';
import { getDescendantIds } from '@/features/graph/logic/traversal';
import { figmaNodeColorOf } from '@/features/graph/constants/colors';
import LetterChip from '@/components/ui/LetterChip';
import { useProjectTree } from './useProjectTree';

export default function ProjectTreeSection({ query, onAddProject, onFocusNode }: {
  query: string;
  onAddProject: () => void;
  onFocusNode: (id: string) => void;
}) {
  const tree = useProjectTree(query);
  const { focusedNodeId, nodes, edges } = useWorkspaceLayout();
  const selectedNodeId = focusedNodeId ?? nodes.find((node) => node.selected)?.id ?? null;

  return (
    <div className="sidebar-tree min-h-0 flex-1 overflow-y-auto pb-2">
      <div className="sidebar-tree-heading flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#727272]">프로젝트</span>
        <button type="button" onClick={onAddProject} aria-label="새 프로젝트 노드" className="px-1 text-[20px] leading-none text-[#3f62e0]">+</button>
      </div>
      {tree.length === 0 && <p className="px-5 py-2 text-xs text-muted">{query.trim() ? '검색 결과가 없어요' : '아직 프로젝트가 없어요'}</p>}
      {tree.map((project) => {
        const selected = selectedNodeId !== null && (project.id === selectedNodeId || getDescendantIds(project.id, edges).has(selectedNodeId));
        const color = figmaNodeColorOf(project.color)?.deep ?? project.color ?? 'rgb(var(--ds-main-blue))';
        return (
          <button key={project.id} type="button" onClick={() => onFocusNode(project.id)} aria-current={selected ? 'true' : undefined}
            className={`sidebar-project-row flex w-full items-center gap-3 text-left ${selected ? 'sidebar-selected' : 'hover:bg-surface'}`}>
            <LetterChip text={project.title} size={selected ? 34 : 32} fontSize={11.2} background={color} />
            <span className={`min-w-0 flex-1 truncate text-[13px] ${selected ? 'font-bold text-main-blue-deep' : 'font-semibold text-[#4d4d4d]'}`}>{project.title}</span>
            <span className={`text-[11.2px] ${selected ? 'text-[#748dfd]' : 'text-[#727272]'}`}>{project.count}</span>
          </button>
        );
      })}
      <button type="button" onClick={onAddProject} className="mx-5 mt-2 flex items-center gap-2 text-[11.2px] text-[#748dfd]">
        <span className="flex size-[30px] items-center justify-center rounded-[10px] border border-dashed border-[#748dfd] text-base">+</span>
        프로젝트 노드 추가
      </button>
    </div>
  );
}
