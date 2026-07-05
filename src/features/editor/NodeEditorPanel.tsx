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
    <div style={{ borderTop: "1px solid #F3F3F3" }}>
      <input ref={imageRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageChange} />
      <input ref={fileRef} type="file" style={{ display: "none" }} onChange={handleFileChange} />

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="px-3 pt-2 space-y-2">
          {attachments.map((att) =>
            att.type === "image" ? (
              <div key={att.id} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={att.src}
                  alt={att.caption}
                  style={{ maxWidth: "100%", borderRadius: 6, display: "block" }}
                />
                <input
                  value={att.caption}
                  onChange={(e) => onCaptionChange(att.id, e.target.value)}
                  placeholder="사진 설명"
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "center",
                    fontSize: 12,
                    color: "#999",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    padding: "3px 0",
                    cursor: "text",
                  }}
                />
                <button
                  type="button"
                  onClick={() => onRemove(att.id)}
                  className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center rounded-full"
                  style={{ width: 20, height: 20, background: "rgba(0,0,0,0.45)", color: "#fff" }}
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M1 1L9 9M9 1L1 9" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                key={att.id}
                className="relative group flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg"
                style={{ padding: "9px 12px", border: "1px solid #EBEBEB", background: "#FAFAFA" }}
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = att.url;
                  a.download = att.name;
                  a.click();
                }}
              >
                <svg width="14" height="16" viewBox="0 0 15 18" fill="none">
                  <path d="M9 1H2C1.46957 1 0.960859 1.21071 0.585786 1.58579C0.210714 1.96086 0 2.46957 0 3V15C0 15.5304 0.210714 16.0391 0.585786 16.4142C0.960859 16.7893 1.46957 17 2 17H13C13.5304 17 14.0391 16.7893 14.4142 16.4142C14.7893 16.0391 15 15.5304 15 15V7L9 1Z" fill="#F0F0F0" stroke="#CCCCCC" strokeWidth="1" strokeLinejoin="round" />
                  <path d="M9 1V7H15" stroke="#CCCCCC" strokeWidth="1" strokeLinejoin="round" />
                </svg>
                <span style={{ flex: 1, fontSize: 13, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {att.name}
                </span>
                <span style={{ fontSize: 12, color: "#AAA", flexShrink: 0 }}>{formatSize(att.size)}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove(att.id); }}
                  className="hidden group-hover:flex items-center justify-center rounded-full ml-1"
                  style={{ width: 18, height: 18, background: "#E8E8E8", color: "#666", flexShrink: 0 }}
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

      {/* Upload buttons */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => imageRef.current?.click()}
          className="flex items-center gap-1.5 rounded-full cursor-pointer hover:bg-gray-100 transition-colors px-2.5 py-1"
          style={{ fontSize: 13, color: "#888", border: "1px solid #E8E8E8" }}
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
          className="flex items-center gap-1.5 rounded-full cursor-pointer hover:bg-gray-100 transition-colors px-2.5 py-1"
          style={{ fontSize: 13, color: "#888", border: "1px solid #E8E8E8" }}
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
  borderColor?: string;
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
  borderColor = "#D9D9D9",
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

  if (inline) {
    return (
      <div
        className="relative bg-white border rounded-lg overflow-hidden flex flex-col"
        style={{ borderColor }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {onExpandClick && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onExpandClick(); }}
            className="absolute top-1.5 right-1.5 z-10 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
            style={{ width: 22, height: 22 }}
            title="전체화면으로 보기"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#858585" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 11L11 1M8 1H11V4M4 11H1V8" />
            </svg>
          </button>
        )}

        {/* 텍스트 에디터 — 컨텐츠 높이에 따라 자동 확장, 첨부 여부에 따라 최소 높이 변동 */}
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

        {/* 첨부파일 섹션 */}
        <AttachmentSection
          attachments={attachments}
          onAddImage={handleAddImage}
          onAddFile={handleAddFile}
          onCaptionChange={handleCaptionChange}
          onRemove={handleRemove}
        />

        {updatedAt && (
          <div
            className="shrink-0 px-3 py-2"
            style={{ borderTop: "1px solid #F0F0F0", fontSize: 12, color: "#AAAAAA" }}
          >
            최종 수정일: {new Date(updatedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })}
          </div>
        )}
      </div>
    );
  }

  if (fullscreen) {
    if (!collabProvider) {
      return (
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
          워크스페이스를 불러오는 중...
        </div>
      );
    }
    return (
      <div className="w-full h-full bg-white flex flex-col overflow-hidden">
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

  return (
    <div
      className="absolute bg-white border rounded-lg shadow-lg overflow-hidden flex flex-col"
      style={{
        width: "360px",
        minHeight: "220px",
        maxHeight: "480px",
        top: "100%",
        marginTop: "4px",
        borderColor,
        ...(handleSide === "left" ? { right: 0 } : { left: 0 }),
        zIndex: panelZIndex ?? 0,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        e.stopPropagation();
        onFocus?.();
      }}
    >
      <div className="absolute top-1 right-1 z-10 flex items-center gap-0.5">
        {onExpandClick && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onExpandClick(); }}
            className="flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
            style={{ width: 22, height: 22 }}
            title="전체화면으로 보기"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#858585" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 11L11 1M8 1H11V4M4 11H1V8" />
            </svg>
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
            style={{ width: 22, height: 22 }}
            title="닫기"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#858585" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1L9 9M9 1L1 9" />
            </svg>
          </button>
        )}
      </div>
      {!collabProvider ? (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
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
