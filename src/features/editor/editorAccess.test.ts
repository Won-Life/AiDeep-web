import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import { getEditorAccess } from './editorAccess';

const node = (id: string, isMain = false): Node => ({ id, position: { x: 0, y: 0 }, data: { isMain } });
const edge = (source: string, target: string): Edge => ({ id: `${source}-${target}`, source, target });

describe('getEditorAccess', () => {
  const nodes = [node('p', true), node('t'), node('c'), node('alone')];
  const edges = [edge('p', 't'), edge('t', 'c')];

  it('allows only content nodes (below a title)', () => {
    expect(getEditorAccess(nodes, edges, 'c')).toBe('allowed');
  });

  it('denies project, title and unattached nodes', () => {
    expect(getEditorAccess(nodes, edges, 'p')).toBe('denied');
    expect(getEditorAccess(nodes, edges, 't')).toBe('denied');
    expect(getEditorAccess(nodes, edges, 'alone')).toBe('denied');
  });

  it('denies an id that is not in the graph', () => {
    expect(getEditorAccess(nodes, edges, 'gone')).toBe('denied');
  });
});
