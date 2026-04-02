"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { NodeEditorPanel } from "@/features/editor/NodeEditorPanel";
import { getNode } from "@/features/graph/api/nodes";
import { useGraphLayout } from "@/app/graph/context";
import { useYjsProvider } from "@/hooks/useYjsProvider";
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

  const { sidebarWidth, userMe } = useGraphLayout();
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
          className="flex items-center justify-center rounded cursor-pointer hover:bg-[#F3F3F3] transition-colors"
          style={{ width: 28, height: 28 }}
          title="돌아가기"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="#666666"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 2L4 7L9 12" />
          </svg>
        </button>
        <span className="text-sm font-medium truncate text-foreground">
          {title}
        </span>
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
            collabProvider={collabProvider}
            username={userName}
            cursorColor={cursorColor}
            onFirstLineChange={(nextTitle) => setTitle(nextTitle)}
          />
        )}
      </div>
    </div>
  );
}
