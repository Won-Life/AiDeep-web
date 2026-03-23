import client from './client';
import type {
  CreateWorkspaceRequest,
  CreateWorkspaceResponse,
  InviteWorkspaceRequest,
  InviteWorkspaceResponse,
  JoinWorkspaceRequest,
  SyncResponse,
  WorkspaceListItem,
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
