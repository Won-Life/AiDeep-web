"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { NodeEditorPanel } from "@/features/editor/NodeEditorPanel";
import { getNode, updateNodeContent } from "@/features/graph/api/nodes";
import { showToast } from "@/components/ui/toastStore";
import { useWorkspaceLayout } from "@/app/workspace/context";
import { useYjsProvider } from "@/hooks/useYjsProvider";
import { useWorkspaceAwareness } from "@/hooks/useWorkspaceAwareness";
import { COLOR_PALETTE } from "@/features/graph/constants/colors";

function getUserCursorColor(userId: string): string {
  if (!userId) return COLOR_PALETTE[0].text;
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length].text;
}

export default function NodeFullscreenPage() {
  const router = useRouter();
  const params = useParams<{ nodeId: string }>();
  const searchParams = useSearchParams();

  const { sidebarWidth, userMe, workspaceRole, setNodes } = useWorkspaceLayout();
  const nodeId = params.nodeId;
  const workspaceId = searchParams.get("workspaceId") ?? "";

  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userName = userMe?.username ?? "Anonymous";
  const cursorColor = getUserCursorColor(userMe?.userId ?? "");

  const { provider: collabProvider } = useYjsProvider({
    nodeId: !loading && !error ? nodeId : null,
    userName,
    userColor: cursorColor,
  });

  // 워크스페이스 awareness — 전체화면 에디터에서도 "이 노드를 보는 중" 상태 전파
  const { setOpenEditorNodeId } = useWorkspaceAwareness({
    workspaceId,
    userName,
    userColor: cursorColor,
    role: workspaceRole ?? 'VIEWER',
  });

  useEffect(() => {
    if (!loading && !error && nodeId) {
      setOpenEditorNodeId(nodeId);
    }
    return () => setOpenEditorNodeId(null);
  }, [nodeId, loading, error, setOpenEditorNodeId]);

  useEffect(() => {
    if (!workspaceId || !nodeId) return;
    getNode(workspaceId, nodeId)
      .then((node) => setTitle(node.title))
      .catch(() => setError("노드를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [workspaceId, nodeId]);

  return (
    <div
      className="absolute inset-0 flex flex-col transition-all duration-300"
      style={{ top: 64, left: sidebarWidth }}
    >
      {/* 뒤로가기 + 제목 바 */}
      <div
        className="flex items-center gap-3 px-4 shrink-0 bg-background border-b border-border"
        style={{ height: 40 }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center rounded cursor-pointer hover:bg-surface transition-colors"
          style={{ width: 28, height: 28 }}
          title="돌아가기"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="rgb(var(--foreground))"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 2L4 7L9 12" />
          </svg>
        </button>
        {/*
         * CONTEXT
         * - Problem      : 전체화면 에디터에서도 제목을 변경할 수 있어야 한다.
         * - Why          : blur·Enter로 기존 제목 API에 저장하고 성공한 값을 캔버스 상태에 반영한다.
         * - Alternatives : 본문 첫 줄 연동은 사용자가 정한 제목을 덮어쓴다.
         * - Trade-offs   : 제목은 본문과 별도로 저장하며 실패 시 입력값을 남겨 재시도할 수 있다.
         * - Edge Case    : 로딩·오류 상태에서는 비활성화하고 한글 조합 중 Enter는 무시한다.
         */}
        <input
          aria-label="노드 제목"
          placeholder="제목 없음"
          value={title}
          disabled={loading || !!error}
          onChange={(event) => setTitle(event.currentTarget.value)}
          onBlur={async (event) => {
            const nextTitle = event.currentTarget.value;
            try {
              await updateNodeContent(workspaceId, nodeId, { title: nextTitle });
              setNodes((nodes) => nodes.map((node) => node.id === nodeId
                ? { ...node, data: { ...node.data, title: nextTitle } }
                : node));
            } catch { showToast('제목을 저장하지 못했어요. 다시 시도해 주세요'); }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.currentTarget.blur();
          }}
          className="min-w-0 flex-1 rounded bg-transparent text-sm font-medium text-foreground outline-none focus-visible:ring-1 focus-visible:ring-main-blue"
        />
      </div>

      {/* 에디터 */}
      <div className="flex-1 min-h-0">
        {loading && (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            불러오는 중...
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full text-sm text-red-400">
            {error}
          </div>
        )}
        {!loading && !error && (
          <NodeEditorPanel
            nodeId={nodeId}
            fullscreen
            workspaceId={workspaceId}
            collabProvider={collabProvider}
            username={userName}
            cursorColor={cursorColor}
          />
        )}
      </div>
    </div>
  );
}
