export type ContentTemplateId = 'lecture' | 'meeting' | 'concept' | 'material';

export interface ContentTemplate {
  id: ContentTemplateId;
  label: string;
  sections: string[];
}

/*
 * CONTEXT
 * - Problem      : 콘텐츠 노드 만들기 메뉴(Figma C1)와 에디터 슬래시 메뉴가 같은 템플릿 구조를 써야 한다.
 * - Why          : 섹션 정의를 한 곳에 두고 두 진입점이 함께 가져다 쓴다.
 * - Alternatives : 각자 배열을 따로 유지 → 설명 문구와 실제 삽입 내용이 어긋난다.
 * - Trade-offs   : 순서와 이름은 Figma C1의 설명 문구를 그대로 따른다.
 * - Edge Case    : 알 수 없는 id는 null로 처리해 저장된 값이 깨져도 삽입을 건너뛴다.
 */
export const CONTENT_TEMPLATES: readonly ContentTemplate[] = [
  { id: 'lecture', label: '강의 필기', sections: ['핵심 개념', '자세한 설명', '헷갈린 점', '참고'] },
  { id: 'meeting', label: '회의 메모', sections: ['결정 사항', '논의 내용', '할 일', '다음 안건'] },
  { id: 'concept', label: '개념 정리', sections: ['한 줄 정의', '왜 중요한지', '예시', '연관 개념'] },
  { id: 'material', label: '자료 정리', sections: ['출처', '핵심 요약', '어디에 쓸지'] },
];

export function isContentTemplateId(value: unknown): value is ContentTemplateId {
  return CONTENT_TEMPLATES.some((template) => template.id === value);
}

export function getTemplateSections(id: ContentTemplateId): string[] {
  return CONTENT_TEMPLATES.find((template) => template.id === id)?.sections ?? [];
}

export function describeTemplate(template: ContentTemplate): string {
  return template.sections.join(' · ');
}
