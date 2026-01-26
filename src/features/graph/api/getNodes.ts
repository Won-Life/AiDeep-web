import { ApiResponse } from "@/api/types";
import type { WhiteboardResponse } from "../types";

export async function getNodes(): Promise<ApiResponse<WhiteboardResponse>> {
  const res = await fetch("/api/node");
  return res.json();
}
