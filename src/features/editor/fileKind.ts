// 업로드 허용 형식(서버 ALLOWED_MIME_TYPES, NodeEditorPanel FILE_EXTENSIONS)과 같은 확장자만 뷰어로 연다.
// 서버 S3 키는 `${folder}/${uuid}${ext}`라 URL 끝 확장자로 형식을 판별할 수 있다.
export type FileKind = 'image' | 'frame' | 'download';

const KIND_BY_EXTENSION: Record<string, FileKind> = {
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  webp: 'image',
  pdf: 'frame', // 브라우저 PDF 뷰어
  md: 'download', // S3 content-type이 text가 아닐 수 있어 iframe이 다운로드를 일으킨다
  doc: 'download', // 브라우저가 미리보기를 못 함
  docx: 'download',
  hwp: 'download',
};

/** 업로드 파일 링크면 보여줄 방식을, 일반 웹 링크면 null을 돌려준다. */
export function fileKindOf(url: string): FileKind | null {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }
  const extension = pathname.split('.').pop()?.toLowerCase() ?? '';
  return pathname.includes('.') ? KIND_BY_EXTENSION[extension] ?? null : null;
}
