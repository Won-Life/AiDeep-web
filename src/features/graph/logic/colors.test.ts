import { describe, it, expect } from 'vitest'
import type { Edge, Node } from '@xyflow/react'
import {
  getGraphColor,
  getUncoloredGraphAnchorIds,
  getRecolorTargetIds,
  updateSubtreeColors,
} from './colors'

function n(
  id: string,
  data: Record<string, unknown> = {},
  depth = 1,
): Node {
  return {
    id,
    position: { x: 0, y: 0 },
    data: { depth, ...data },
  } as Node
}

function e(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target } as Edge
}

// 그래프: main(root, depth 0) → a → b, a → c
const MAIN = n('main', { isMain: true, color: '#111', textColor: '#fff' }, 0)
const A = n('a', { color: '#111', textColor: '#fff' })
const B = n('b', { color: '#222', textColor: '#000' }) // 혼색(legacy) 자손
const C = n('c', { color: '#111', textColor: '#fff' })
const EDGES = [e('main', 'a'), e('a', 'b'), e('a', 'c')]

describe('getGraphColor', () => {
  it('노드 자신의 색이 있으면 그대로 반환한다', () => {
    expect(getGraphColor('a', [MAIN, A, B, C], EDGES).bg).toBe('#111')
  })

  it('노드가 무색이면 그래프 루트의 색을 따른다', () => {
    const colorlessA = n('a')
    expect(getGraphColor('a', [MAIN, colorlessA, B, C], EDGES).bg).toBe('#111')
  })

  it('그래프 전체가 무색이면 랜덤 색을 반환한다 (undefined 아님)', () => {
    const colorless = [n('main', { isMain: true }, 0), n('a')]
    const color = getGraphColor('a', colorless, [e('main', 'a')])
    expect(color.bg).toBeTruthy()
    expect(color.text).toBeTruthy()
  })
})

describe('getUncoloredGraphAnchorIds', () => {
  it('노드·루트 모두 색이 있으면 빈 배열', () => {
    expect(getUncoloredGraphAnchorIds('a', [MAIN, A, B, C], EDGES)).toEqual([])
  })

  it('노드와 루트가 모두 무색이면 둘 다 앵커가 된다', () => {
    const colorless = [n('main', { isMain: true }, 0), n('a')]
    expect(
      getUncoloredGraphAnchorIds('a', colorless, [e('main', 'a')]),
    ).toEqual(['a', 'main'])
  })

  it('루트 자신을 조회하면 중복 없이 1개만 반환한다', () => {
    const colorless = [n('main', { isMain: true }, 0), n('a')]
    expect(
      getUncoloredGraphAnchorIds('main', colorless, [e('main', 'a')]),
    ).toEqual(['main'])
  })
})

describe('getRecolorTargetIds', () => {
  it('색 경계에서 멈추지 않고 전체 자손을 포함한다 (혼색 그래프 통일)', () => {
    const ids = getRecolorTargetIds('a', [MAIN, A, B, C], EDGES)
    expect(ids).toContain('a')
    expect(ids).toContain('b') // 다른 색(#222) 자손도 포함돼야 혼색이 통일된다
    expect(ids).toContain('c')
  })

  it('main 노드는 페인트 대상에서 제외된다', () => {
    const ids = getRecolorTargetIds('main', [MAIN, A, B, C], EDGES)
    expect(ids).not.toContain('main')
    expect(ids).toEqual(expect.arrayContaining(['a', 'b', 'c']))
  })
})

describe('updateSubtreeColors', () => {
  it('혼색 자손까지 한 색으로 통일한다', () => {
    const result = updateSubtreeColors('a', [MAIN, A, B, C], EDGES, {
      bg: '#333',
      text: '#eee',
    })
    const colorOf = (id: string) =>
      result.find((node) => node.id === id)?.data?.color
    expect(colorOf('a')).toBe('#333')
    expect(colorOf('b')).toBe('#333')
    expect(colorOf('c')).toBe('#333')
    expect(colorOf('main')).toBe('#111') // main은 페인트 제외
  })
})
