import { describe, expect, it } from 'vitest';
import { formatDateStamp, fromBase64Url, parseDateStamp, parseShareHash, toBase64Url } from './answerLink';

describe('toBase64Url', () => {
  it('URL에 안전한 문자만 남기고 패딩을 뗀다', () => {
    const encoded = toBase64Url(new Uint8Array([251, 255, 190]));
    expect(encoded).toBe('-_--');
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('빈 입력은 빈 문자열', () => {
    expect(toBase64Url(new Uint8Array([]))).toBe('');
  });
});

describe('fromBase64Url', () => {
  it('toBase64Url을 되돌린다', () => {
    const original = new TextEncoder().encode('회의 정리, AiDeep과 함께');
    expect(Array.from(fromBase64Url(toBase64Url(original)))).toEqual(Array.from(original));
  });

  it('패딩이 필요한 길이도 복원한다', () => {
    for (const text of ['a', 'ab', 'abc', 'abcd', '한', '한글']) {
      const bytes = new TextEncoder().encode(text);
      expect(new TextDecoder().decode(fromBase64Url(toBase64Url(bytes)))).toBe(text);
    }
  });
});

describe('formatDateStamp', () => {
  it('여덟 자리로 채운다', () => {
    expect(formatDateStamp(new Date(2026, 7, 29))).toBe('20260829');
    expect(formatDateStamp(new Date(2026, 0, 5))).toBe('20260105');
  });
});

describe('parseDateStamp', () => {
  it('formatDateStamp를 되돌린다', () => {
    const parsed = parseDateStamp('20260829');
    expect(parsed && formatDateStamp(parsed)).toBe('20260829');
  });

  it('형식이 아니면 null', () => {
    expect(parseDateStamp('2026829')).toBeNull();
    expect(parseDateStamp('abcdefgh')).toBeNull();
  });

  it('없는 날짜는 null (굴러 넘어가지 않는다)', () => {
    expect(parseDateStamp('20260230')).toBeNull();
    expect(parseDateStamp('20261301')).toBeNull();
  });
});

describe('parseShareHash', () => {
  it('날짜와 payload를 가른다', () => {
    const { createdAt, payload } = parseShareHash('#20260829.2AbC');
    expect(createdAt && formatDateStamp(createdAt)).toBe('20260829');
    expect(payload).toBe('2AbC');
  });

  it('# 없이 넘겨도 동작한다', () => {
    expect(parseShareHash('20260829.xyz').payload).toBe('xyz');
  });

  it('날짜 구분자가 없으면 전체를 payload로 본다', () => {
    expect(parseShareHash('#2AbC')).toEqual({ createdAt: null, payload: '2AbC' });
  });

  it('빈 해시도 터지지 않는다', () => {
    expect(parseShareHash('')).toEqual({ createdAt: null, payload: '' });
  });
});
