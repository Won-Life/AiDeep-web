export type NodeType = "PROJECT" | "DATA" | "RESOURCE" | "ARCHIVE";

/** GET /workspace/sync 응답의 success 필드 */
export interface SyncResponse {
  nodes: NodeDto[];
  edges: EdgeDto[];
}

export interface NodeContent {
  dataType?: string;
  color?: string;
  textColor?: string;
  markdownBody?: string;
  jsonBody?: string;
}

export interface NodeDto {
  node_id: string;
  title: string;
  node_type: NodeType;
  content: NodeContent;
  version: number;
  position_x: number;
  position_y: number;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EdgeDto {
  edge_id: string;
  workspace_id: string;
  source_id: string;
  target_id: string;
  source_handle: string;
  target_handle: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
