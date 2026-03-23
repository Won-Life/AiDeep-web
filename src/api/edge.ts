import client from './client';
import type { CreateEdgeRequest } from './types';

export async function createEdge(
  workspaceId: string,
  data: CreateEdgeRequest,
): Promise<string> {
  const { data: result } = await client.post<string>(
    `/workspace/${workspaceId}/edge`,
    data,
  );
  return result;
}
