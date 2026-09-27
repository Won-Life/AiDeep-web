import { describe, it, expect } from 'vitest'
import { toFlowNode, toFlowEdge, convertToReactFlow } from './mappers'
import type { NodeDto, EdgeDto } from '../types'
import { DEFAULT_NODE_COLOR } from '../constants/colors'

const baseNode: NodeDto = {
  node_id: 'node-1',
  title: '테스트 노드',
  node_type: 'DATA',
  content: {},
  version: 1,
  position_x: 100,
  position_y: 200,
  workspace_id: 'ws-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
}

const baseEdge: EdgeDto = {
  edge_id: 'edge-1',
  workspace_id: 'ws-1',
  source_id: 'node-a',
  target_id: 'node-b',
  source_handle: 'right',
  target_handle: 'left',
  version: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
}

describe('toFlowNode', () => {
  it('node_id를 id로 매핑한다', () => {
    expect(toFlowNode(baseNode).id).toBe('node-1')
  })

  it('type은 항상 textUpdater다', () => {
    expect(toFlowNode(baseNode).type).toBe('textUpdater')
  })

  it('position_x, position_y를 position 객체로 매핑한다', () => {
    expect(toFlowNode(baseNode).position).toEqual({ x: 100, y: 200 })
  })

  it('node_type이 PROJECT이면 isMain이 true다', () => {
    expect(toFlowNode({ ...baseNode, node_type: 'PROJECT' }).data.isMain).toBe(true)
  })

  it('node_type이 PROJECT가 아니면 isMain이 false다', () => {
    expect(toFlowNode({ ...baseNode, node_type: 'DATA' }).data.isMain).toBe(false)
    expect(toFlowNode({ ...baseNode, node_type: 'RESOURCE' }).data.isMain).toBe(false)
  })

  it('content에 color가 없으면 DEFAULT_NODE_COLOR를 사용한다', () => {
    const node = toFlowNode({ ...baseNode, content: {} })
    expect(node.data.color).toBe(DEFAULT_NODE_COLOR.bg)
    expect(node.data.textColor).toBe(DEFAULT_NODE_COLOR.text)
  })

  it('content에 color가 있으면 해당 값을 사용한다', () => {
    const node = toFlowNode({
      ...baseNode,
      content: { color: '#ff0000', textColor: '#ffffff' },
    })
    expect(node.data.color).toBe('#ff0000')
    expect(node.data.textColor).toBe('#ffffff')
  })

  it('node_type을 data.nodeType으로 보존한다', () => {
    expect(toFlowNode({ ...baseNode, node_type: 'RESOURCE' }).data.nodeType).toBe('RESOURCE')
  })
})

describe('toFlowEdge', () => {
  it('edge_id를 id로 매핑한다', () => {
    expect(toFlowEdge(baseEdge).id).toBe('edge-1')
  })

  it('source_id, target_id를 source, target으로 매핑한다', () => {
    const edge = toFlowEdge(baseEdge)
    expect(edge.source).toBe('node-a')
    expect(edge.target).toBe('node-b')
  })

  it('type은 항상 branch다', () => {
    expect(toFlowEdge(baseEdge).type).toBe('branch')
  })

  it('source_handle, target_handle을 올바르게 매핑한다', () => {
    const edge = toFlowEdge(baseEdge)
    expect(edge.sourceHandle).toBe('right')
    expect(edge.targetHandle).toBe('left')
  })

  it('data는 빈 객체로 초기화된다', () => {
    expect(toFlowEdge(baseEdge).data).toEqual({})
  })
})

describe('convertToReactFlow', () => {
  const parentDto: NodeDto = { ...baseNode, node_id: 'node-a', position_x: 0, position_y: 0 }
  const childDto: NodeDto = { ...baseNode, node_id: 'node-b', position_x: 264, position_y: 0 }

  it('노드·엣지 개수를 보존한다', () => {
    const { nodes, edges } = convertToReactFlow([parentDto, childDto], [baseEdge])
    expect(nodes).toHaveLength(2)
    expect(edges).toHaveLength(1)
  })

  it('incoming 엣지의 source_handle로 자식의 handleSide를 초기화한다', () => {
    const { nodes } = convertToReactFlow([parentDto, childDto], [baseEdge])
    const child = nodes.find((n) => n.id === 'node-b')
    expect(child?.data.handleSide).toBe('right')
    expect(child?.data.hasParent).toBe(true)
  })

  it('부모 없는 노드는 hasParent가 false다', () => {
    const { nodes } = convertToReactFlow([parentDto, childDto], [baseEdge])
    expect(nodes.find((n) => n.id === 'node-a')?.data.hasParent).toBe(false)
  })

  it('엣지 핸들을 source-*/target-* 형태로 정규화하고 hub 좌표를 계산한다', () => {
    const { edges } = convertToReactFlow([parentDto, childDto], [baseEdge])
    expect(edges[0].sourceHandle).toBe('source-right')
    expect(edges[0].targetHandle).toBe('target-left')
    expect(edges[0].data?.hubX).toBeTypeOf('number')
    expect(edges[0].data?.hubY).toBeTypeOf('number')
  })
})
