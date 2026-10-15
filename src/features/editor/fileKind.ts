// 서버 업로드 URL(`https://{bucket}.s3.{region}.amazonaws.com/{folder}/{uuid}{ext}`, Aideep_backend s3.service
// getPublicUrl)만 뷰어로 연다 — 일반 웹 링크의 .pdf 등은 iframe 임베드가 막힐 수 있어 새 탭으로 둔다.
// 확장자는 업로드 허용 형식(서버 ALLOWED_MIME_TYPES, NodeEditorPanel FILE_EXTENSIONS)과 같다.
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

/** 서버 업로드 파일 링크면 보여줄 방식을, 그 외 링크면 null을 돌려준다. */
export function fileKindOf(url: string): FileKind | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const { hostname, pathname } = parsed;
  if (!hostname.endsWith('.amazonaws.com') || !hostname.includes('.s3.')) return null;
  const extension = pathname.split('.').pop()?.toLowerCase() ?? '';
  return pathname.includes('.') ? KIND_BY_EXTENSION[extension] ?? null : null;
}
