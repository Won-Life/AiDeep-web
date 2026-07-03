import { describe, it, expect } from 'vitest'
import type { Edge } from '@xyflow/react'
import { getDescendantIds } from './graphUtils'

function e(source: string, target: string): Edge {
  return { id: `${source}->${target}`, source, target } as Edge
}

describe('getDescendantIds', () => {
  it('빈 엣지 목록이면 빈 Set을 반환한다', () => {
    expect(getDescendantIds('A', []).size).toBe(0)
  })

  it('자식이 없는 노드는 빈 Set을 반환한다', () => {
    const edges = [e('A', 'B'), e('B', 'C')]
    expect(getDescendantIds('C', edges).size).toBe(0)
  })

  it('직접 자식 노드들을 반환한다', () => {
    const edges = [e('root', 'child1'), e('root', 'child2'), e('other', 'child3')]
    expect(getDescendantIds('root', edges)).toEqual(new Set(['child1', 'child2']))
  })

  it('다단계 자손을 모두 반환한다', () => {
    const edges = [e('A', 'B'), e('B', 'C'), e('C', 'D')]
    expect(getDescendantIds('A', edges)).toEqual(new Set(['B', 'C', 'D']))
  })

  it('결과에 자기 자신은 포함되지 않는다', () => {
    const edges = [e('A', 'B')]
    expect(getDescendantIds('A', edges).has('A')).toBe(false)
  })

  it('가지치기 트리에서 모든 자손을 수집한다', () => {
    const edges = [e('root', 'c1'), e('root', 'c2'), e('c1', 'gc1'), e('c2', 'gc2')]
    expect(getDescendantIds('root', edges)).toEqual(new Set(['c1', 'c2', 'gc1', 'gc2']))
  })

  it('이미 방문한 노드를 중복 처리하지 않는다', () => {
    // c1이 두 경로에서 target이 되더라도 1번만 포함
    const edges = [e('root', 'c1'), e('root', 'c2'), e('c2', 'c1')]
    const result = getDescendantIds('root', edges)
    expect([...result].filter(id => id === 'c1').length).toBe(1)
  })
})
