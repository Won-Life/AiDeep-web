"use client";

import { NotionEditor } from "./NotionEditor";

interface NodeEditorPanelProps {
  nodeId: string;
  initialContent?: string;
  onSave?: (nodeId: string, jsonBody: string, markdownBody: string) => void;
  fullscreen?: boolean;
  onExpandClick?: () => void;
  borderColor?: string;
  handleSide?: "left" | "right";
}

export function NodeEditorPanel({
  nodeId,
  initialContent,
  onSave,
  fullscreen = false,
  onExpandClick,
  borderColor = "#D9D9D9",
  handleSide = "right",
}: NodeEditorPanelProps) {
  if (fullscreen) {
    return (
      <div className="w-full h-full bg-white flex flex-col overflow-hidden">
        <NotionEditor nodeId={nodeId} initialContent={initialContent} onSave={onSave} />
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
      <NotionEditor
        nodeId={nodeId}
        initialContent={initialContent}
        onSave={onSave}
        onFullscreen={onExpandClick}
      />
    </div>
  );
}
