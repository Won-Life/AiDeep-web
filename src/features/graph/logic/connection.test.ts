import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import { draggedOutranksHovered } from './connection';

const node = (id: string, isMain = false) => ({ id, position: { x: 0, y: 0 }, data: { isMain } }) as Node;
const edge = (source: string, target: string) => ({ id: `${source}-${target}`, source, target }) as Edge;

// P(project) → T1(title) → C1(content), P → T2(title) → C2(content)
const nodes = [node('P', true), node('T1'), node('C1'), node('T2'), node('C2'), node('S')];
const edges = [edge('P', 'T1'), edge('T1', 'C1'), edge('P', 'T2'), edge('T2', 'C2')];

describe('draggedOutranksHovered', () => {
  it('프로젝트를 드래그하면 항상 부모', () => {
    expect(draggedOutranksHovered('P', 'C2', nodes, edges)).toBe(true);
  });
  it('타이틀을 콘텐츠 위에 놓으면 타이틀이 부모', () => {
    expect(draggedOutranksHovered('T1', 'C2', nodes, edges)).toBe(true);
  });
  it('콘텐츠를 타이틀 위에 놓으면 타이틀(hover)이 부모', () => {
    expect(draggedOutranksHovered('C2', 'T1', nodes, edges)).toBe(false);
  });
  it('같은 격끼리는 hover 대상이 부모', () => {
    expect(draggedOutranksHovered('T1', 'T2', nodes, edges)).toBe(false);
    expect(draggedOutranksHovered('C1', 'C2', nodes, edges)).toBe(false);
  });
  it('단독 노드는 격 비교 대상이 아님', () => {
    expect(draggedOutranksHovered('T1', 'S', nodes, edges)).toBe(false);
  });
});
