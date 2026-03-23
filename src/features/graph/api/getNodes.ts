import { ApiResponse } from "@/api/types";
import type { WhiteboardResponse } from "../types";

export async function getNodes(
  workspaceId: string,
): Promise<ApiResponse<WhiteboardResponse>> {
  const params = new URLSearchParams({ workspaceId });
  const res = await fetch(`/api/workspace/sync?${params.toString()}`);
  return res.json();
}
