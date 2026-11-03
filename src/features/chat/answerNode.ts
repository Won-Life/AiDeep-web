const TITLE_MAX_CHARS = 30;

/** 답변을 저장한 노드의 제목 — 질문 앞부분 */
export function answerNodeTitle(question: string): string {
  const flat = question.replace(/\s+/g, ' ').trim();
  const head = flat.length > TITLE_MAX_CHARS ? `${flat.slice(0, TITLE_MAX_CHARS - 1)}…` : flat;
  return `AI · ${head || '답변'}`;
}

/** 답변 본문을 에디터가 읽는 Lexical JSON(줄마다 문단)으로 바꾼다 — 서버는 markdownBody 로 본문을 불러온다 */
export function answerNodeBody(answer: string): { markdownBody: string; jsonBody: string } {
  const markdownBody = answer.trim();
  const children = markdownBody.split('\n').map((line) => ({
    children: line
      ? [{ detail: 0, format: 0, mode: 'normal', style: '', text: line, type: 'text', version: 1 }]
      : [],
    direction: null,
    format: '',
    indent: 0,
    type: 'paragraph',
    version: 1,
  }));
  const jsonBody = JSON.stringify({
    root: { children, direction: null, format: '', indent: 0, type: 'root', version: 1 },
  });
  return { markdownBody, jsonBody };
}
