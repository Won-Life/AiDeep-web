import { api } from "@/api/client";
import type { SyncResponse } from "../types";

export async function getNodes(
  workspaceId: string,
): Promise<SyncResponse> {
  return api<SyncResponse>(`/workspace/sync?workspaceId=${encodeURIComponent(workspaceId)}`);
}
