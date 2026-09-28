import { describe, it, expect } from 'vitest'
import type { Edge } from '@xyflow/react'
import { simulateSubtreePositionPropagation } from './placement'

function e(source: string, target: string): Edge {
  return { id: `${source}->${target}`, source, target } as Edge
}

describe('simulateSubtreePositionPropagation', () => {
  it('root의 delta를 모든 자손에게 동일하게 더한다', () => {
    const edges = [e('root', 'child'), e('child', 'grandchild')]
    const startPositions = new Map([
      ['root', { x: 0, y: 0 }],
      ['child', { x: 100, y: 0 }],
      ['grandchild', { x: 200, y: 0 }],
    ])

    const { descendantIds, expected } = simulateSubtreePositionPropagation(
      'root',
      { x: 50, y: 20 },
      edges,
      startPositions,
    )

    expect(descendantIds).toEqual(new Set(['child', 'grandchild']))
    expect(expected.get('child')).toEqual({ x: 150, y: 20 })
    expect(expected.get('grandchild')).toEqual({ x: 250, y: 20 })
  })

  it('root 시작 위치를 모르면 delta 없이 시작 위치 그대로 반환한다', () => {
    const edges = [e('root', 'child')]
    const startPositions = new Map([['child', { x: 100, y: 0 }]])

    const { expected } = simulateSubtreePositionPropagation(
      'root',
      { x: 999, y: 999 },
      edges,
      startPositions,
    )

    expect(expected.get('child')).toEqual({ x: 100, y: 0 })
  })

  it('자손이 없으면 빈 결과를 반환한다', () => {
    const { descendantIds, expected } = simulateSubtreePositionPropagation(
      'root',
      { x: 0, y: 0 },
      [],
      new Map(),
    )

    expect(descendantIds.size).toBe(0)
    expect(expected.size).toBe(0)
  })
})
