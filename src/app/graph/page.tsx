"use client";

import GraphCanvas from "../../features/graph/components/GraphCanvas";
import { useGraphLayout } from "./context";

export default function GraphPage() {
  const {
    focusedNodeId, setFocusedNodeId,
    userMe,
    workspaceId,
    nodes, setNodes,
    edges, setEdges,
    synced,
  } = useGraphLayout();

  const currentUserId = userMe?.userId ?? "";
  const currentUserName = userMe?.username ?? "Anonymous";

  if (!workspaceId || !synced) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        워크스페이스를 불러오는 중...
      </div>
    );
  }

  return (
    <GraphCanvas
      workspaceId={workspaceId}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      focusedNodeId={focusedNodeId}
      onFocusComplete={() => setFocusedNodeId(null)}
      nodes={nodes}
      edges={edges}
      setNodes={setNodes}
      setEdges={setEdges}
    />
  );
}
