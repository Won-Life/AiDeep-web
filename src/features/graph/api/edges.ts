import { api } from "@/api/client";

export async function createEdge(
  workspaceId: string,
  sourceId: string,
  targetId: string,
  sourceHandle: string,
  targetHandle: string,
): Promise<{ edgeId: string }> {
  return api<{ edgeId: string }>(`/workspace/${workspaceId}/edge/`, {
    method: "POST",
    body: JSON.stringify({ sourceId, targetId, sourceHandle, targetHandle }),
  });
}

export async function deleteEdge(
  workspaceId: string,
  edgeId: string,
): Promise<void> {
  await api<void>(`/workspace/${workspaceId}/edge/${edgeId}`, {
    method: "DELETE",
  });
}
