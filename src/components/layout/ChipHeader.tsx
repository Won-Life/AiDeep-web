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
            className="text-sm transition-colors hover:bg-surface"
            style={{
              border: "1px solid rgb(var(--ds-gray-700))",
              borderRadius: 50,
              paddingLeft: 15,
              paddingRight: 15,
              paddingTop: 10,
              paddingBottom: 10,
              backgroundColor: activeProjectId === node.id ? "rgb(var(--surface-hover))" : undefined,
              color: activeProjectId === node.id ? "rgb(var(--foreground))" : "rgb(var(--muted))",
              fontWeight: activeProjectId === node.id ? 500 : 400,
            }}
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
