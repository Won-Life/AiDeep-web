import type { Edge, Node } from '@xyflow/react';

export type EditorAccess = 'allowed' | 'denied';

/*
 * CONTEXT
 * - Problem      : 프로젝트·타이틀 노드는 이름만 고칠 수 있고 본문 에디터는 열리지 않는데, 전체화면 주소(/workspace/node/<id>)로 직접 들어오면 열렸다.
 * - Why          : 캔버스와 같은 기준(부모가 있고 그 부모가 프로젝트가 아니면 콘텐츠 노드)으로 주소 진입도 걸러낸다.
 * - Alternatives : 주소 전체를 막기 → 콘텐츠 노드의 전체화면 보기 버튼이 이 주소를 쓴다.
 * - Trade-offs   : 그래프를 아직 못 받았을 때는 판정하지 않는다(호출부가 동기화 뒤에만 부른다).
 * - Edge Case    : 없는 노드 id, 프로젝트 노드, 부모 없는 단독 노드는 모두 denied.
 */
export function getEditorAccess(nodes: Node[], edges: Edge[], nodeId: string): EditorAccess {
  const node = nodes.find((item) => item.id === nodeId);
  if (!node || (node.data as { isMain?: boolean })?.isMain) return 'denied';
  const parentId = edges.find((edge) => edge.target === nodeId)?.source;
  const parent = parentId ? nodes.find((item) => item.id === parentId) : undefined;
  if (!parent || (parent.data as { isMain?: boolean })?.isMain) return 'denied';
  return 'allowed';
}
