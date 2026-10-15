import { describe, expect, it } from 'vitest';
import { fileKindOf } from './fileKind';

describe('fileKindOf', () => {
  it('classifies uploaded file URLs by extension', () => {
    expect(fileKindOf('https://b.s3.ap-northeast-2.amazonaws.com/uploads/1f2e.PNG')).toBe('image');
    expect(fileKindOf('https://b.s3.ap-northeast-2.amazonaws.com/uploads/1f2e.pdf')).toBe('frame');
    expect(fileKindOf('https://b.s3.ap-northeast-2.amazonaws.com/uploads/1f2e.md')).toBe('download');
    expect(fileKindOf('https://b.s3.ap-northeast-2.amazonaws.com/uploads/1f2e.hwp')).toBe('download');
  });

  it('ignores query strings and treats ordinary web links as non-files', () => {
    expect(fileKindOf('https://b.s3.ap-northeast-2.amazonaws.com/uploads/1f2e.docx?x=1')).toBe('download');
    expect(fileKindOf('https://example.com/docs')).toBeNull();
    expect(fileKindOf('https://example.com/page.html')).toBeNull();
    expect(fileKindOf('https://example.com/report.pdf')).toBeNull();
    expect(fileKindOf('not a url')).toBeNull();
  });
});
