"use client";

import { useState, useRef, useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { NotionEditor, ToolbarPlugin } from "./NotionEditor";
import type { SocketIoYjsProvider } from "@/lib/SocketIoYjsProvider";
import { uploadFile } from "@/api/upload";
import { showToast } from "@/components/ui/toastStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type ImageAttachment = { id: string; type: "image"; src: string; caption: string };
type FileAttachment = { id: string; type: "file"; name: string; size: number; url: string };
export type Attachment = ImageAttachment | FileAttachment;

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
    if (file.size > 5 * 1024 * 1024) {
      showToast("최대 5MB 파일까지 첨부할 수 있어요");
      e.target.value = "";
      return;
    }
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
    if (file.size > 5 * 1024 * 1024) {
      showToast("최대 5MB 파일까지 첨부할 수 있어요");
      e.target.value = "";
      return;
    }
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
    <section className="editor-attachments" aria-label="첨부 파일">
      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
      <input ref={fileRef} type="file" accept="image/*,.pdf,.txt,.md,.doc,.docx,audio/*,video/*" className="hidden" onChange={handleFileChange} />
      <h3 className="flex items-center gap-3 text-[14px] font-semibold">
        첨부 <span className="text-[12px] font-normal text-muted">{attachments.length}</span>
      </h3>
      <div className="mt-2 flex flex-wrap gap-2" aria-live="polite">
        {attachments.map((att) => (
          <div key={att.id} className="group relative max-w-full">
            <a
              href={att.type === "image" ? att.src : att.url}
              target="_blank"
              rel="noopener noreferrer"
              download={att.type === "file" ? att.name : undefined}
              title={att.type === "file" ? `${att.name} · ${formatSize(att.size)}` : att.caption || "사진"}
              className="editor-attachment-chip"
            >
              <svg width="13" height="14" viewBox="0 0 11 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
                <path d="M9.5 5.5L4.5 10.5a2.5 2.5 0 01-3.535-3.536L5.5 2.43a1.5 1.5 0 012.121 2.121L3.086 9.086a.5.5 0 01-.707-.707L7 3.76" />
              </svg>
              <span className="truncate">{att.type === "file" ? att.name : att.caption || "사진"}</span>
            </a>
            <button
              type="button"
              aria-label={`${att.type === "file" ? att.name : "사진"} 첨부 제거`}
              onClick={() => onRemove(att.id)}
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-background text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            ><CloseIcon /></button>
          </div>
        ))}
        {uploading.map((file) => (
          <span key={file.id} className="editor-attachment-chip opacity-60">{file.name} · 업로드 중…</span>
        ))}
      </div>
      <button type="button" onClick={() => fileRef.current?.click()} className="editor-upload-button">파일 올리기</button>
      <p className="mt-1 text-[9px] text-muted">이미지 · PDF · 문서 · 음성 · 영상 · 최대 5MB</p>
    </section>
  );
}

// ─── NodeEditorPanel ──────────────────────────────────────────────────────────

interface NodeEditorPanelProps {
  nodeId: string;
  attachments?: Attachment[];
  onAttachmentsChange?: Dispatch<SetStateAction<Attachment[]>>;
  fullscreen?: boolean;
  inline?: boolean;
  /** 우측 단일 도크 모드. 숫자가 지정되면 같은 고정 위치에 렌더링한다. */
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
  attachments: nodeAttachments,
  onAttachmentsChange,
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
  const [localAttachments, setLocalAttachments] = useState<Attachment[]>([]);
  const attachments = nodeAttachments ?? localAttachments;
  const setAttachments = onAttachmentsChange ?? setLocalAttachments;

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
  }, [setAttachments]);

  const handleAddFile = useCallback((name: string, size: number, url: string) => {
    setAttachments((prev) => [...prev, { id: generateId(), type: "file", name, size, url }]);
  }, [setAttachments]);

  const handleCaptionChange = useCallback((id: string, caption: string) => {
    setAttachments((prev) => prev.map((a) => a.id === id && a.type === "image" ? { ...a, caption } : a));
  }, [setAttachments]);

  const handleRemove = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, [setAttachments]);

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
   * - Trade-offs   : 캔버스는 한 노드만 열고 패널은 오른쪽 같은 위치에서 전체 높이를 사용한다.
   * - Edge Case    : SSR(document 없음) — 포털 전 가드. collabProvider null 시 로딩 표시.
   */
  if (typeof dockIndex === "number") {
    if (typeof document === "undefined") return null;
    return createPortal(
      <div
        className="node-editor-dock fixed inset-y-0 right-0 z-[100] flex flex-col bg-background"
        role="complementary"
        aria-label="노트 에디터"
        data-node-id={nodeId}
        // portal이지만 React 합성 이벤트는 React 트리(노드 컴포넌트)로 버블한다 — 막지 않으면
        // 패널 클릭이 React Flow onNodeClick을 재발화해 방금 닫은 패널이 다시 열린다.
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          e.stopPropagation();
          onFocus?.();
        }}
      >
        {/*
         * CONTEXT
         * - Problem      : 에디터가 상단에서 떨어져 있고 경로·제목 순서와 첨부 영역이 시안과 다르다.
         * - Why          : 전체 높이의 고정 패널에 제목→경로, 본문, 첨부 칩을 배치한다.
         * - Alternatives : 이미지 내용을 기본 데이터로 넣으면 실제 노트와 예시가 섞인다.
         * - Trade-offs   : 실제 본문 길이에 따라 첨부 영역은 아래로 밀리고 패널 내부에서 스크롤한다.
         * - Edge Case    : 좁은 화면은 최대 화면 폭을 사용하고 긴 경로는 말줄임한다.
         */}
        <div className="editor-dock-header flex shrink-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-bold">{title?.trim() || "제목 없음"}</h2>
            {breadcrumb && <p className="mt-1 truncate text-[12px] text-muted" title={breadcrumb}>{breadcrumb}</p>}
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
          <div className="editor-dock-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <NotionEditor
              nodeId={nodeId}
              workspaceId={workspaceId}
              collabProvider={collabProvider}
              username={username}
              cursorColor={cursorColor}
              onContentChange={onContentChange}
              noMediaDrop
              autoGrow
              minHeight={398}
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
          workspaceId={workspaceId}
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
            workspaceId={workspaceId}
            collabProvider={collabProvider}
            username={username}
            cursorColor={cursorColor}
            onFirstLineChange={onFirstLineChange}
            toolbarSlot={<ToolbarPlugin workspaceId={workspaceId} />}
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
          workspaceId={workspaceId}
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
