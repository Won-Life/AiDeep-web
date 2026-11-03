import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import type { MeetingMap } from '@/features/meeting-bot/meetingState';
import {
  buildScopeOptions,
  defaultScope,
  isScopeRecording,
  sameScope,
  scopeForNode,
  scopeFromSelection,
  scopeNodeIds,
  summarizeScope,
} from './scope';

const node = (id: string, title: string, y = 0, isMain = false): Node => ({
  id,
  position: { x: 0, y },
  data: { title, isMain },
});
const edge = (source: string, target: string): Edge => ({ id: `${source}-${target}`, source, target });

// 프로젝트 → 회의(타이틀) 2개 → 콘텐츠, 그리고 프로젝트 밖의 독립 노드
const nodes = [
  node('p', '온노드 마케팅', 10, true),
  node('t1', '261026 주간 회의'),
  node('t2', '다음 회의'),
  node('c1', '랜딩 체험 기능'),
  node('c2', '유료 플랜 공개 시점'),
  node('loose', '메모'),
  node('loose-child', '메모 하위'),
  node('p2', '다른 프로젝트', 0, true),
];
const edges = [edge('p', 't1'), edge('p', 't2'), edge('t1', 'c1'), edge('t1', 'c2'), edge('loose', 'loose-child')];

describe('scopeForNode', () => {
  it('프로젝트 · 타이틀 · 그 외 노드를 구분한다', () => {
    expect(scopeForNode('p', nodes, edges)).toEqual({ rootId: 'p', kind: 'project' });
    expect(scopeForNode('t1', nodes, edges)).toEqual({ rootId: 't1', kind: 'title' });
    expect(scopeForNode('c1', nodes, edges)).toEqual({ rootId: 'c1', kind: 'node' });
    expect(scopeForNode('missing', nodes, edges)).toBeNull();
  });
});

describe('scopeFromSelection', () => {
  it('콘텐츠를 고르면 가장 가까운 타이틀로 올라간다', () => {
    expect(scopeFromSelection('c1', nodes, edges)).toEqual({ rootId: 't1', kind: 'title' });
  });

  it('타이틀과 프로젝트는 그대로 쓴다', () => {
    expect(scopeFromSelection('t2', nodes, edges)).toEqual({ rootId: 't2', kind: 'title' });
    expect(scopeFromSelection('p', nodes, edges)).toEqual({ rootId: 'p', kind: 'project' });
  });

  it('프로젝트 밖의 노드는 그 노드 자신을 범위로 쓴다', () => {
    expect(scopeFromSelection('loose-child', nodes, edges)).toEqual({ rootId: 'loose-child', kind: 'node' });
  });

  it('선택이 없거나 없는 노드면 null', () => {
    expect(scopeFromSelection(null, nodes, edges)).toBeNull();
    expect(scopeFromSelection('missing', nodes, edges)).toBeNull();
  });

  it('순환 엣지가 있어도 끝난다', () => {
    const cyclic = [edge('a', 'b'), edge('b', 'a')];
    const pair = [node('a', 'A'), node('b', 'B')];
    expect(scopeFromSelection('a', pair, cyclic)).toEqual({ rootId: 'a', kind: 'node' });
  });
});

describe('defaultScope', () => {
  it('캔버스 위쪽 프로젝트를 고른다', () => {
    expect(defaultScope(nodes)).toEqual({ rootId: 'p2', kind: 'project' });
  });

  it('프로젝트가 없으면 null', () => {
    expect(defaultScope([node('x', 'X')])).toBeNull();
  });
});

describe('scopeNodeIds · summarizeScope', () => {
  it('루트와 하위 전체를 돌려준다', () => {
    expect(scopeNodeIds({ rootId: 't1', kind: 'title' }, edges).sort()).toEqual(['c1', 'c2', 't1']);
  });

  it('타이틀 범위의 문구', () => {
    const summary = summarizeScope({ rootId: 't1', kind: 'title' }, nodes, edges);
    expect(summary).toEqual({
      label: '261026 주간 회의',
      chip: '261026 주간 회의 · 노드 2개',
      detail: '타이틀 · 노드 2개',
      count: 2,
    });
  });

  it('프로젝트 범위는 회의 수와 노드 수를 함께 보여 준다', () => {
    const summary = summarizeScope({ rootId: 'p', kind: 'project' }, nodes, edges);
    expect(summary.label).toBe('온노드 마케팅 전체');
    expect(summary.detail).toBe('프로젝트 · 회의 2개 · 노드 4개');
  });
});

describe('buildScopeOptions', () => {
  it('타이틀을 고르면 타이틀과 그 프로젝트를 후보로 올린다', () => {
    const selected = { rootId: 't1', kind: 'title' as const };
    const options = buildScopeOptions(null, selected, nodes, edges);
    expect(options).toEqual([selected, { rootId: 'p', kind: 'project' }]);
  });

  it('고정된 범위가 선택과 다르면 둘 다 보여 주고 중복은 한 번만', () => {
    const pinned = { rootId: 't2', kind: 'title' as const };
    const selected = { rootId: 't1', kind: 'title' as const };
    const options = buildScopeOptions(pinned, selected, nodes, edges);
    expect(options.map((option) => option.rootId)).toEqual(['t2', 't1', 'p']);
    expect(buildScopeOptions(selected, selected, nodes, edges)).toHaveLength(2);
  });

  it('범위가 없으면 빈 목록', () => {
    expect(buildScopeOptions(null, null, nodes, edges)).toEqual([]);
  });
});

describe('sameScope', () => {
  it('종류와 루트가 모두 같아야 같다', () => {
    expect(sameScope({ rootId: 'a', kind: 'title' }, { rootId: 'a', kind: 'title' })).toBe(true);
    expect(sameScope({ rootId: 'a', kind: 'title' }, { rootId: 'a', kind: 'node' })).toBe(false);
  });
});

describe('isScopeRecording', () => {
  const meetings = (status: string): MeetingMap => ({
    t1: { meetingId: 'm', nodeId: 't1', status, statusSubCode: null, occurredAt: '2026-11-04T00:00:00Z', recordingStartedAt: null },
  });

  it('범위 안 회의가 녹음 중이면 true', () => {
    expect(isScopeRecording({ rootId: 'p', kind: 'project' }, edges, meetings('RECORDING'))).toBe(true);
    expect(isScopeRecording({ rootId: 't1', kind: 'title' }, edges, meetings('RECORDING'))).toBe(true);
  });

  it('범위 밖이거나 녹음이 아니면 false', () => {
    expect(isScopeRecording({ rootId: 't2', kind: 'title' }, edges, meetings('RECORDING'))).toBe(false);
    expect(isScopeRecording({ rootId: 't1', kind: 'title' }, edges, meetings('WAITING_ROOM'))).toBe(false);
    expect(isScopeRecording({ rootId: 't1', kind: 'title' }, edges, {})).toBe(false);
  });
});
