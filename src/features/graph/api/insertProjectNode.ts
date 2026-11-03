import type { Dispatch, SetStateAction } from 'react';
import type { Node } from '@xyflow/react';
import { getRandomColorPair } from '../constants/colors';
import { createProjectNode } from './nodes';

/**
 * 프로젝트 노드를 REST로 만들고, 응답의 nodeId로 로컬 state에 삽입한다 (GRAPH_RULES §노드 생성:
 * 낙관적 삽입 없음 — 실패하면 throw 하고 노드는 만들어지지 않는다).
 * 그래프 색은 생성 시점에 확정한다. 표시는 TextUpdateNode가 isMain이면 항상 흰색으로 그린다.
 */
export async function insertProjectNode(
  workspaceId: string,
  position: { x: number; y: number },
  setNodes: Dispatch<SetStateAction<Node[]>>,
): Promise<string> {
  const colorPair = getRandomColorPair();
  const { nodeId } = await createProjectNode(workspaceId, '', position, {
    color: colorPair.bg,
    textColor: colorPair.text,
  });
  setNodes((prev) => [
    ...prev,
    {
      id: nodeId,
      type: 'textUpdater',
      position,
      data: { title: '', isMain: true, color: colorPair.bg, textColor: colorPair.text },
    },
  ]);
  return nodeId;
}
