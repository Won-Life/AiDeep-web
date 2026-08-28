'use client';

import { shouldKeepFontFace, toCodepointSet } from './fontSubset';

/** 같은 세션에서 여러 장을 저장해도 폰트 파일을 다시 받지 않는다. */
const dataUrlCache = new Map<string, string>();

const URL_PATTERN = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;

/** 폰트 하나가 응답하지 않아도 내보내기 전체가 멈추지 않도록. */
const FETCH_TIMEOUT_MS = 5000;

/**
 * @font-face의 src는 스타일시트 파일 기준 상대 경로(`../media/...`)로 적혀 있다.
 * 페이지 URL 기준으로 풀면 404가 나므로 스타일시트 href를 기준으로 절대화한다.
 */
function resolveFontUrl(url: string, sheetHref: string | null): string {
  try {
    return new URL(url, sheetHref ?? document.baseURI).href;
  } catch {
    return url;
  }
}

async function toDataUrl(url: string): Promise<string | null> {
  const cached = dataUrlCache.get(url);
  if (cached) return cached;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    dataUrlCache.set(url, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

function collectFontFaceRules(): CSSFontFaceRule[] {
  const found: CSSFontFaceRule[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // 교차 출처 스타일시트는 읽을 수 없다 — 건너뛴다.
    }
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSFontFaceRule) found.push(rule);
    }
  }
  return found;
}

/**
 * 카드에 실제로 쓰인 글자를 담당하는 `@font-face`만 골라 base64로 심은 CSS를 만든다.
 *
 * html-to-image에 이 결과를 `fontEmbedCSS`로 넘기면 라이브러리가 문서 전체를 다시
 * 훑지 않는다. Noto Sans KR의 한글 조각이 372개라 필터링 없이는 캡처가 사실상 멈춘다.
 */
export async function buildFontEmbedCss(text: string): Promise<string> {
  const codepoints = toCodepointSet(text);
  const rules = collectFontFaceRules().filter((rule) =>
    shouldKeepFontFace(rule.style.getPropertyValue('unicode-range') || null, codepoints),
  );

  const blocks = await Promise.all(
    rules.map(async (rule) => {
      const source = rule.style.getPropertyValue('src');
      if (!source) return null;

      const sheetHref = rule.parentStyleSheet?.href ?? null;
      const urls = Array.from(source.matchAll(URL_PATTERN), (match) => match[2]).filter(
        (url) => !url.startsWith('data:'),
      );
      const resolved = new Map<string, string>();
      await Promise.all(
        urls.map(async (url) => {
          const dataUrl = await toDataUrl(resolveFontUrl(url, sheetHref));
          if (dataUrl) resolved.set(url, dataUrl);
        }),
      );
      // 파일을 하나도 못 받았으면 그 @font-face는 넣어봐야 의미가 없다.
      if (resolved.size === 0) return null;

      const embeddedSource = source.replace(URL_PATTERN, (whole, _quote, url: string) => {
        const dataUrl = resolved.get(url);
        return dataUrl ? `url("${dataUrl}")` : whole;
      });

      // cssText를 문자열 치환하면 CSSOM 직렬화 차이에 걸릴 수 있어 블록을 직접 조립한다.
      const declarations = [
        `font-family: ${rule.style.getPropertyValue('font-family')}`,
        `src: ${embeddedSource}`,
      ];
      for (const property of ['font-style', 'font-weight', 'font-display', 'unicode-range'] as const) {
        const value = rule.style.getPropertyValue(property);
        if (value) declarations.push(`${property}: ${value}`);
      }
      return `@font-face { ${declarations.join('; ')}; }`;
    }),
  );

  return blocks.filter((block): block is string => block !== null).join('\n');
}
