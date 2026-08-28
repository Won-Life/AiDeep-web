import { describe, expect, it } from 'vitest';
import { parseUnicodeRange, rangesCoverAny, shouldKeepFontFace, toCodepointSet } from './fontSubset';

describe('parseUnicodeRange', () => {
  it('구간 표기를 파싱한다', () => {
    expect(parseUnicodeRange('U+AC00-D7A3')).toEqual([[0xac00, 0xd7a3]]);
  });

  it('쉼표로 나열된 여러 토큰을 모두 읽는다', () => {
    expect(parseUnicodeRange('U+0000-00FF, U+0131, U+2000-206F')).toEqual([
      [0x0000, 0x00ff],
      [0x0131, 0x0131],
      [0x2000, 0x206f],
    ]);
  });

  it('와일드카드는 0과 F로 채운 구간이 된다', () => {
    expect(parseUnicodeRange('U+AC0?')).toEqual([[0xac00, 0xac0f]]);
  });

  it('읽을 수 없는 토큰은 버린다', () => {
    expect(parseUnicodeRange('U+AC00-D7A3, zzz')).toEqual([[0xac00, 0xd7a3]]);
  });
});

describe('rangesCoverAny', () => {
  it('사용된 글자가 구간에 들면 true', () => {
    expect(rangesCoverAny([[0xac00, 0xd7a3]], toCodepointSet('회의'))).toBe(true);
  });

  it('한 글자도 걸치지 않으면 false', () => {
    expect(rangesCoverAny([[0xac00, 0xd7a3]], toCodepointSet('AiDeep'))).toBe(false);
  });
});

describe('toCodepointSet', () => {
  it('서로게이트 페어를 한 글자로 센다', () => {
    expect(toCodepointSet('✦🎧')).toEqual(new Set([0x2726, 0x1f3a7]));
  });
});

describe('shouldKeepFontFace', () => {
  it('unicode-range가 없으면 항상 남긴다', () => {
    expect(shouldKeepFontFace(null, toCodepointSet('AiDeep'))).toBe(true);
  });

  it('파싱 결과가 비면 안전하게 남긴다', () => {
    expect(shouldKeepFontFace('nonsense', toCodepointSet('AiDeep'))).toBe(true);
  });

  it('쓰이지 않는 한글 조각은 버린다', () => {
    expect(shouldKeepFontFace('U+AC00-D7A3', toCodepointSet('AiDeep 2026'))).toBe(false);
  });

  it('쓰이는 한글 조각은 남긴다', () => {
    expect(shouldKeepFontFace('U+AC00-D7A3', toCodepointSet('회의 정리'))).toBe(true);
  });
});
