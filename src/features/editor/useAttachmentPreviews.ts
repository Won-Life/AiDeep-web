'use client';

import { useEffect, useState } from 'react';
import { $isLinkNode, LinkNode } from '@lexical/link';
import { $isParagraphNode, $nodesOfType, type LexicalEditor } from 'lexical';
import { fileKindOf, type FileKind } from './fileKind';
import { readAttachmentPresentation } from './attachmentPresentation';

export type AttachmentTarget = {
  key: string; url: string; name: string; kind: FileKind; title: string | null;
  host: HTMLDivElement; anchor: HTMLAnchorElement;
};

/*
 * CONTEXT
 * - Problem      : 본문 미리보기를 전용 Lexical 노드로 저장하면 서버 변환이 실패한다.
 * - Why          : 파일 링크 아래 공간을 확보하고 편집 DOM 바깥 형제 슬롯에 React 포털로 미리보기를 겹친다.
 * - Alternatives : 링크를 전용 노드로 교체하거나 본문 밖에 모으면 저장 호환성 또는 문맥을 잃는다.
 * - Trade-offs   : 크기·위치 관측이 필요하지만 Lexical의 자식 DOM과 문서에는 원래 LinkNode만 남는다.
 * - Edge Case    : 링크 수정·삭제·undo·루트 교체 시 슬롯을 재정리하고 일반 본문 링크는 건드리지 않는다.
 */
export function useAttachmentPreviews(editor: LexicalEditor): AttachmentTarget[] {
  const [targets, setTargets] = useState<AttachmentTarget[]>([]);
  useEffect(() => {
    const slots = new Map<string, AttachmentTarget>();
    let frame = 0;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(sync); };
    const resize = new ResizeObserver(schedule);
    const remove = (slot: AttachmentTarget) => {
      resize.unobserve(slot.host);
      slot.host.remove();
      slot.anchor.classList.remove('ne-attachment-link');
      delete slot.anchor.dataset.attachmentKey;
      delete slot.anchor.dataset.attachmentDisplay;
      slot.anchor.style.removeProperty('--attachment-preview-height');
      slot.anchor.title = readAttachmentPresentation(slot.title).originalTitle ?? '';
    };
    const sync = () => {
      const root = editor.getRootElement();
      const container = root?.parentElement;
      const files = editor.getEditorState().read(() => $nodesOfType(LinkNode).flatMap((node) => {
        const parent = node.getParent();
        const kind = fileKindOf(node.getURL());
        return $isLinkNode(node) && kind && $isParagraphNode(parent) && parent.getChildrenSize() === 1
          ? [{ key: node.getKey(), url: node.getURL(), name: node.getTextContent(), title: node.getTitle(), kind }]
          : [];
      }));
      const next: AttachmentTarget[] = [];
      for (const file of files) {
        const anchor = editor.getElementByKey(file.key);
        if (!container || !(anchor instanceof HTMLAnchorElement)) continue;
        let slot = slots.get(file.key);
        if (slot && slot.anchor !== anchor) { remove(slot); slots.delete(file.key); slot = undefined; }
        const host = slot?.host ?? document.createElement('div');
        if (!slot) {
          host.contentEditable = 'false';
          host.className = 'ne-attachment-preview-host nodrag nopan nowheel';
          host.dataset.attachmentKey = file.key;
          resize.observe(host);
        }
        if (host.parentElement !== container) container.appendChild(host);
        anchor.classList.add('ne-attachment-link');
        anchor.dataset.attachmentKey = file.key;
        const { display, originalTitle } = readAttachmentPresentation(file.title);
        anchor.dataset.attachmentDisplay = file.kind === 'download' ? 'file' : display;
        anchor.title = originalTitle ?? '';
        const parentRect = container.getBoundingClientRect();
        const anchorRect = anchor.getBoundingClientRect();
        const scaleX = parentRect.width / (container.offsetWidth || 1) || 1;
        const scaleY = parentRect.height / (container.offsetHeight || 1) || 1;
        host.style.left = `${(anchorRect.left - parentRect.left) / scaleX + container.scrollLeft - container.clientLeft}px`;
        host.style.top = `${(anchorRect.bottom - parentRect.top) / scaleY + container.scrollTop - container.clientTop}px`;
        host.style.width = `${anchorRect.width / scaleX}px`;
        const reserved = `${host.offsetHeight}px`;
        if (anchor.style.getPropertyValue('--attachment-preview-height') !== reserved) anchor.style.setProperty('--attachment-preview-height', reserved);
        const target = { ...file, host, anchor };
        slots.set(file.key, target);
        next.push(target);
      }
      const keys = new Set(next.map((file) => file.key));
      for (const [key, slot] of slots) if (!keys.has(key)) { remove(slot); slots.delete(key); }
      setTargets((previous) => previous.length === next.length && previous.every((file, i) => {
        const other = next[i];
        return file.key === other.key && file.url === other.url && file.name === other.name && file.title === other.title && file.host === other.host;
      }) ? previous : next);
    };
    const unroot = editor.registerRootListener((root, previous) => { if (previous) resize.unobserve(previous); if (root) resize.observe(root); schedule(); });
    const unupdate = editor.registerUpdateListener(schedule);
    window.addEventListener('resize', schedule);
    return () => { unroot(); unupdate(); cancelAnimationFrame(frame); resize.disconnect(); window.removeEventListener('resize', schedule); slots.forEach(remove); };
  }, [editor]);
  return targets;
}
