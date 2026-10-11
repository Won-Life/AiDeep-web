import { describe, expect, it } from 'vitest';
import type { SyncResponse } from '@/features/graph/types';
import { DEMO_CHAT_LIMITS } from '../demoChatConfig';
import { buildGraphContext } from './graphContext';

const graph: SyncResponse = {
  nodes: [
    {
      node_id: 'project',
      title: '도당체 행사',
      node_type: 'PROJECT',
      content: { markdownBody: '부스 운영을 준비합니다.' },
      depth: 0,
      version: 1,
      position_x: 0,
      position_y: 0,
      workspace_id: 'workspace-1',
      created_at: '2026-08-26T00:00:00Z',
      updated_at: '2026-08-26T00:00:00Z',
      deleted_at: null,
    },
    {
      node_id: 'marketing',
      title: '마케팅 회의',
      node_type: 'DATA',
      content: {},
      depth: 1,
      version: 1,
      position_x: 100,
      position_y: 0,
      workspace_id: 'workspace-1',
      created_at: '2026-08-26T00:00:00Z',
      updated_at: '2026-08-26T00:00:00Z',
      deleted_at: null,
    },
  ],
  edges: [
    {
      edge_id: 'project-marketing',
      workspace_id: 'workspace-1',
      source_id: 'project',
      target_id: 'marketing',
      source_handle: 'right',
      target_handle: 'left',
      version: 1,
      created_at: '2026-08-26T00:00:00Z',
      updated_at: '2026-08-26T00:00:00Z',
      deleted_at: null,
    },
  ],
};

describe('buildGraphContext', () => {
  it('노드의 제목·유형·본문과 제목 기반 연결을 직렬화한다', () => {
    expect(buildGraphContext(graph)).toContain('제목: 도당체 행사');
    expect(buildGraphContext(graph)).toContain('유형: PROJECT');
    expect(buildGraphContext(graph)).toContain('내용: 부스 운영을 준비합니다.');
    expect(buildGraphContext(graph)).toContain('도당체 행사 → 마케팅 회의');
  });

  it('빈 그래프에도 명시적인 빈 섹션을 만든다', () => {
    expect(buildGraphContext({ nodes: [], edges: [] })).toContain('노드가 없습니다.');
    expect(buildGraphContext({ nodes: [], edges: [] })).toContain('연결이 없습니다.');
  });

  it('노드 본문과 전체 컨텍스트를 데모 제한 안으로 자른다', () => {
    const longGraph: SyncResponse = {
      nodes: [{ ...graph.nodes[0], content: { markdownBody: '가'.repeat(DEMO_CHAT_LIMITS.maxNodeBodyChars + 1_000) } }],
      edges: [],
    };

    expect(buildGraphContext(longGraph).length).toBeLessThanOrEqual(DEMO_CHAT_LIMITS.maxGraphContextChars);
    expect(buildGraphContext(longGraph)).not.toContain('가'.repeat(DEMO_CHAT_LIMITS.maxNodeBodyChars + 1));
  });
});
