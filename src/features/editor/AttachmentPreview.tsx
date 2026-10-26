'use client';

import { useState, type DragEvent } from 'react';
import Button from '@/components/ui/Button';
import type { AttachmentTarget } from './useAttachmentPreviews';
import { readAttachmentPresentation } from './attachmentPresentation';

export function AttachmentPreview({ file, onOpen, onMenu, onDragOver, onDrop }: {
  file: AttachmentTarget; onOpen: () => void;
  onMenu: (x: number, y: number, trigger: HTMLElement) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void; onDrop: (event: DragEvent<HTMLDivElement>) => void;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const preview = file.kind !== 'download' && readAttachmentPresentation(file.title).display === 'preview';
  return (
    <div className="relative" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} onDragOver={onDragOver} onDrop={onDrop}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); onMenu(event.clientX, event.clientY, event.currentTarget); }}>
      <Button variant="ghost" size="sm" aria-label={`${file.name} 표시 옵션`} aria-haspopup="menu"
        className="absolute -top-10 right-1 z-10 !h-8 !px-2"
        onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); onMenu(rect.left, rect.bottom, event.currentTarget); }}>⋯</Button>
      {preview && (
        <div className="overflow-hidden rounded-b-xl border border-t-0 border-[var(--onnode-border)] bg-[var(--onnode-surface-subtle)]">
          {file.kind === 'image' && failedUrl !== file.url ? (
            <button type="button" aria-label={`${file.name} 크게 보기`} className="block w-full cursor-zoom-in" onClick={onOpen}>
              {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 원본 URL은 최적화 서버를 거치지 않는다 */}
              <img src={file.url} alt={file.name} loading="lazy" draggable={false} onError={() => setFailedUrl(file.url)} className="block max-h-[560px] w-full object-contain" />
            </button>
          ) : file.kind === 'frame' ? (
            <iframe src={file.url} title={`${file.name} 본문 미리보기`} loading="lazy" className="block h-[420px] w-full border-0 bg-background" />
          ) : <p className="p-4 text-sm text-[var(--onnode-text-secondary)]">이미지를 불러오지 못했어요.</p>}
          <div className="flex items-center justify-between gap-2 border-t border-[var(--onnode-border)] px-3 py-2 text-xs text-[var(--onnode-text-secondary)]">
            <span>{file.kind === 'frame' ? 'PDF가 보이지 않으면 크게 보기를 이용해주세요.' : '이미지를 클릭하면 크게 볼 수 있어요.'}</span>
            <Button variant="ghost" size="sm" onClick={onOpen} className="shrink-0 !h-7 !px-2">크게 보기</Button>
          </div>
        </div>
      )}
    </div>
  );
}
