"use client";

import { NotionEditor } from "./NotionEditor";
import type { SocketIoYjsProvider } from "@/lib/SocketIoYjsProvider";

interface NodeEditorPanelProps {
  nodeId: string;
  fullscreen?: boolean;
  onExpandClick?: () => void;
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
        zIndex: 0,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
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
