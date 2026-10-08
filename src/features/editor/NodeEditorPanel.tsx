"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { NotionEditor, ToolbarPlugin } from "./NotionEditor";
import type { SocketIoYjsProvider } from "@/lib/SocketIoYjsProvider";
import { uploadFile } from "@/api/upload";
import { showToast } from "@/components/ui/toastStore";

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
  workspaceId,
}: {
  attachments: Attachment[];
  onAddImage: (src: string) => void;
  onAddFile: (name: string, size: number, dataUrl: string) => void;
  onCaptionChange: (id: string, caption: string) => void;
  onRemove: (id: string) => void;
  workspaceId: string;
}) {
  const imageRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // C4: 업로드 중 파일 — 완료 전까지 "업로드 중…" 칩으로 즉시 표시(기존엔 완료 후에야 나타남)
  const [uploading, setUploading] = useState<{ id: string; name: string }[]>([]);

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const id = generateId();
    setUploading((prev) => [...prev, { id, name: file.name }]);
    try {
      const { fileUrl } = await uploadFile(file, workspaceId);
      onAddImage(fileUrl);
    } catch {
      showToast("사진 업로드에 실패했어요");
    }
    setUploading((prev) => prev.filter((u) => u.id !== id));
    e.target.value = "";
  }, [onAddImage, workspaceId]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const id = generateId();
    setUploading((prev) => [...prev, { id, name: file.name }]);
    try {
      const { fileUrl, originalName, size } = await uploadFile(file, workspaceId);
      onAddFile(originalName, size, fileUrl);
    } catch {
      showToast("파일 업로드에 실패했어요");
    }
    setUploading((prev) => prev.filter((u) => u.id !== id));
    e.target.value = "";
  }, [onAddFile, workspaceId]);

  return (
    <div className="border-t border-gray-900">
      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
      <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />

      {(attachments.length > 0 || uploading.length > 0) && (
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
          {/* C4: 업로드 중 파일 — 완료 전 "업로드 중…" 칩(흐린 상태, 배경 없음) */}
          {uploading.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-2.5 rounded-md"
              style={{ padding: "9px 12px", opacity: 0.55 }}
            >
              <svg width="14" height="16" viewBox="0 0 15 18" fill="none">
                <path d="M9 1H2C1.46957 1 0.960859 1.21071 0.585786 1.58579C0.210714 1.96086 0 2.46957 0 3V15C0 15.5304 0.210714 16.0391 0.585786 16.4142C0.960859 16.7893 1.46957 17 2 17H13C13.5304 17 14.0391 16.7893 14.4142 16.4142C14.7893 16.0391 15 15.5304 15 15V7L9 1Z" fill="rgb(var(--ds-gray-900))" stroke="rgb(var(--ds-gray-700))" strokeWidth="1" strokeLinejoin="round" />
                <path d="M9 1V7H15" stroke="rgb(var(--ds-gray-700))" strokeWidth="1" strokeLinejoin="round" />
              </svg>
              <span className="flex-1 typo-cap2 text-foreground truncate">
                {u.name}
              </span>
              <span className="text-[12px] text-muted shrink-0">업로드 중…</span>
            </div>
          ))}
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
  /** 우측 도크 모드(C3/C4) — 열린 패널들 중 이 패널의 순번(0부터). 넘기면 캔버스 우측에 도크된다. */
  dockIndex?: number;
  /** 도크 헤더 제목 — 노드명(첫 줄) */
  title?: string;
  /** 도크 헤더 경로 — "프로젝트 > 타이틀" */
  breadcrumb?: string;
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
  /** 첨부 파일 S3 업로드 시 서버가 요구하는 워크스페이스 ID (필수) */
  workspaceId?: string;
}

