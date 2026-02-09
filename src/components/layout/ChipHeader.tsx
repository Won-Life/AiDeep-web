"use client";
import { useMemo } from "react";
import { initialNodes } from "@/mock/mindmap";
import { type Node } from "@xyflow/react";
import { type NodeData } from "@/features/nodes/TextUpdateNode";

interface ChipHeaderProps {
  sidebarWidth: number;
  onNodeFocus?: (nodeId: string) => void;
  activeProjectId?: string | null;
}

export default function ChipHeader({
  sidebarWidth,
  onNodeFocus,
  activeProjectId = null,
}: ChipHeaderProps) {
  const mainNodes: Node<NodeData>[] = useMemo(
    () => initialNodes.filter((node) => node.data.isMain),
    [],
  );

  return (
    <header
      className="fixed top-0 right-0 h-16 bg-background border-b border-border z-30 flex items-center justify-between px-4 transition-all duration-300"
      style={{ left: `${sidebarWidth}px` }}
    >
      <div className="flex gap-2">
        {mainNodes.map((node: Node<NodeData>) => (
          <button
            key={node.id}
            onClick={() => {
              onNodeFocus?.(node.id);
            }}
            className={`px-4 py-2 rounded text-sm transition-colors ${
              activeProjectId === node.id
                ? "bg-surface-active text-foreground font-medium"
                : "bg-background text-muted hover:bg-surface-hover"
            }`}
          >
            {node.data?.text}
          </button>
        ))}
      </div>

      {/* 오른쪽: 사용자 정보 */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-muted rounded-full"></div>
        <span className="text-sm text-foreground">USER_name</span>
        <span className="text-muted">▼</span>
      </div>
    </header>
  );
}
