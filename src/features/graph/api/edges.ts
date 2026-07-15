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

// 서버 PATCH /edge/:edgeId — 핸들(sourceHandle/targetHandle)만 부분 수정.
// 서브트리 방향 전환 시 내부 엣지 핸들을 서버에도 반영해 새로고침 후 불일치(#008)를 막는다.
export async function updateEdge(
  workspaceId: string,
  edgeId: string,
  patch: { sourceHandle?: string; targetHandle?: string },
): Promise<void> {
  await api<void>(`/workspace/${workspaceId}/edge/${edgeId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
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
