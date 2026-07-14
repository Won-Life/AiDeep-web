"use client";

import { useState, useRef, useCallback } from "react";
import { NotionEditor, ToolbarPlugin } from "./NotionEditor";
import type { SocketIoYjsProvider } from "@/lib/SocketIoYjsProvider";
import { uploadFile } from "@/api/upload";

// ─── Types ────────────────────────────────────────────────────────────────────

type ImageAttachment = { id: string; type: "image"; src: string; caption: string };
type FileAttachment = { id: string; type: "file"; name: string; size: number; url: string };
type Attachment = ImageAttachment | FileAttachment;

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)}kb`
    : `${(bytes / 1024 / 1024).toFixed(1)}mb`;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── ExpandIcon ───────────────────────────────────────────────────────────────

function ExpandIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 11L11 1M8 1H11V4M4 11H1V8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M1 1L9 9M9 1L1 9" />
    </svg>
  );
}

// ─── Attachment Section ───────────────────────────────────────────────────────

function AttachmentSection({
  attachments,
  onAddImage,
  onAddFile,
  onCaptionChange,
  onRemove,
}: {
  attachments: Attachment[];
  onAddImage: (src: string) => void;
  onAddFile: (name: string, size: number, dataUrl: string) => void;
  onCaptionChange: (id: string, caption: string) => void;
  onRemove: (id: string) => void;
}) {
  const imageRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadFile(file);
      onAddImage(url);
    } catch { /* silent */ }
    e.target.value = "";
  }, [onAddImage]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url, originalName, size } = await uploadFile(file);
      onAddFile(originalName, size, url);
    } catch { /* silent */ }
    e.target.value = "";
  }, [onAddFile]);

  return (
    <div className="border-t border-gray-900">
      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
      <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />

      {attachments.length > 0 && (
        <div className="px-3 pt-2 space-y-2">
          {attachments.map((att) =>
            att.type === "image" ? (
              <div key={att.id} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={att.src}
                  alt={att.caption}
                  className="block w-full rounded-md"
                />
                <input
                  value={att.caption}
                  onChange={(e) => onCaptionChange(att.id, e.target.value)}
                  placeholder="사진 설명"
                  className="block w-full text-center bg-transparent border-none outline-none text-gray-500 placeholder:text-gray-500"
                  style={{ fontSize: 12, padding: "3px 0" }}
                />
                <button
                  type="button"
                  onClick={() => onRemove(att.id)}
                  className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center rounded-full text-white"
                  style={{ width: 20, height: 20, background: "rgba(0,0,0,0.45)" }}
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M1 1L9 9M9 1L1 9" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                key={att.id}
                className="relative group flex items-center gap-2.5 cursor-pointer rounded-md bg-surface hover:bg-surface-hover transition-colors border border-border"
                style={{ padding: "9px 12px" }}
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = att.url;
                  a.download = att.name;
                  a.click();
                }}
              >
                <svg width="14" height="16" viewBox="0 0 15 18" fill="none">
                  <path d="M9 1H2C1.46957 1 0.960859 1.21071 0.585786 1.58579C0.210714 1.96086 0 2.46957 0 3V15C0 15.5304 0.210714 16.0391 0.585786 16.4142C0.960859 16.7893 1.46957 17 2 17H13C13.5304 17 14.0391 16.7893 14.4142 16.4142C14.7893 16.0391 15 15.5304 15 15V7L9 1Z" fill="rgb(var(--ds-gray-900))" stroke="rgb(var(--ds-gray-700))" strokeWidth="1" strokeLinejoin="round" />
                  <path d="M9 1V7H15" stroke="rgb(var(--ds-gray-700))" strokeWidth="1" strokeLinejoin="round" />
                </svg>
                <span className="flex-1 typo-cap2 text-foreground truncate">
                  {att.name}
                </span>
                <span className="text-[12px] text-muted shrink-0">{formatSize(att.size)}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove(att.id); }}
                  className="hidden group-hover:flex items-center justify-center rounded-full ml-1 text-gray-300"
                  style={{ width: 18, height: 18, background: "rgb(var(--ds-gray-800))", flexShrink: 0 }}
                >
                  <svg width="7" height="7" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M1 1L9 9M9 1L1 9" />
                  </svg>
                </button>
              </div>
            )
          )}
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => imageRef.current?.click()}
          className="flex items-center gap-1.5 rounded-full cursor-pointer hover:bg-surface transition-colors px-2.5 py-1 typo-cap2 text-muted border border-border"
        >
          <svg width="12" height="12" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="0.7" y="0.7" width="11.6" height="11.6" rx="1.5" />
            <circle cx="4" cy="4" r="1" fill="currentColor" stroke="none" />
            <path d="M0.7 8.5l2.8-2.8 2 2 2.5-3.2 4.3 5" />
          </svg>
          사진
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 rounded-full cursor-pointer hover:bg-surface transition-colors px-2.5 py-1 typo-cap2 text-muted border border-border"
        >
          <svg width="10" height="12" viewBox="0 0 11 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 5.5L4.5 10.5a2.5 2.5 0 01-3.535-3.536L5.5 2.43a1.5 1.5 0 012.121 2.121L3.086 9.086a.5.5 0 01-.707-.707L7 3.76" />
          </svg>
          파일
        </button>
      </div>
    </div>
  );
}

// ─── NodeEditorPanel ──────────────────────────────────────────────────────────

interface NodeEditorPanelProps {
  nodeId: string;
  fullscreen?: boolean;
  inline?: boolean;
  updatedAt?: string;
  onExpandClick?: () => void;
  onClose?: () => void;
  onFocus?: () => void;
  panelZIndex?: number;
  handleSide?: "left" | "right";
  collabProvider: SocketIoYjsProvider | null;
  username?: string;
  cursorColor?: string;
  onFirstLineChange?: (text: string) => void;
  onContentChange?: (content: { markdownBody: string; jsonBody: string }) => void;
}

export function NodeEditorPanel({
  nodeId,
  fullscreen = false,
  inline = false,
  updatedAt,
  onExpandClick,
  onClose,
  onFocus,
  panelZIndex,
  handleSide = "right",
  collabProvider,
  username,
  cursorColor,
  onFirstLineChange,
  onContentChange,
}: NodeEditorPanelProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const handleAddImage = useCallback((src: string) => {
    setAttachments((prev) => [...prev, { id: generateId(), type: "image", src, caption: "" }]);
  }, []);

  const handleAddFile = useCallback((name: string, size: number, url: string) => {
    setAttachments((prev) => [...prev, { id: generateId(), type: "file", name, size, url }]);
  }, []);

  const handleCaptionChange = useCallback((id: string, caption: string) => {
    setAttachments((prev) => prev.map((a) => a.id === id && a.type === "image" ? { ...a, caption } : a));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // ── 인라인 모드 (사이드바 리소스 패널) ─────────────────────────────────────
  if (inline) {
    return (
      <div
        className="relative w-full bg-background border border-gray-700 overflow-hidden flex flex-col"
        style={{ borderRadius: 16 }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {onExpandClick && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onExpandClick(); }}
            className="absolute top-3 right-3 z-10 flex items-center justify-center rounded text-muted hover:bg-surface transition-colors"
            style={{ width: 22, height: 22 }}
            title="전체화면으로 보기"
          >
            <ExpandIcon />
          </button>
        )}

        <NotionEditor
          nodeId={nodeId}
          collabProvider={collabProvider}
          username={username}
          cursorColor={cursorColor}
          onFirstLineChange={onFirstLineChange}
          onContentChange={onContentChange}
          noMediaDrop
          autoGrow
          minHeight={attachments.length > 0 ? 80 : 150}
        />

        <AttachmentSection
          attachments={attachments}
          onAddImage={handleAddImage}
          onAddFile={handleAddFile}
          onCaptionChange={handleCaptionChange}
          onRemove={handleRemove}
        />

        {updatedAt && (
          <div className="shrink-0 px-3 py-2 border-t border-gray-900 text-[12px] text-gray-500">
            최종 수정일: {new Date(updatedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })}
          </div>
        )}
      </div>
    );
  }

  // ── 전체화면 모드 ─────────────────────────────────────────────────────────
  if (fullscreen) {
    if (!collabProvider) {
      return (
        <div className="w-full h-full flex items-center justify-center text-muted typo-body1">
          워크스페이스를 불러오는 중...
        </div>
      );
    }
    return (
      <div className="w-full h-full bg-background flex flex-col overflow-hidden">
        <div className="w-[62.5%] min-w-[300px] mx-auto flex flex-col flex-1 min-h-0">
          <NotionEditor
            nodeId={nodeId}
            collabProvider={collabProvider}
            username={username}
            cursorColor={cursorColor}
            onFirstLineChange={onFirstLineChange}
            toolbarSlot={<ToolbarPlugin />}
          />
        </div>
      </div>
    );
  }

  // ── 기본 모드 (캔버스 노드 패널) ─────────────────────────────────────────
  return (
    <div
      className="absolute w-[315px] min-h-[220px] max-h-[370px] bg-background border border-gray-700 overflow-hidden flex flex-col"
      style={{
        borderRadius: 16,
        top: "100%",
        marginTop: -12,
        ...(handleSide === "left" ? { right: 0 } : { left: 0 }),
        zIndex: panelZIndex ?? 0,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        e.stopPropagation();
        onFocus?.();
      }}
    >
      <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5">
        {onExpandClick && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onExpandClick(); }}
            className="flex items-center justify-center rounded text-muted hover:bg-surface transition-colors"
            style={{ width: 22, height: 22 }}
            title="전체화면으로 보기"
          >
            <ExpandIcon />
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="flex items-center justify-center rounded text-muted hover:bg-surface transition-colors"
            style={{ width: 22, height: 22 }}
            title="닫기"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      {!collabProvider ? (
        <div className="flex items-center justify-center h-full text-muted typo-body1">
          워크스페이스를 불러오는 중...
        </div>
      ) : (
        <NotionEditor
          nodeId={nodeId}
          collabProvider={collabProvider}
          username={username}
          cursorColor={cursorColor}
          onFirstLineChange={onFirstLineChange}
          onContentChange={onContentChange}
        />
      )}
    </div>
  );
}
