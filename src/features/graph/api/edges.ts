import { api } from "@/api/client";

interface CreateEdgeResponse {
  edgeId: string;
}

export async function createEdge(
  workspaceId: string,
  sourceId: string,
  targetId: string,
  sourceHandle: string,
  targetHandle: string,
): Promise<CreateEdgeResponse> {
  return api<CreateEdgeResponse>(`/workspace/${workspaceId}/edge/`, {
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
