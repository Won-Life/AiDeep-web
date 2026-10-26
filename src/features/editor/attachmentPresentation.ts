export type AttachmentDisplay = 'preview' | 'file';
const FILE_TITLE_PREFIX = 'onnode-attachment:v1:file:';

/*
 * CONTEXT
 * - Problem      : 전용 노드 타입은 원격 웹소켓의 마크다운 저장에서 지원되지 않는다.
 * - Why          : 표준 LinkNode의 title에 파일 표시 선택을 기록해 Yjs와 마크다운 왕복을 유지한다.
 * - Alternatives : URL 변경은 파일 식별에 영향을 주고 로컬 상태는 새로고침·협업에서 사라진다.
 * - Trade-offs   : 파일 표시 메타데이터가 마크다운 링크 제목에 포함된다.
 * - Edge Case    : 기존 링크 제목은 인코딩해 보존하고 미리보기로 복귀할 때 복원한다.
 */
export function readAttachmentPresentation(title: string | null | undefined): {
  display: AttachmentDisplay; originalTitle: string | null;
} {
  if (title?.startsWith(FILE_TITLE_PREFIX)) {
    try {
      return { display: 'file', originalTitle: decodeURIComponent(title.slice(FILE_TITLE_PREFIX.length)) || null };
    } catch { /* 잘못된 제목은 일반 링크 제목으로 유지한다. */ }
  }
  return { display: 'preview', originalTitle: title ?? null };
}

export function setAttachmentPresentation(title: string | null | undefined, display: AttachmentDisplay): string | null {
  const { originalTitle } = readAttachmentPresentation(title);
  return display === 'file' ? FILE_TITLE_PREFIX + encodeURIComponent(originalTitle ?? '') : originalTitle;
}
