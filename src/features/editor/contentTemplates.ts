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

/*
 * CONTEXT
 * - Problem      : 템플릿으로 만든 노드는 처음 열 때부터 섹션 제목이 본문에 있어야 한다.
 * - Why          : 서버는 노드를 처음 열 때 yjs_state가 없으면 content.markdownBody를 에디터 형식으로 바꿔 채운다(Aideep_websocket loadDoc).
 *                  생성 요청의 markdownBody에 섹션 제목(h3)을 담으면 모든 협업자가 같은 본문을 보고, 탭을 닫아도 남는다.
 * - Alternatives : 에디터가 열릴 때 클라이언트가 삽입 → 열기 전 탭을 닫으면 빈 노드, 동시에 열면 중복 위험.
 * - Trade-offs   : jsonBody도 같은 구조로 보내 DB의 두 본문 필드를 맞춘다(서버 본문 로딩은 markdownBody 기준).
 * - Edge Case    : 섹션 제목 사이에 빈 문단을 둬 바로 이어 쓸 자리를 만든다.
 */
export function getTemplateBody(id: ContentTemplateId): { markdownBody: string; jsonBody: string } {
  const sections = getTemplateSections(id);
  const markdownBody = sections.map((title) => `### ${title}\n\n`).join('');
  const children = sections.flatMap((title) => [
    {
      children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: title, type: 'text', version: 1 }],
      direction: null,
      format: '',
      indent: 0,
      type: 'heading',
      version: 1,
      tag: 'h3',
    },
    { children: [], direction: null, format: '', indent: 0, type: 'paragraph', version: 1 },
  ]);
  const jsonBody = JSON.stringify({
    root: { children, direction: null, format: '', indent: 0, type: 'root', version: 1 },
  });
  return { markdownBody, jsonBody };
}
