import client from './client';
import type {
  CreateWorkspaceRequest,
  CreateWorkspaceResponse,
  InviteWorkspaceRequest,
  InviteWorkspaceResponse,
  JoinWorkspaceRequest,
  SyncResponse,
  WorkspaceListItem,
  WorkspaceMember,
} from './types';

export async function getWorkspaces(): Promise<WorkspaceListItem[]> {
  const { data } = await client.get<WorkspaceListItem[]>('/workspace');
  return data;
}

export async function createWorkspace(
  data: CreateWorkspaceRequest,
): Promise<CreateWorkspaceResponse> {
  const { data: result } = await client.post<CreateWorkspaceResponse>('/workspace', data);
  return result;
}

/** 워크스페이스 이름 변경 — 서버 PATCH /workspace/:id { title } (X8) */
export async function renameWorkspace(
  workspaceId: string,
  title: string,
): Promise<void> {
  await client.patch(`/workspace/${workspaceId}`, { title });
}

/** 워크스페이스 삭제(soft) — 서버 DELETE /workspace/:id. OWNER만, 최소 1개는 유지(서버 검증) (X9) */
export async function deleteWorkspace(workspaceId: string): Promise<void> {
  await client.delete(`/workspace/${workspaceId}`);
}

export async function inviteToWorkspace(
  data: InviteWorkspaceRequest,
): Promise<InviteWorkspaceResponse> {
  const { data: result } = await client.post<InviteWorkspaceResponse>('/workspace/invite', data);
  return result;
}

export async function joinWorkspace(
  workspaceId: string,
  data: JoinWorkspaceRequest,
): Promise<string> {
  const { data: result } = await client.post<string>(
    `/workspace/join/${workspaceId}`,
    data,
  );
  return result;
}

export async function syncWorkspace(workspaceId: string): Promise<SyncResponse> {
  const { data: result } = await client.get<SyncResponse>('/workspace/sync', {
    params: { workspaceId },
  });
  return result;
}

export async function getWorkspaceMembers(
  workspaceId: string,
): Promise<WorkspaceMember[]> {
  const { data } = await client.get<WorkspaceMember[]>('/workspace/members', {
    params: { workspaceId },
  });
  return data;
}

export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string,
): Promise<void> {
  await client.delete(`/workspace/${workspaceId}/member/${userId}`);
}
