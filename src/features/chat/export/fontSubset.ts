/**
 * html-to-image는 기본적으로 문서의 모든 `@font-face`를 base64로 인라인한다.
 * Noto Sans KR은 구글이 한글을 372개 조각(unicode-range)으로 쪼개 서빙하므로,
 * 그대로 두면 캡처 한 번에 372개 파일을 받아오게 된다.
 *
 * 여기서는 카드에 실제로 등장한 글자가 속한 조각만 골라 인라인 CSS를 만든다.
 * unicode-range 파싱·매칭은 순수 함수라 단위 테스트 대상이다.
 */

export type CodepointRange = [start: number, end: number];

/**
 * `U+AC00-D7A3, U+1100-11FF, U+A?` 형태의 unicode-range를 코드포인트 구간 배열로 바꾼다.
 * 파싱할 수 없는 토큰은 조용히 버린다 — 폰트 하나 때문에 캡처 전체가 죽지 않도록.
 */
export function parseUnicodeRange(value: string): CodepointRange[] {
  const ranges: CodepointRange[] = [];
  for (const rawToken of value.split(',')) {
    const token = rawToken.trim().replace(/^u\+/i, '');
    if (!token) continue;

    if (token.includes('-')) {
      const [from, to] = token.split('-');
      const start = Number.parseInt(from, 16);
      const end = Number.parseInt(to, 16);
      if (Number.isNaN(start) || Number.isNaN(end)) continue;
      ranges.push([start, end]);
      continue;
    }

    // 와일드카드 표기: `A?` → AC00 형태가 아니라 A0–AF 범위를 뜻한다.
    if (token.includes('?')) {
      const start = Number.parseInt(token.replace(/\?/g, '0'), 16);
      const end = Number.parseInt(token.replace(/\?/g, 'F'), 16);
      if (Number.isNaN(start) || Number.isNaN(end)) continue;
      ranges.push([start, end]);
      continue;
    }

    const single = Number.parseInt(token, 16);
    if (Number.isNaN(single)) continue;
    ranges.push([single, single]);
  }
  return ranges;
}

/** 문자열을 코드포인트 집합으로. 서로게이트 페어(이모지 등)도 하나로 센다. */
export function toCodepointSet(text: string): Set<number> {
  const set = new Set<number>();
  for (const character of text) {
    const codepoint = character.codePointAt(0);
    if (codepoint !== undefined) set.add(codepoint);
  }
  return set;
}

/** 이 구간들 중 하나라도 실제 사용된 글자를 담고 있는가. */
export function rangesCoverAny(ranges: CodepointRange[], codepoints: Set<number>): boolean {
  for (const codepoint of codepoints) {
    for (const [start, end] of ranges) {
      if (codepoint >= start && codepoint <= end) return true;
    }
  }
  return false;
}

/**
 * unicode-range가 없는 @font-face는 전체 문자를 담당한다고 보고 항상 남긴다.
 * (Geist처럼 조각이 적은 폰트가 여기 해당)
 */
export function shouldKeepFontFace(unicodeRange: string | null, codepoints: Set<number>): boolean {
  if (!unicodeRange) return true;
  const ranges = parseUnicodeRange(unicodeRange);
  if (ranges.length === 0) return true;
  return rangesCoverAny(ranges, codepoints);
}
