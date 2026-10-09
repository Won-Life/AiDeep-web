import { describe, expect, it } from 'vitest';
import {
  CONTENT_TEMPLATES,
  describeTemplate,
  getTemplateSections,
  isContentTemplateId,
} from './contentTemplates';
import { setPendingTemplate, takePendingTemplate } from './pendingTemplate';

describe('content templates', () => {
  it('follows the Figma C1 menu: four templates with their section order', () => {
    expect(CONTENT_TEMPLATES.map((template) => template.label)).toEqual(['강의 필기', '회의 메모', '개념 정리', '자료 정리']);
    expect(describeTemplate(CONTENT_TEMPLATES[0])).toBe('핵심 개념 · 자세한 설명 · 헷갈린 점 · 참고');
    expect(describeTemplate(CONTENT_TEMPLATES[1])).toBe('결정 사항 · 논의 내용 · 할 일 · 다음 안건');
    expect(describeTemplate(CONTENT_TEMPLATES[2])).toBe('한 줄 정의 · 왜 중요한지 · 예시 · 연관 개념');
    expect(describeTemplate(CONTENT_TEMPLATES[3])).toBe('출처 · 핵심 요약 · 어디에 쓸지');
  });

  it('looks up sections by id and rejects unknown ids', () => {
    expect(getTemplateSections('lecture')).toHaveLength(4);
    expect(isContentTemplateId('meeting')).toBe(true);
    expect(isContentTemplateId('unknown')).toBe(false);
    expect(isContentTemplateId(undefined)).toBe(false);
  });
});

describe('pending template', () => {
  it('hands a template to the node that was created with it exactly once', () => {
    setPendingTemplate('node-1', 'lecture');
    expect(takePendingTemplate('node-1')).toBe('lecture');
    expect(takePendingTemplate('node-1')).toBeNull();
  });

  it('keeps nodes separate and returns null for a node without a template', () => {
    setPendingTemplate('a', 'meeting');
    setPendingTemplate('b', 'concept');
    expect(takePendingTemplate('b')).toBe('concept');
    expect(takePendingTemplate('a')).toBe('meeting');
    expect(takePendingTemplate('never')).toBeNull();
  });
});
