/*
 * CONTEXT
 * - Problem      : ChipHeader가 내부에서 getMe()를 직접 호출해 user 상태를 중복 관리.
 *                  layout.tsx에 이미 userMe가 있어 동일 API를 두 번 호출하는 낭비 발생.
 * - Why          : user·onLogout을 props로 주입받는 방식으로 전환.
 *                  ChipHeader는 표시 책임만, 데이터 소유는 layout 레벨에서 단일화.
 * - Alternatives : context 직접 구독 — ChipHeader가 GraphLayout context에 결합됨, 재사용성 저하.
 * - Trade-offs   : props drilling이 한 단계 추가되지만, 관심사 분리가 명확해짐.
 * - Edge Case    : user가 null이면 우측 영역 전체를 렌더하지 않음.
 */
"use client";
import { useMemo } from "react";
import { type Node } from "@xyflow/react";
import { type NodeView } from "@/features/nodes/TextUpdateNode";
import { type UserMeResponse } from "@/api/types";
import { type CursorsMap } from "@/hooks/useCursors";
import UserMenu from "./UserMenu";
import CollaboratorsList from "./CollaboratorsList";
import ShareButton from "./ShareButton";

interface ChipHeaderProps {
  sidebarWidth: number;
  nodes: Node<NodeView>[];
  onNodeFocus?: (nodeId: string) => void;
  activeProjectId?: string | null;
  /** layout 레벨에서 내려받는 사용자 정보 */
  user: UserMeResponse | null;
  onLogout: () => void;
  /** layout 레벨에서 내려받는 협업자 커서 맵 */
  collaborators: CursorsMap;
  workspaceId: string | null;
}

export default function ChipHeader({
  sidebarWidth,
  nodes,
  onNodeFocus,
  activeProjectId = null,
  user,
  onLogout,
  collaborators,
  workspaceId,
}: ChipHeaderProps) {
  const mainNodes: Node<NodeView>[] = useMemo(
    () => nodes.filter((node) => node.data.isMain),
    [nodes],
  );

  return (
    <header
      className="fixed top-0 right-0 h-16 bg-background border-b border-border z-30 flex items-center justify-between px-4 transition-all duration-300"
      style={{ left: `${sidebarWidth}px` }}
    >
      {/* 왼쪽: 프로젝트 chip 버튼 목록 */}
      <div className="flex gap-2">
        {mainNodes.map((node: Node<NodeView>) => (
          <button
            key={node.id}
            onClick={() => onNodeFocus?.(node.id)}
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

      {/* 오른쪽: 협업자 목록 → 유저 정보 → 공유하기 */}
      {user && (
        <div className="flex items-center gap-3">
          <CollaboratorsList
            collaborators={collaborators}
            workspaceId={workspaceId}
            currentUserId={user.userId}
            currentUsername={user.username}
          />
          <UserMenu
            username={user.username}
            email={user.email}
            onLogout={onLogout}
          />
          <ShareButton workspaceId={workspaceId} />
        </div>
      )}
    </header>
  );
}
