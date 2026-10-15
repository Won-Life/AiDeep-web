import { describe, it, expect } from 'vitest'
import type { Edge, Node } from '@xyflow/react'
import { CONNECTION_BLOCK_MESSAGES, getConnectionBlockReason, isInvalidConnection } from './connection'

function e(source: string, target: string): Edge {
  return { id: `${source}->${target}`, source, target } as Edge
}

function n(id: string, depth: number, data: Record<string, unknown> = {}): Node {
  return { id, position: { x: 0, y: 0 }, data: { depth, ...data } } as Node
}

// 빨강 묶음: P1(프로젝트) → T1, T1b → C1 / 파랑 묶음: P2(프로젝트) → T2
// 무색 묶음: R3 → X3 / 단독 노드: L
const nodes = [
  n('P1', 0, { isMain: true, color: 'red' }),
  n('T1', 1, { color: 'red' }),
  n('T1b', 1, { color: 'red' }),
  n('C1', 2, { color: 'red' }),
  n('P2', 0, { isMain: true, color: 'blue' }),
  n('T2', 1, { color: 'blue' }),
  n('R3', 0),
  n('X3', 1),
  n('L', 0),
]
const edges = [e('P1', 'T1'), e('P1', 'T1b'), e('T1', 'C1'), e('P2', 'T2'), e('R3', 'X3')]

const reason = (source: string, target: string, targetHandle?: string) =>
  getConnectionBlockReason({ source, target, targetHandle }, nodes, edges)

describe('getConnectionBlockReason', () => {
  it('규칙별로 막힌 이유를 돌려준다', () => {
    expect(reason('P1', 'P1')).toBe('self')
    expect(reason('P1', 'P2')).toBe('bothProjects')
    expect(reason('P1', 'T1')).toBe('alreadyConnected')
    expect(reason('C1', 'P1')).toBe('descendant')
    expect(reason('T1', 'T1b')).toBe('sameGroup')
    expect(reason('T1', 'T2')).toBe('differentColor')
    expect(reason('T1', 'X3', 'target-left')).toBe('parentSide')
  })

  it('연결 가능하면 null — 단독 노드 편입, 무색 묶음 연결', () => {
    expect(reason('T1', 'L', 'target-left')).toBeNull()
    expect(reason('T1', 'X3', 'source-right')).toBeNull()
  })

  it('isInvalidConnection은 기본 규칙(자기 자신·프로젝트끼리·이미 연결·아래쪽 노드)만 본다', () => {
    expect(isInvalidConnection('C1', 'P1', nodes, edges)).toBe(true)
    expect(isInvalidConnection('T1', 'T1b', nodes, edges)).toBe(false) // 같은 묶음은 노드 드래그로 옮길 수 있다
  })

  it('자기 자신 외의 모든 이유에 사용자 문구가 있다', () => {
    expect(CONNECTION_BLOCK_MESSAGES.self).toBeNull()
    for (const [key, message] of Object.entries(CONNECTION_BLOCK_MESSAGES)) {
      if (key !== 'self') expect(message).toBeTruthy()
    }
  })
})
