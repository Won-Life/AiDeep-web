import { api } from "@/api/client";

export async function createEdge(
  workspaceId: string,
  sourceId: string,
  targetId: string,
  sourceHandle: string,
  targetHandle: string,
): Promise<string> {
  return api<string>(`/workspace/${workspaceId}/edge/`, {
    method: "POST",
    body: JSON.stringify({ sourceId, targetId, sourceHandle, targetHandle }),
  });
}
