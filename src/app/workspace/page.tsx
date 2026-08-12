"use client";

import GraphCanvas from "../../features/graph/components/GraphCanvas";
import WorkspaceLoading from "@/components/ui/WorkspaceLoading";
import { useWorkspaceLayout } from "./context";

export default function WorkspacePage() {
  const {
    focusedNodeId, setFocusedNodeId,
    userMe,
    workspaceId,
    workspaceRole,
    nodes, setNodes,
    edges, setEdges,
    synced,
  } = useWorkspaceLayout();

  const currentUserId = userMe?.userId ?? "";
  const currentUserName = userMe?.username ?? "Anonymous";

  if (!workspaceId || !synced) {
    return <WorkspaceLoading />;
  }

  return (
    <GraphCanvas
      workspaceId={workspaceId}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      currentUserRole={workspaceRole ?? 'VIEWER'}
      focusedNodeId={focusedNodeId}
      onFocusComplete={() => setFocusedNodeId(null)}
      nodes={nodes}
      edges={edges}
      setNodes={setNodes}
      setEdges={setEdges}
    />
  );
}
