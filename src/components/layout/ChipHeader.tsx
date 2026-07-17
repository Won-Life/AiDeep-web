/*
 * CONTEXT
 * - Problem      : ChipHeader가 내부에서 getMe()를 직접 호출해 user 상태를 중복 관리.
 *                  layout.tsx에 이미 userMe가 있어 동일 API를 두 번 호출하는 낭비 발생.
 * - Why          : user·onLogout을 props로 주입받는 방식으로 전환.
 *                  collaborators는 하위 CollaboratorsList가 context에서 직접 읽는다
 *                  (ChipHeader는 currentUserId·currentUsername만 넘겨줌).
 * - Alternatives : context 직접 구독 — ChipHeader가 GraphLayout context에 결합됨, 재사용성 저하.
 * - Trade-offs   : props drilling이 한 단계 추가되지만, 관심사 분리가 명확해짐.
 * - Edge Case    : user가 null이면 우측 영역 전체를 렌더하지 않음.
 */
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Node } from "@xyflow/react";
import { type NodeView } from "@/features/nodes/TextUpdateNode";
import { type UserMeResponse } from "@/api/types";
import UserMenu from "./UserMenu";
import CollaboratorsList from "./CollaboratorsList";
import ShareButton from "./ShareButton";
import BugReportButton from "./BugReportButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { ONBOARDING_URL } from "./OnboardingPopup";
import { SHOW_TEMP_HIDDEN_UI } from "@/lib/uiFlags";

interface ChipHeaderProps {
  sidebarWidth: number;
  nodes: Node<NodeView>[];
  onNodeFocus?: (nodeId: string) => void;
  activeProjectId?: string | null;
  user: UserMeResponse | null;
  onLogout: () => void;
  workspaceId: string | null;
}

export default function ChipHeader({
  sidebarWidth,
  nodes,
  onNodeFocus,
  activeProjectId = null,
  user,
  onLogout,
  workspaceId,
}: ChipHeaderProps) {
  const mainNodes: Node<NodeView>[] = useMemo(
    () => nodes.filter((node) => node.data.isMain),
    [nodes],
  );

  // 칩 목록이 양쪽으로 넘쳤는지 감지 — 넘친 방향의 스크롤 버튼만 노출
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
    // 노드 수·사이드바 너비 변화 시 재측정
  }, [mainNodes, sidebarWidth]);

  return (
    <header
      className="fixed top-0 right-0 h-16 bg-background border-b border-border z-30 flex items-center justify-between px-4 transition-all duration-300"
      style={{ left: `${sidebarWidth}px` }}
    >
      {/* 왼쪽: 프로젝트 chip 버튼 목록 — 넘치면 우측 유저 영역 침범 대신 가로 스크롤(바 숨김) */}
      <div className="relative flex-1 min-w-0 group">
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-2 overflow-x-auto scrollbar-hide"
        >
        {mainNodes.map((node: Node<NodeView>) => (
          <button
            key={node.id}
            onClick={() => onNodeFocus?.(node.id)}
            title={node.data?.title}
            // max-w-[10em]로 ~8글자 말줄임, 호버 시 max-w-none로 제자리에서 전체 제목까지 확장(pure CSS)
            className="text-sm transition-colors hover:bg-surface shrink-0 overflow-hidden text-ellipsis whitespace-nowrap max-w-[10em] hover:max-w-none"
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

        {/* 넘칠 때만: 좌측 끝 반투명 원형 버튼 — 클릭 시 좌측으로 스크롤 */}
        {canScrollLeft && (
          <button
            type="button"
            aria-label="이전 칩 보기"
            onClick={() =>
              scrollRef.current?.scrollBy({ left: -240, behavior: "smooth" })
            }
            className="absolute left-0 top-1/2 z-40 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/60 text-foreground opacity-0 backdrop-blur-sm transition-opacity hover:bg-surface group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:border-main"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}

        {/* 넘칠 때만: 우측 끝 반투명 원형 버튼(칩 위 z-index) — 클릭 시 우측으로 스크롤 */}
        {canScrollRight && (
          <button
            type="button"
            aria-label="다음 칩 보기"
            onClick={() =>
              scrollRef.current?.scrollBy({ left: 240, behavior: "smooth" })
            }
            className="absolute right-0 top-1/2 z-40 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/60 text-foreground opacity-0 backdrop-blur-sm transition-opacity hover:bg-surface group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:border-main"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        )}
      </div>

      {/* 오른쪽: 협업자 목록 → 유저 정보 → 공유하기 (칩 목록과 영역 분리, 밀려나지 않도록 shrink-0) */}
      {user && (
        <div className="flex items-center gap-3 shrink-0 pl-4">
          {SHOW_TEMP_HIDDEN_UI && (
            <CollaboratorsList
              currentUserId={user.userId}
              currentUsername={user.username}
            />
          )}
          <UserMenu
            username={user.username}
            email={user.email}
            onLogout={onLogout}
          />
          <Tooltip label="AIDeep 사용법 보기" align="end">
            <a
              href={ONBOARDING_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="AIDeep 사용법 보기"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-surface"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 4" />
                <path d="M12 17h.01" />
              </svg>
            </a>
          </Tooltip>
          <BugReportButton />
          {SHOW_TEMP_HIDDEN_UI && <ShareButton workspaceId={workspaceId} />}
        </div>
      )}
    </header>
  );
}
