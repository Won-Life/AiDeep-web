import type { SyncResponse } from '../../graph/types';
import { DEMO_CHAT_LIMITS } from '../demoChatConfig';

function formatNode(node: SyncResponse['nodes'][number]): string {
  const markdownBody = node.content.markdownBody
    ?.trim()
    .slice(0, DEMO_CHAT_LIMITS.maxNodeBodyChars);
  const lines = [
    `- 노드 ID: ${node.node_id}`,
    `  제목: ${node.title}`,
    `  유형: ${node.node_type}`,
  ];

  if (markdownBody) {
    lines.push(`  내용: ${markdownBody}`);
  }

  return lines.join('\n');
}

/** nodeIds 가 있으면 그 노드만 근거로 쓴다(AI 채팅 범위). 없으면 워크스페이스 전체 */
export function buildGraphContext(graph: SyncResponse, nodeIds?: readonly string[]): string {
  const scoped = nodeIds ? new Set(nodeIds) : null;
  const selectedNodes = graph.nodes
    .filter((node) => !scoped || scoped.has(node.node_id))
    .sort((left, right) => Number(right.node_type === 'PROJECT') - Number(left.node_type === 'PROJECT'))
    .slice(0, DEMO_CHAT_LIMITS.maxNodes);
  const selectedNodeIds = new Set(selectedNodes.map((node) => node.node_id));
  const titleById = new Map(selectedNodes.map((node) => [node.node_id, node.title]));
  const selectedEdges = graph.edges
    .filter((edge) => selectedNodeIds.has(edge.source_id) && selectedNodeIds.has(edge.target_id))
    .slice(0, DEMO_CHAT_LIMITS.maxEdges);
  const nodeSection = selectedNodes.length
    ? selectedNodes.map(formatNode).join('\n')
    : '- 노드가 없습니다.';
  const edgeSection = selectedEdges.length
    ? selectedEdges
      .map((edge) => `- ${titleById.get(edge.source_id) ?? edge.source_id} → ${titleById.get(edge.target_id) ?? edge.target_id}`)
      .join('\n')
    : '- 연결이 없습니다.';

  return ['[그래프 노드]', nodeSection, '[그래프 연결]', edgeSection]
    .join('\n')
    .slice(0, DEMO_CHAT_LIMITS.maxGraphContextChars);
}
