import { describe, expect, it } from 'vitest';
import {
  CONTENT_TEMPLATES,
  describeTemplate,
  getTemplateBody,
  getTemplateSections,
  isContentTemplateId,
} from './contentTemplates';

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

describe('template body for node creation', () => {
  it('sends section titles as h3 markdown so the server seeds the editor with them', () => {
    const { markdownBody } = getTemplateBody('lecture');
    expect(markdownBody).toBe('### 핵심 개념\n\n### 자세한 설명\n\n### 헷갈린 점\n\n### 참고\n\n');
  });

  it('keeps jsonBody in step with markdownBody: heading + empty paragraph per section', () => {
    const json = JSON.parse(getTemplateBody('material').jsonBody);
    const children = json.root.children;
    expect(children).toHaveLength(6);
    expect(children[0]).toMatchObject({ type: 'heading', tag: 'h3' });
    expect(children[0].children[0].text).toBe('출처');
    expect(children[1]).toMatchObject({ type: 'paragraph', children: [] });
  });
});
