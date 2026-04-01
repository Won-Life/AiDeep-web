"use client";
import { useEffect, useMemo, useState } from "react";
import { initialNodes } from "@/mock/mindmap";
import { type Node } from "@xyflow/react";
import { type NodeView } from "@/features/nodes/TextUpdateNode";
import UserMenu from "./UserMenu";
import { getMe } from "@/api/user";
import { logout } from "@/api/auth";
import { type UserMeResponse } from "@/api/types";

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
  const mainNodes: Node<NodeView>[] = useMemo(
    () => initialNodes.filter((node) => node.data.isMain),
    [],
  );
  const [user, setUser] = useState<UserMeResponse | null>(null);

  useEffect(() => {
    getMe<UserMeResponse>().then(setUser).catch(() => {});
  }, []);

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  return (
    <header
      className="fixed top-0 right-0 h-16 bg-background border-b border-border z-30 flex items-center justify-between px-4 transition-all duration-300"
      style={{ left: `${sidebarWidth}px` }}
    >
      <div className="flex gap-2">
        {mainNodes.map((node: Node<NodeView>) => (
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
              backgroundColor:
                activeProjectId === node.id
                  ? "rgb(var(--surface-hover))"
                  : undefined,
              color:
                activeProjectId === node.id
                  ? "rgb(var(--foreground))"
                  : "rgb(var(--muted))",
              fontWeight: activeProjectId === node.id ? 500 : 400,
            }}
          >
            {node.data?.title}
          </button>
        ))}
      </div>

      {/* 오른쪽: 사용자 정보 */}
      {user && (
        <UserMenu
          username={user.username}
          email={user.email}
          onLogout={handleLogout}
        />
      )}
    </header>
  );
}
