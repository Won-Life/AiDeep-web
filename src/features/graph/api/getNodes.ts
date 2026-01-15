import { ApiResponse } from "@/api/types";
import type { NodeResponse } from "../types";

export async function getNodes(): Promise<ApiResponse<NodeResponse>> {
  const res = await fetch("/api/node");
  return res.json();
}
