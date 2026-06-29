import { describe, it, expect } from 'vitest'
import { rectCollide, type RectNode } from './rectCollide'

function node(id: string, x: number, y: number, w = 100, h = 50): RectNode {
  return { id, x, y, width: w, height: h }
}

function run(nodes: RectNode[], padding = 0, alpha = 1) {
  const force = rectCollide<RectNode>(padding)
  force.initialize!(nodes, Math.random)
  force(alpha)
  return nodes
}

describe('rectCollide', () => {
  it('겹치지 않는 노드는 위치가 변하지 않는다', () => {
    const nodes = [node('a', 0, 0), node('b', 500, 500)]
    run(nodes)
    expect(nodes[0].x).toBe(0)
    expect(nodes[1].x).toBe(500)
  })

  it('X 방향으로 겹치는 노드를 가로로 밀어낸다', () => {
    // overlapX(10) < overlapY(100) → X 방향으로 분리
    // 두 노드: (0,0)과 (90,0), 너비=100, 높이=100 → X 겹침=10, Y 겹침=100
    const nodes = [node('a', 0, 0, 100, 100), node('b', 90, 0, 100, 100)]
    run(nodes)
    expect(nodes[1].x).toBeGreaterThan(90)
    expect(nodes[0].x).toBeLessThan(0)
  })

  it('Y 방향으로 겹치는 노드를 세로로 밀어낸다', () => {
    // overlapY(10) < overlapX(100) → Y 방향으로 분리
    // 두 노드: (0,0)과 (0,90), 너비=100, 높이=100 → X 겹침=100, Y 겹침=10
    const nodes = [node('a', 0, 0, 100, 100), node('b', 0, 90, 100, 100)]
    run(nodes)
    expect(nodes[1].y).toBeGreaterThan(90)
    expect(nodes[0].y).toBeLessThan(0)
  })

  it('fx가 설정된 노드(드래그 중)는 움직이지 않는다', () => {
    const nodes = [node('a', 0, 0), node('b', 10, 0)]
    nodes[0].fx = 0
    run(nodes)
    expect(nodes[0].x).toBe(0)
  })

  it('fy가 설정된 노드(드래그 중)는 움직이지 않는다', () => {
    const nodes = [node('a', 0, 0), node('b', 0, 5)]
    nodes[0].fy = 0
    run(nodes)
    expect(nodes[0].y).toBe(0)
  })

  it('padding을 적용하면 실제 노드보다 넓은 영역에서 충돌을 감지한다', () => {
    // 노드 중심 간격 110px, 너비 100 → 패딩 없으면 겹침 없음 (ax2=50, bx1=60)
    // 패딩 20 적용 시 ax2=70, bx1=40 → 겹침 발생
    const nodes = [node('a', 0, 0), node('b', 110, 0)]
    run(nodes, 20)
    expect(nodes[1].x - nodes[0].x).toBeGreaterThan(110)
  })

  it('alpha=0이면 force가 적용되지 않는다', () => {
    const nodes = [node('a', 0, 0), node('b', 10, 0)]
    run(nodes, 0, 0)
    expect(nodes[0].x).toBe(0)
    expect(nodes[1].x).toBe(10)
  })
})
