import type { Edge, Node } from '@xyflow/react';
import { getDescendantIds, getParentId } from '@/features/graph/logic/traversal';
import { toBotStatus, type MeetingMap } from '@/features/meeting-bot/meetingState';

/*
 * CONTEXT
 * - Problem      : AI 채팅이 워크스페이스 전체를 읽어 질문한 노드와 상관없는 내용까지 근거로 삼는다(Figma Q1~Q4).
 * - Why          : 범위를 "루트 노드 하나 + 그 하위 전체"로 정의한다. 타이틀(부모가 프로젝트인 노드) · 프로젝트 · 그 밖의 노드
 *                  세 종류가 모두 같은 모양이라 컨텍스트 거르기·개수 표시·녹음 판정을 한 곳에서 처리한다.
 * - Alternatives : 노드 id 목록을 직접 저장 → 노드가 늘어도 범위가 자라지 않아 "이 회의" 같은 의미가 깨진다.
 * - Trade-offs   : 범위가 하위 전체라 크면 컨텍스트 상한(노드 50개)에서 잘린다 — 잘린 개수는 호출 쪽이 표시한다.
 * - Edge Case    : 선택한 노드가 콘텐츠면 가장 가까운 타이틀로 올라가고, 프로젝트 밖의 독립 노드면 그 노드 자신을 범위로 쓴다.
 */
export type ScopeKind = 'title' | 'project' | 'node';

export interface ChatScope {
  rootId: string;
  kind: ScopeKind;
}

export interface ScopeSummary {
  /** 메뉴 첫 줄 — 프로젝트는 "○○ 전체" */
  label: string;
  /** 범위 칩 — "○○ · 노드 5개" */
  chip: string;
  /** 메뉴 둘째 줄 — "타이틀 · 노드 5개" */
  detail: string;
  /** 루트를 포함해 답변이 읽는 노드 수 */
  count: number;
}

const isProject = (node: Node | undefined) => Boolean((node?.data as { isMain?: boolean } | undefined)?.isMain);

export function nodeTitleOf(node: Node | undefined): string {
  return ((node?.data as { title?: string } | undefined)?.title ?? '').trim() || '제목 없음';
}

/** 노드 하나를 그 자체로 범위로 만든다 — 프로젝트 · 타이틀(부모가 프로젝트) · 그 외 */
export function scopeForNode(id: string, nodes: Node[], edges: Edge[]): ChatScope | null {
  const node = nodes.find((item) => item.id === id);
  if (!node) return null;
  if (isProject(node)) return { rootId: id, kind: 'project' };
  const parentId = getParentId(id, edges);
  const parent = parentId ? nodes.find((item) => item.id === parentId) : undefined;
  return { rootId: id, kind: isProject(parent) ? 'title' : 'node' };
}

/** 캔버스에서 고른 노드로부터 기본 범위를 잡는다 — 콘텐츠를 골랐으면 가장 가까운 타이틀로 올라간다 */
export function scopeFromSelection(selectedId: string | null, nodes: Node[], edges: Edge[]): ChatScope | null {
  if (!selectedId) return null;
  const seen = new Set<string>();
  let cursor: string | null = selectedId;
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const scope = scopeForNode(cursor, nodes, edges);
    if (!scope) return null;
    if (scope.kind !== 'node') return scope;
    cursor = getParentId(cursor, edges);
  }
  return scopeForNode(selectedId, nodes, edges);
}

/** 선택이 없을 때의 기본 범위 — 캔버스 위쪽 프로젝트 */
export function defaultScope(nodes: Node[]): ChatScope | null {
  const first = nodes.filter(isProject).sort((a, b) => a.position.y - b.position.y)[0];
  return first ? { rootId: first.id, kind: 'project' } : null;
}

export function scopeNodeIds(scope: ChatScope, edges: Edge[]): string[] {
  return [scope.rootId, ...getDescendantIds(scope.rootId, edges)];
}

export function scopeKey(scope: ChatScope): string {
  return `${scope.kind}:${scope.rootId}`;
}

export function sameScope(a: ChatScope, b: ChatScope): boolean {
  return scopeKey(a) === scopeKey(b);
}

export function summarizeScope(scope: ChatScope, nodes: Node[], edges: Edge[]): ScopeSummary {
  const root = nodes.find((node) => node.id === scope.rootId);
  const title = nodeTitleOf(root);
  const count = getDescendantIds(scope.rootId, edges).size + 1;
  const countText = `노드 ${count}개`;
  if (scope.kind === 'project') {
    const meetings = edges.filter((edge) => edge.source === scope.rootId).length;
    return { label: `${title} 전체`, chip: `${title} · ${countText}`, detail: `프로젝트 · 회의 ${meetings}개 · ${countText}`, count };
  }
  const kindText = scope.kind === 'title' ? '타이틀' : '노드';
  return { label: title, chip: `${title} · ${countText}`, detail: `${kindText} · ${countText}`, count };
}

/** 메뉴에 올릴 후보 — 지금 범위, 그리고 선택한 노드가 속한 타이틀·프로젝트 */
export function buildScopeOptions(current: ChatScope | null, selected: ChatScope | null, nodes: Node[], edges: Edge[]): ChatScope[] {
  const options: ChatScope[] = [];
  const add = (scope: ChatScope | null) => {
    if (scope && !options.some((option) => sameScope(option, scope))) options.push(scope);
  };
  add(current);
  add(selected);
  const base = selected ?? current;
  if (base?.kind === 'title') {
    const parentId = getParentId(base.rootId, edges);
    if (parentId) add(scopeForNode(parentId, nodes, edges));
  }
  return options;
}

function recordingNodeIds(meetings: MeetingMap): string[] {
  return Object.values(meetings)
    .filter((info) => toBotStatus(info.status) === 'recording')
    .map((info) => info.nodeId);
}

/** 범위의 루트가 녹음 중인 회의 안(회의 노드 자신 포함)이면 true — 이때만 질문을 막는다(Figma Q6) */
export function isScopeInsideRecording(scope: ChatScope, edges: Edge[], meetings: MeetingMap): boolean {
  const recording = new Set(recordingNodeIds(meetings));
  const seen = new Set<string>();
  let cursor: string | null = scope.rootId;
  while (cursor && !seen.has(cursor)) {
    if (recording.has(cursor)) return true;
    seen.add(cursor);
    cursor = getParentId(cursor, edges);
  }
  return false;
}

/** 범위의 노드에서 녹음 중인 회의와 그 하위를 뺀다 — 더 넓은 범위로 물을 때 만들어지는 중인 노드를 근거에서 제외 */
export function excludeRecordingIds(ids: string[], edges: Edge[], meetings: MeetingMap): string[] {
  const excluded = new Set<string>();
  for (const nodeId of recordingNodeIds(meetings)) {
    excluded.add(nodeId);
    getDescendantIds(nodeId, edges).forEach((id) => excluded.add(id));
  }
  return ids.filter((id) => !excluded.has(id));
}

/** 범위를 품은 가장 가까운 프로젝트 범위. 프로젝트 자신이거나 프로젝트 밖이면 null */
export function enclosingProjectScope(scope: ChatScope, nodes: Node[], edges: Edge[]): ChatScope | null {
  if (scope.kind === 'project') return null;
  const seen = new Set<string>();
  let cursor = getParentId(scope.rootId, edges);
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const node = nodes.find((item) => item.id === cursor);
    if (isProject(node)) return { rootId: cursor, kind: 'project' };
    cursor = getParentId(cursor, edges);
  }
  return null;
}
