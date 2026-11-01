import { describe, expect, it } from 'vitest';
import { fitScale } from './fitScale';

describe('fitScale', () => {
  it('실제 폭이 시안 폭보다 넓으면 키우지 않는다', () => {
    expect(fitScale(1600, 1120)).toBe(1);
  });

  it('좁으면 폭 비율만큼 줄인다', () => {
    expect(fitScale(560, 1120)).toBe(0.5);
  });

  it('폭을 아직 모르면(0) 원래 크기로 둔다', () => {
    expect(fitScale(0, 1120)).toBe(1);
  });
});
