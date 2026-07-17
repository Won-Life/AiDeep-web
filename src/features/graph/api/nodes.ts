import { api } from "@/api/client";

export const EMPTY_LEXICAL_JSON = JSON.stringify({
  root: {
    children: [
      {
        children: [],
        direction: null,
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
    ],
    direction: null,
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
});

interface Position {
  x: number;
  y: number;
}

interface MdBody {
  markdownBody?: string;
  jsonBody?: string;
  color?: string;
  textColor?: string;
}

export async function createProjectNode(
  workspaceId: string,
  title: string,
  position: Position,
  body: { color: string; textColor: string },
): Promise<{ nodeId: string }> {
  // 서버 CreateProjectNodeBody가 body(color·textColor)를 @IsDefined()로 필수화(Aideep_backend#52) —
  // 생성 시 그래프 미확정이라 표시색(흰색)을 보내고, 실제 그래프 색은 첫 연결 시 backfillMainColor가 채운다.
  return api<{ nodeId: string }>(`/workspace/${workspaceId}/node/project`, {
    method: "POST",
    body: JSON.stringify({ title, position, body }),
  });
}

interface CreateNodeResponse {
  nodeId: string;
}

export async function createMdNode(
  workspaceId: string,
  title: string,
  position: Position,
  body: MdBody,
): Promise<CreateNodeResponse> {
  return api<CreateNodeResponse>(`/workspace/${workspaceId}/node/md`, {
    method: "POST",
    body: JSON.stringify({ title, position, body }),
  });
}

export async function moveNode(
  workspaceId: string,
  nodeId: string,
  position: Position,
): Promise<string> {
  const res = await api<string>(
    `/workspace/${workspaceId}/node/${nodeId}/move`,
    {
      method: "PATCH",
      body: JSON.stringify({ position }),
    },
  );
  return res;
}

export async function deleteNode(
  workspaceId: string,
  nodeId: string,
): Promise<void> {
  await api(`/workspace/${workspaceId}/node/${nodeId}`, {
    method: "DELETE",
  });
}

export async function updateNodeContent(
  workspaceId: string,
  nodeId: string,
  data: {
    title?: string;
    color?: string;
    textColor?: string;
    nodeType?: "PROJECT" | "DATA" | "RESOURCE" | "ARCHIVE";
  },
): Promise<string> {
  return api<string>(`/workspace/${workspaceId}/node/${nodeId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export interface NodeDetail {
  node_id: string;
  title: string;
  node_type: string;
  content: { markdownBody?: string; jsonBody?: string } | null;
  version: number;
  position_x: number;
  position_y: number;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export async function getNode(
  workspaceId: string,
  nodeId: string,
): Promise<NodeDetail> {
  return api<NodeDetail>(`/workspace/${workspaceId}/node/${nodeId}`);
}
