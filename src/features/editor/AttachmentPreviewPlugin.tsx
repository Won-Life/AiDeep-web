'use client';

import { useEffect, useState, useSyncExternalStore, type DragEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getNodeByKey, HISTORY_PUSH_TAG, DROP_COMMAND, DRAGOVER_COMMAND } from 'lexical';
import { $isLinkNode } from '@lexical/link';
import { useAttachmentPreviews, type AttachmentTarget } from './useAttachmentPreviews';
import { readAttachmentPresentation, setAttachmentPresentation, type AttachmentDisplay } from './attachmentPresentation';
import { AttachmentPreview } from './AttachmentPreview';
import { AttachmentMenu } from './AttachmentMenu';
import type { ViewerFile } from './FileViewerPlugin';

/*
 * CONTEXT
 * - Problem      : 파일별 본문 미리보기와 우클릭 전환을 기존 저장·협업 흐름에 연결해야 한다.
 * - Why          : 렌더링은 DOM 포털, 표시 선택은 LinkNode title 업데이트로 분리한다.
 * - Alternatives : 새 전역 상태나 파일 재업로드는 필요하지 않으며 서버 노드 타입 추가는 범위를 벗어난다.
 * - Trade-offs   : PDF iframe 안의 우클릭은 브라우저가 처리하므로 헤더와 옵션 버튼으로 메뉴를 제공한다.
 * - Edge Case    : 파일 삭제 시 열린 메뉴는 사라지고 읽기 전용 상태에서는 표시 변경을 차단한다.
 */
export function AttachmentPreviewPlugin({ onOpen }: { onOpen: (file: ViewerFile) => void }) {
  const [editor] = useLexicalComposerContext();
  const targets = useAttachmentPreviews(editor);
  const editable = useSyncExternalStore((notify) => editor.registerEditableListener(notify), () => editor.isEditable(), () => false);
  const [menu, setMenu] = useState<{ key: string; x: number; y: number; trigger: HTMLElement } | null>(null);
  const selected = targets.find((file) => file.key === menu?.key);
  const open = (file: AttachmentTarget) => onOpen({ url: file.url, name: file.name, kind: file.kind });
  const openMenu = (file: AttachmentTarget, x: number, y: number, trigger: HTMLElement) => setMenu({ key: file.key, x, y, trigger: trigger instanceof HTMLButtonElement ? trigger : file.anchor });
  const changeDisplay = (display: AttachmentDisplay) => {
    if (!selected || !editor.isEditable()) { setMenu(null); return; }
    const key = selected.key;
    editor.update(() => {
      const node = $getNodeByKey(key);
      if ($isLinkNode(node) && editor.isEditable()) node.setTitle(setAttachmentPresentation(node.getTitle(), display));
    }, { tag: HISTORY_PUSH_TAG });
    menu?.trigger.focus();
    setMenu(null);
  };
  const forwardFileDrag = (event: DragEvent<HTMLDivElement>, drop: boolean) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.stopPropagation();
    if (drop) editor.dispatchCommand(DROP_COMMAND, event.nativeEvent);
    else editor.dispatchCommand(DRAGOVER_COMMAND, event.nativeEvent);
  };
  useEffect(() => editor.registerUpdateListener(({ editorState }) => {
    setMenu((current) => current && !editorState.read(() => $getNodeByKey(current.key)?.isAttached()) ? null : current);
  }), [editor]);
  useEffect(() => editor.registerRootListener((root) => {
    if (!root) return;
    const context = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-attachment-key]') : null;
      const file = targets.find((target) => target.key === element?.dataset.attachmentKey);
      if (!element || !file) return;
      event.preventDefault();
      event.stopPropagation();
      setMenu({ key: file.key, x: event.clientX, y: event.clientY, trigger: file.anchor });
    };
    root.addEventListener('contextmenu', context);
    return () => root.removeEventListener('contextmenu', context);
  }), [editor, targets]);
  return <>
    {targets.map((file) => createPortal(<AttachmentPreview file={file} onOpen={() => open(file)} onMenu={(x, y, trigger) => openMenu(file, x, y, trigger)} onDragOver={(event) => forwardFileDrag(event, false)} onDrop={(event) => forwardFileDrag(event, true)} />, file.host, file.key))}
    {menu && selected && <AttachmentMenu {...menu} display={selected.kind === 'download' ? 'file' : readAttachmentPresentation(selected.title).display}
      canPreview={selected.kind !== 'download'} editable={editable} onDisplay={changeDisplay}
      onOpen={() => { setMenu(null); open(selected); }} onClose={() => setMenu(null)} />}
  </>;
}
