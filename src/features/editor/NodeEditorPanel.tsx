"use client";

import { NotionEditor } from "./NotionEditor";
import type { SocketIoYjsProvider } from "@/lib/SocketIoYjsProvider";

interface NodeEditorPanelProps {
  nodeId: string;
  fullscreen?: boolean;
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
}

export function NodeEditorPanel({
  nodeId,
  fullscreen = false,
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
}: NodeEditorPanelProps) {
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
        <NotionEditor
          nodeId={nodeId}
          collabProvider={collabProvider}
          username={username}
          cursorColor={cursorColor}
          onFirstLineChange={onFirstLineChange}
        />
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
      {/* 닫기 버튼 */}
      {onClose && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-1 right-1 z-10 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
          style={{ width: 22, height: 22 }}
          title="닫기"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 1L9 9M9 1L1 9" />
          </svg>
        </button>
      )}
      {!collabProvider ? (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          워크스페이스를 불러오는 중...
        </div>
      ) : (
        <NotionEditor
          nodeId={nodeId}
          onFullscreen={onExpandClick}
          collabProvider={collabProvider}
          username={username}
          cursorColor={cursorColor}
          onFirstLineChange={onFirstLineChange}
        />
      )}
    </div>
  );
}
