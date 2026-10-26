import { describe, expect, it } from 'vitest';
import { readAttachmentPresentation, setAttachmentPresentation } from './attachmentPresentation';

describe('첨부 표시 방식 메타데이터', () => {
  it('기존 링크는 제목을 보존하고 기본 미리보기를 사용한다', () => {
    expect(readAttachmentPresentation(null)).toEqual({ display: 'preview', originalTitle: null });
    expect(readAttachmentPresentation('자료 설명')).toEqual({ display: 'preview', originalTitle: '자료 설명' });
  });
  it('파일 표시 선택을 기록한다', () => {
    expect(readAttachmentPresentation(setAttachmentPresentation(null, 'file')).display).toBe('file');
  });
  it('한글·따옴표·괄호가 있는 원래 제목을 복원한다', () => {
    const title = '회의 "자료" (초안) %';
    expect(setAttachmentPresentation(setAttachmentPresentation(title, 'file'), 'preview')).toBe(title);
  });
  it('같은 모드로 반복 변경해도 중첩하지 않는다', () => {
    const title = setAttachmentPresentation('원본', 'file');
    expect(setAttachmentPresentation(title, 'file')).toBe(title);
    expect(setAttachmentPresentation(setAttachmentPresentation(null, 'file'), 'preview')).toBeNull();
  });
  it('잘못된 인코딩과 다른 버전은 임의로 해석하지 않는다', () => {
    for (const title of ['onnode-attachment:v1:file:%ZZ', 'onnode-attachment:v2:file:test']) {
      expect(readAttachmentPresentation(title)).toEqual({ display: 'preview', originalTitle: title });
    }
  });
});
