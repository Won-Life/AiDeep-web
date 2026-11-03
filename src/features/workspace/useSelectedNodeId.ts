import { useWorkspaceLayout } from '@/app/workspace/context';

/** 캔버스에서 포커스됐거나 선택된 노드 id — 사이드바 트리와 AI 채팅 범위가 같은 기준을 쓴다 */
export function useSelectedNodeId(): string | null {
  const { nodes, focusedNodeId } = useWorkspaceLayout();
  return focusedNodeId ?? nodes.find((node) => node.selected)?.id ?? null;
}
