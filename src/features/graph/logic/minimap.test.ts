import { describe, expect, it } from 'vitest';
import { getMiniMapBounds } from './minimap';

describe('getMiniMapBounds', () => {
  it('빈 그래프도 유효한 정사각형을 반환한다', () => {
    expect(getMiniMapBounds([])).toEqual({ x: -100, y: -100, width: 200, height: 200 });
  });

  it('노드 크기까지 포함하고 긴 변에 사방 100px 여백을 더한다', () => {
    expect(getMiniMapBounds([{ x: 10, y: 20, width: 200, height: 40 }]))
      .toEqual({ x: -90, y: -160, width: 400, height: 400 });
  });

  it('음수 좌표와 세로로 긴 그래프를 모두 담는다', () => {
    expect(getMiniMapBounds([
      { x: -500, y: -1000, width: 200, height: 140 },
      { x: 100, y: 1000, width: 200, height: 40 },
    ])).toEqual({ x: -1220, y: -1100, width: 2240, height: 2240 });
  });

  it('멀리 이동하거나 추가된 노드까지 범위를 확장한다', () => {
    const origin = { x: 0, y: 0, width: 200, height: 40 };
    const far = { x: 5000, y: 0, width: 200, height: 40 };
    const bounds = getMiniMapBounds([origin, far]);
    expect(bounds).toEqual({ x: -100, y: -2680, width: 5400, height: 5400 });
    expect(getMiniMapBounds([origin]).width).toBeLessThan(bounds.width);
  });

  it('サイズの変更と削除を反映し、入力を変更しない', () => {
    const rect = { x: 0, y: 0, width: 200, height: 40 };
    expect(getMiniMapBounds([{ ...rect, width: 800 }]).width).toBe(1000);
    expect(getMiniMapBounds([rect]).width).toBe(400);
    expect(rect).toEqual({ x: 0, y: 0, width: 200, height: 40 });
  });
});
