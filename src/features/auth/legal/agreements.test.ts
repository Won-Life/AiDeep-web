import { describe, expect, it } from 'vitest';
import { AGREEMENTS, agreeToDocument, type Agreements } from './agreements';

describe('agreement consent', () => {
  it('agrees only to the selected document without changing other choices', () => {
    const value: Agreements = { terms: false, privacy: false, marketing: false };
    expect(agreeToDocument(value, 'privacy')).toEqual({ terms: false, privacy: true, marketing: false });
    expect(value).toEqual({ terms: false, privacy: false, marketing: false });
  });

  it('does not toggle an already accepted document off', () => {
    expect(agreeToDocument({ terms: true, privacy: true, marketing: false }, 'terms'))
      .toEqual({ terms: true, privacy: true, marketing: false });
  });

  it('preserves all document sections and supplied dates', () => {
    for (const document of Object.values(AGREEMENTS)) {
      expect(document.markdown).toContain('2026년 10월 08일');
      expect(document.markdown).toContain('2026년 10월 05일');
    }
    expect(AGREEMENTS.terms.markdown.match(/^## 제\d+조/gm)).toHaveLength(18);
    expect(AGREEMENTS.privacy.markdown.match(/^## 제\d+조/gm)).toHaveLength(15);
    expect(AGREEMENTS.marketing.markdown.match(/^## \d+\./gm)).toHaveLength(8);
    expect(AGREEMENTS.marketing.markdown).toContain('회의 음성, 전사 내용, 노드 콘텐츠는 마케팅 목적으로 이용하지 않습니다.');
  });
});
