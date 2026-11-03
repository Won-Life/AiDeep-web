import type { Dispatch, SetStateAction } from 'react';
import type { Edge, Node } from '@xyflow/react';
import { createEdge } from './edges';
import { createMdNode, updateNodeContent } from './nodes';
import { getGraphColor, getUncoloredGraphAnchorIds } from '../logic/colors';
import {
  adjustPositionRelativeToSource,
  emptyChildNodeWidth,
  getForcedOutboundSideForSubNode,
  getTargetSideRelativeToParent,
} from '../logic/placement';
import { applyDepthOnEdgeCreate, getParentId } from '../logic/traversal';

interface InsertChildMdNodeArgs {
  workspaceId: string;
  parentId: string;
  title: string;
  body: { markdownBody: string; jsonBody: string };
  nodes: Node[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
}

/*
 * CONTEXT
 * - Problem      : AI 답변을 노드로 저장하려면 캔버스의 "+" 버튼(handleAddChild)과 같은 생성 규칙을 따라야 한다 — 방향 · 위치 · 색 상속 · 엣지 · depth.
 * - Why          : 같은 규칙을 채팅에서 다시 쓰되 GraphCanvas 안의 상태(이름 편집 진입)와 분리해 함수 하나로 둔다.
 * - Alternatives : handleAddChild 를 밖으로 꺼내 공유 → 이름 편집 · 컨텍스트 메뉴 상태가 얽혀 이번 범위를 넘는다. 두 곳이 같은 규칙을 따로 갖는 중복은 감수한다.
 * - Trade-offs   : 규칙이 바뀌면 두 곳을 함께 고쳐야 한다.
 * - Edge Case    : 노드 생성이 실패하면 throw(노드 미생성). 엣지 생성이 실패하면 임시 엣지를 걷고 노드는 남긴다(handleAddChild 와 동일).
 */
export async function insertChildMdNode({
  workspaceId, parentId, title, body, nodes, edges, setNodes, setEdges,
}: InsertChildMdNodeArgs): Promise<string> {
  const parent = nodes.find((node) => node.id === parentId);
  if (!parent) throw new Error('Parent node not found');

  const forced = getForcedOutboundSideForSubNode(parent, nodes, edges);
  let side: 'left' | 'right';
  if (forced) {
    side = forced;
  } else {
    const grandParentId = getParentId(parent.id, edges);
    const grandParent = grandParentId ? nodes.find((node) => node.id === grandParentId) : undefined;
    side = grandParent ? getTargetSideRelativeToParent(parent.position.x, grandParent.position.x) : 'right';
  }

  const position = adjustPositionRelativeToSource(
    parent, parent.position.y, side, nodes, edges, undefined, { width: emptyChildNodeWidth(parent) } as Node,
  );
  const colorPair = getGraphColor(parent.id, nodes, edges);
  const anchorIds = getUncoloredGraphAnchorIds(parent.id, nodes, edges);
  anchorIds.forEach((id) =>
    updateNodeContent(workspaceId, id, { color: colorPair.bg, textColor: colorPair.text })
      .catch((err) => console.error('[insertChildMdNode color anchor] failed', err)),
  );

  const { nodeId } = await createMdNode(workspaceId, title, position, {
    ...body,
    color: colorPair.bg,
    textColor: colorPair.text,
  });
  setNodes((prev) => [
    ...prev.map((node) => (anchorIds.includes(node.id)
      ? { ...node, data: { ...node.data, color: colorPair.bg, textColor: colorPair.text } }
      : node)),
    {
      id: nodeId,
      type: 'textUpdater',
      position,
      data: { title, isMain: false, depth: 0, color: colorPair.bg, textColor: colorPair.text, handleSide: side },
    } as Node,
  ]);

  const fromHandleId = `source-${side}`;
  const targetHandleId = `target-${side === 'left' ? 'right' : 'left'}`;
  const tempEdgeId = `temp-edge-${nodeId}`;
  setEdges((prev) => [
    ...prev,
    { id: tempEdgeId, source: parent.id, target: nodeId, type: 'branch', sourceHandle: fromHandleId, targetHandle: targetHandleId },
  ]);
  createEdge(workspaceId, parent.id, nodeId, fromHandleId, targetHandleId)
    .then(({ edgeId }) => {
      setEdges((prev) => prev.map((edge) => (edge.id === tempEdgeId ? { ...edge, id: edgeId } : edge)));
      setNodes((prev) => applyDepthOnEdgeCreate(prev, [], parent.id, nodeId));
    })
    .catch((err) => {
      setEdges((prev) => prev.filter((edge) => edge.id !== tempEdgeId));
      console.error('[insertChildMdNode] createEdge failed', err);
    });

  return nodeId;
}
