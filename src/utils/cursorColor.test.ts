import { describe, it, expect } from 'vitest'
import { getCursorColor } from './cursorColor'

const PALETTE = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']

describe('getCursorColor', () => {
  it('같은 userId는 항상 같은 색상을 반환한다', () => {
    expect(getCursorColor('user-abc')).toBe(getCursorColor('user-abc'))
    expect(getCursorColor('user-123')).toBe(getCursorColor('user-123'))
  })

  it('반환값은 팔레트에 정의된 색상 중 하나다', () => {
    expect(PALETTE).toContain(getCursorColor('alice'))
    expect(PALETTE).toContain(getCursorColor('bob'))
    expect(PALETTE).toContain(getCursorColor(''))
  })

  it('서로 다른 userId가 서로 다른 색상으로 분산된다', () => {
    const ids = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7']
    const colors = ids.map(getCursorColor)
    const unique = new Set(colors)
    expect(unique.size).toBeGreaterThan(1)
  })
})
