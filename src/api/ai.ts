import client from './client';
import type { ChatRequest, ChatResponse } from './types';

export async function chatWithAi(
  workspaceId: string,
  data: ChatRequest,
): Promise<ChatResponse> {
  const { data: result } = await client.post<ChatResponse>(
    `/workspace/${workspaceId}/chat`,
    data,
  );
  return result;
}
