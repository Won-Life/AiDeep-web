import client from './client';
import type {
  CreateProjectNodeRequest,
  CreateMdNodeRequest,
  UpdateMdNodeRequest,
  MoveNodeRequest,
  NodeResponse,
} from './types';

export async function createProjectNode(
  workspaceId: string,
  data: CreateProjectNodeRequest,
): Promise<string> {
  const { data: result } = await client.post<string>(
    `/workspace/${workspaceId}/node/project`,
    data,
  );
  return result;
}

export async function createMdNode(
  workspaceId: string,
  data: CreateMdNodeRequest,
): Promise<string> {
  const { data: result } = await client.post<string>(
    `/workspace/${workspaceId}/node/md`,
    data,
  );
  return result;
}

export async function getNode(
  workspaceId: string,
  nodeId: string,
): Promise<NodeResponse> {
  const { data: result } = await client.get<NodeResponse>(
    `/workspace/${workspaceId}/node/${nodeId}`,
  );
  return result;
}

export async function updateMdNode(
  workspaceId: string,
  nodeId: string,
  data: UpdateMdNodeRequest,
): Promise<string> {
  const { data: result } = await client.patch<string>(
    `/workspace/${workspaceId}/node/${nodeId}/md`,
    data,
  );
  return result;
}

export async function moveNode(
  workspaceId: string,
  nodeId: string,
  data: MoveNodeRequest,
): Promise<string> {
  const { data: result } = await client.patch<string>(
    `/workspace/${workspaceId}/node/${nodeId}/move`,
    data,
  );
  return result;
}
