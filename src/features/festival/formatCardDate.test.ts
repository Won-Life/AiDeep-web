import { describe, expect, it } from 'vitest';
import { formatCardDate } from './formatCardDate';

describe('formatCardDate', () => {
  it('한국어 날짜 표기로 바꾼다', () => {
    expect(formatCardDate(new Date(2026, 7, 29))).toBe('2026년 8월 29일');
  });

  it('월·일에 0을 덧붙이지 않는다', () => {
    expect(formatCardDate(new Date(2026, 0, 5))).toBe('2026년 1월 5일');
  });
});
