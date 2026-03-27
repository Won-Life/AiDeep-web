import { api } from "@/api/client";

interface Position {
  x: number;
  y: number;
}

interface MdBody {
  markdownBody: string;
  jsonBody: string;
  color : string
  textColor : string
}

interface CreateNodeResponse {
  nodeId: string;
}

export async function createProjectNode(
  workspaceId: string,
  title: string,
  position: Position,
): Promise<CreateNodeResponse> {
  return api<CreateNodeResponse>(`/workspace/${workspaceId}/node/project`, {
    method: "POST",
    body: JSON.stringify({ title, position }),
  });
}

export async function createMdNode(
  workspaceId: string,
  title: string,
  position: Position,
  body : MdBody
  // body: MdBody = { markdownBody: "", jsonBody: "" },
): Promise<CreateNodeResponse> {
  console.log(body)
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
  return api<string>(`/workspace/${workspaceId}/node/${nodeId}/move`, {
    method: "PATCH",
    body: JSON.stringify({ position }),
  });
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
  data: { title?: string; body?: MdBody },
): Promise<string> {
  return api<string>(`/workspace/${workspaceId}/node/${nodeId}/md`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
