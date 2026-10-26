'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { $getSelection, $isRangeSelection } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { fileKindOf, type FileKind } from './fileKind';
import { AttachmentPreviewPlugin } from './AttachmentPreviewPlugin';

export type ViewerFile = { url: string; name: string; kind: FileKind };

/*
 * CONTEXT
 * - Problem      : 본문의 첨부 파일 링크를 누르면 새 탭으로 열려 작업 흐름이 끊긴다.
 * - Why          : 업로드 파일 링크 클릭만 가로채 앱 위에 딤 오버레이로 띄운다. 네이티브 <dialog>의
 *                  showModal()은 배경을 inert로 만들어 딤 영역 클릭을 막고, 포커스 가두기·Escape 닫기를 기본 제공한다.
 * - Alternatives : 직접 만든 fixed 오버레이 — 포커스 트랩·배경 inert를 손으로 구현해야 한다.
 * - Trade-offs   : DOC·DOCX·HWP·MD는 브라우저가 미리보기를 못 해 다운로드 버튼만 보여준다.
 * - Edge Case    : 일반 웹 링크·Ctrl/Cmd 클릭·링크 글자 드래그 선택은 가로채지 않는다(ClickableLinkPlugin이 처리).
 *                  캡처 단계 리스너라 ClickableLinkPlugin(버블 단계)보다 먼저 실행된다.
 *                  다이얼로그는 body로 포털해 React Flow 노드의 드래그·클릭 리스너로 DOM 이벤트가 새지 않게 한다.
 */
export function FileViewerPlugin() {
  const [editor] = useLexicalComposerContext();
  const [file, setFile] = useState<ViewerFile | null>(null);

  useEffect(() => editor.registerRootListener((root) => {
    if (!root) return;
    const onClick = (event: MouseEvent) => {
      if (event.metaKey || event.ctrlKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!anchor || !root.contains(anchor)) return;
      const kind = fileKindOf(anchor.href);
      if (!kind) return;
      const selection = editor.getEditorState().read($getSelection);
      if ($isRangeSelection(selection) && !selection.isCollapsed()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setFile({ url: anchor.href, name: anchor.textContent ?? '', kind });
    };
    root.addEventListener('click', onClick, true);
    return () => root.removeEventListener('click', onClick, true);
  }), [editor]);

  return <>
    <AttachmentPreviewPlugin onOpen={setFile} />
    {file && <FileViewerDialog file={file} onClose={() => setFile(null)} />}
  </>;
}

function FileViewerDialog({ file, onClose }: { file: ViewerFile; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // 첫 페인트 전에 모달로 열어 문서 흐름에 잠깐 그려지는 것을 막는다
  useLayoutEffect(() => { dialogRef.current?.showModal(); }, []);

  // 보기 영역: 세로는 위아래 24px만 남기고, 가로는 오른쪽 바깥 × 버튼 자리(양쪽 56px)를 비운다
  return createPortal(
    <dialog
      ref={dialogRef}
      aria-label={file.name}
      onClose={onClose}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      className="m-auto max-h-none max-w-none overflow-visible bg-transparent p-0 text-foreground backdrop:bg-black/50"
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element -- 외부 S3 원본 표시라 next/image 최적화 대상이 아니다 */}
        {file.kind === 'image' && <img src={file.url} alt={file.name} className="block max-h-[calc(100dvh-48px)] max-w-[calc(100vw-112px)] rounded-[12px] object-contain" />}
        {file.kind === 'frame' && (
          <iframe src={file.url} title={file.name} className="block h-[calc(100dvh-48px)] w-[min(1000px,calc(100vw-112px))] rounded-[12px] border-0 bg-background" />
        )}
        {file.kind === 'download' && (
          <div className="flex w-[min(360px,calc(100vw-112px))] flex-col items-center gap-3 rounded-[16px] bg-background px-6 py-8 text-center">
            <p className="max-w-full truncate text-[14px] font-semibold" title={file.name}>{file.name}</p>
            <p className="text-[13px] text-muted">이 형식은 미리보기를 지원하지 않아요</p>
            <a href={file.url} download={file.name} className="editor-upload-button">다운로드</a>
          </div>
        )}
        {/* 별도 헤더 바 없이 보기 영역 우측 상단 모서리의 오른쪽 바깥에 둔다 */}
        <button
          type="button"
          aria-label="닫기"
          onClick={() => dialogRef.current?.close()}
          className="absolute top-0 left-full ml-3 flex size-9 items-center justify-center rounded-full bg-background text-foreground transition-colors hover:bg-surface"
        >
          <svg width="14" height="14" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M1 1L9 9M9 1L1 9" />
          </svg>
        </button>
      </div>
    </dialog>,
    document.body,
  );
}