export function NodeEditorPanel({
  nodeId,
  fullscreen = false,
  inline = false,
  dockIndex,
  title,
  breadcrumb,
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
  workspaceId = "",
}: NodeEditorPanelProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  /*
   * CONTEXT
   * - Problem      : 패널 확장 방향이 handleSide로만 정해져(기본 오른쪽), 중심·독립
   *                  노드나 화면 가장자리 노드에서 패널이 뷰포트를 벗어남 (#214).
   * - Why          : 패널 오픈 시점에 노드의 화면 좌표를 측정해, 기본 방향으로 열면
   *                  뷰포트를 벗어나고 반대 방향은 들어오는 경우에만 방향을 뒤집는다.
   * - Alternatives : 항상 뷰포트 중앙 기준 방향 결정 — handleSide(연결선 반대편으로
   *                  열림) 규칙이 깨져 연결선과 패널이 겹침.
   * - Trade-offs   : 오픈 시 1회 측정이라 이후 pan/드래그에는 따라가지 않음(기존과 동일).
   * - Edge Case    : 양쪽 다 벗어나는 극단 줌에서는 기본 방향 유지.
   */
  const panelRef = useRef<HTMLDivElement>(null);
  const [sideOverride, setSideOverride] = useState<"left" | "right" | null>(
    null,
  );
  const PANEL_WIDTH = 315;
  useEffect(() => {
    // 레이아웃 확정 후 다음 프레임에 측정 — 이펙트 본문 동기 setState 회피(React Compiler 규칙)
    const raf = requestAnimationFrame(() => {
      // offsetParent = 노드 래퍼(relative div) — 노드의 화면상 위치·크기
      const nodeRect = panelRef.current?.offsetParent?.getBoundingClientRect();
      if (!nodeRect) return;
      if (handleSide === "right") {
        // left:0 → 오른쪽으로 확장. 오른쪽 경계를 벗어나면 왼쪽 확장으로 전환
        if (
          nodeRect.left + PANEL_WIDTH > window.innerWidth &&
          nodeRect.right - PANEL_WIDTH >= 0
        ) {
          setSideOverride("left");
        }
      } else if (
        nodeRect.right - PANEL_WIDTH < 0 &&
        nodeRect.left + PANEL_WIDTH <= window.innerWidth
      ) {
        // right:0 → 왼쪽으로 확장. 왼쪽 경계를 벗어나면 오른쪽 확장으로 전환
        setSideOverride("right");
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [handleSide]);
  const effectiveSide = sideOverride ?? handleSide;

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

  // ── 우측 도크 모드 (C3/C4 — 콘텐츠 노드 클릭 → 캔버스 우측 내용 패널) ──────────
  /*
   * CONTEXT
   * - Problem      : 기존 캔버스 패널은 노드에 붙어(absolute top:100%) 뜨는 작은 창이라,
   *                  Figma C3/C4의 "우측 사이드바처럼 도크되는 내용 패널"과 달랐다.
   * - Why          : React Flow 뷰포트는 transform이 걸려 있어 그 안에서 position:fixed가
   *                  화면이 아니라 변환된 pane 기준이 된다. 그래서 createPortal로 패널을
   *                  document.body로 빼내 진짜 화면 우측에 고정한다. provider·협업 배선은
   *                  TextUpdateNode가 소유한 그대로 prop으로 받아 재사용 — 에디터 로직 불변.
   * - Alternatives : 패널 내용(NotionEditor+AttachmentSection)을 인라인 모드가 이미 가지므로
   *                  재사용. 별도 컴포넌트 신설은 provider·attachments 상태 중복이라 기각.
   * - Trade-offs   : 여러 노드를 동시에 열면 dockIndex 순으로 좌측으로 타일링된다(C3는 1개
   *                  기준). 화면이 좁으면 겹칠 수 있으나 다중 오픈은 드문 경로.
   * - Edge Case    : SSR(document 없음) — 포털 전 가드. collabProvider null 시 로딩 표시.
   */
  if (typeof dockIndex === "number") {
    if (typeof document === "undefined") return null;
    const DOCK_WIDTH = 340;
    return createPortal(
      <div
        className="fixed top-0 bottom-0 z-[100] flex w-[340px] flex-col border-l border-gray-700 bg-background"
        style={{ right: dockIndex * DOCK_WIDTH }}
        // portal이지만 React 합성 이벤트는 React 트리(노드 컴포넌트)로 버블한다 — 막지 않으면
        // 패널 클릭이 React Flow onNodeClick을 재발화해 방금 닫은 패널이 다시 열린다.
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          e.stopPropagation();
          onFocus?.();
        }}
      >
        {/* 헤더: 경로(프로젝트 > 타이틀) + 제목 + 확장/닫기 */}
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-4 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            {breadcrumb && (
              <p className="mb-0.5 truncate text-[11px] text-muted">{breadcrumb}</p>
            )}
            <h2 className="truncate text-[15px] font-bold text-foreground">
              {title?.trim() || "제목 없음"}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {onExpandClick && (
              <button
                type="button"
                onClick={onExpandClick}
                title="전체화면으로 보기"
                className="flex h-[22px] w-[22px] items-center justify-center rounded text-muted transition-colors hover:bg-surface"
              >
                <ExpandIcon />
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="닫기"
                className="flex h-[22px] w-[22px] items-center justify-center rounded text-muted transition-colors hover:bg-surface"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        </div>

        {!collabProvider ? (
          <div className="flex flex-1 items-center justify-center text-muted typo-body1">
            워크스페이스를 불러오는 중...
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
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
              workspaceId={workspaceId}
            />
            {updatedAt && (
              <div className="shrink-0 border-t border-gray-900 px-4 py-2 text-[12px] text-gray-500">
                최종 수정일:{" "}
                {new Date(updatedAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  weekday: "short",
                })}
              </div>
            )}
          </div>
        )}
      </div>,
      document.body,
    );
  }

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
          workspaceId={workspaceId}
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
            extraBottomPadding
          />
        </div>
      </div>
    );
  }

  // ── 기본 모드 (캔버스 노드 패널) ─────────────────────────────────────────
  return (
    <div
      ref={panelRef}
      className="absolute w-[315px] min-h-[220px] max-h-[370px] bg-background border border-gray-700 overflow-hidden flex flex-col"
      style={{
        borderRadius: 16,
        top: "100%",
        marginTop: -12,
        ...(effectiveSide === "left" ? { right: 0 } : { left: 0 }),
        zIndex: panelZIndex ?? 0,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        e.stopPropagation();
        onFocus?.();
      }}
    >
      {/* 버튼을 absolute 오버레이 대신 헤더 행으로 — 에디터 첫 줄과 겹침 방지 (#214) */}
      {/* 헤더 pt는 12px 이상 필수: 패널이 노드 아래로 12px 겹쳐 올라가므로(marginTop -12)
          그보다 얕으면 왼쪽 열림(right:0 정렬)에서 X·전체화면 버튼이 노드에 가려진다.
          플레이스홀더 위 총 여백 = 헤더 pt(12) + 버튼(22) + 에디터 pt(4) = 38px */}
      <div className="flex items-center justify-end gap-0.5 px-3 pt-3 shrink-0">
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
        <div className="flex flex-1 items-center justify-center text-muted typo-body1">
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
          compactTop
        />
      )}
    </div>
  );
}
