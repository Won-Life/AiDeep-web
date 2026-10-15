import { describe, it, expect } from 'vitest'
import type { Edge, Node } from '@xyflow/react'
import { adjustPositionRelativeToSource, emptyChildNodeWidth, simulateSubtreePositionPropagation } from './placement'

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

describe('adjustPositionRelativeToSource — 신규 자식 노드 간격', () => {
  const project = { id: 'p', position: { x: 0, y: 0 }, measured: { width: 200 }, data: { isMain: true } } as Node
  const title = { id: 't', position: { x: 0, y: 0 }, measured: { width: 300 }, data: { isMain: false } } as Node

  it('오른쪽은 부모 실측 폭 + 64px 뒤에 놓는다', () => {
    const child = { width: emptyChildNodeWidth(project) } as Node
    expect(adjustPositionRelativeToSource(project, 0, 'right', [project], [], undefined, child).x).toBe(200 + 64)
  })

  it('왼쪽은 새 노드의 빈 최소 폭만큼 더 물러나 부모와 64px 간격을 둔다', () => {
    const titleChild = { width: emptyChildNodeWidth(project) } as Node
    const contentChild = { width: emptyChildNodeWidth(title) } as Node
    // 프로젝트의 자식 = 타이틀(240px), 타이틀의 자식 = 콘텐츠(224px)
    expect(adjustPositionRelativeToSource(project, 0, 'left', [project], [], undefined, titleChild).x).toBe(-240 - 64)
    expect(adjustPositionRelativeToSource(title, 0, 'left', [title], [], undefined, contentChild).x).toBe(-224 - 64)
  })
})
