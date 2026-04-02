// ─── Response Envelope ───────────────────────────────────────────────

export type ApiResponse<T> =
  | { resultType: 'SUCCESS'; error: null; success: T }
  | {
      resultType: 'FAIL';
      error: { errorCode: string; reason: string; data: string };
      success: null;
    };

export class ApiError extends Error {
  constructor(
    public errorCode: string,
    public reason: string,
    public data: string,
  ) {
    super(reason);
    this.name = 'ApiError';
  }
}

// ─── Auth ────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export interface EmailSendRequest {
  email: string;
}

export interface EmailSendResponse {
  code: number;
}

export interface EmailVerifyRequest {
  email: string;
  code: number;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface IssueMasterRequest {
  userId: string;
}

// ─── User ────────────────────────────────────────────────────────────

export interface UserMeResponse {
  userId: string;
  username: string;
  email: string;
  createdAt: string;
}

// ─── Workspace ───────────────────────────────────────────────────────

export type WorkspaceRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface WorkspaceListItem {
  workspaceId: string;
  title: string;
  role: WorkspaceRole;
  joined: string;
}

export interface CreateWorkspaceRequest {
  title: string;
  role: WorkspaceRole;
}

export interface CreateWorkspaceResponse {
  workspaceId: string;
}

export interface InviteWorkspaceRequest {
  workspaceId: string;
  role: WorkspaceRole;
}

export interface InviteWorkspaceResponse {
  url: string;
  code: string;
}

export interface JoinWorkspaceRequest {
  code: string;
}

// ─── Node ────────────────────────────────────────────────────────────

export type NodeType = 'PROJECT' | 'DATA' | 'RESOURCE' | 'ARCHIVE';

export interface Position {
  x: number;
  y: number;
}

export interface NodeContent {
  dataType?: string;
  color?: string;
  textColor?: string;
  markdownBody?: string;
  jsonBody?: string;
}

export interface NodeResponse {
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

export interface CreateProjectNodeRequest {
  title: string;
  position: Position;
}

export interface MdBody {
  markdownBody: string;
  jsonBody: string;
  color: string;
  textColor: string;
}

export interface CreateMdNodeRequest {
  title: string;
  position: Position;
  body: MdBody;
}

export interface UpdateMdNodeRequest {
  title?: string;
  color?: string;
  textColor?: string;
}

export interface MoveNodeRequest {
  position: Position;
}

// ─── Edge ────────────────────────────────────────────────────────────

export interface EdgeResponse {
  edge_id: string;
  workspace_id: string;
  source_id: string;
  target_id: string;
  source_handle: string;
  target_handle: string;
  target_side: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateEdgeRequest {
  sourceId: string;
  targetId: string;
  sourceHandle: string;
  targetHandle: string;
}

// ─── Sync ────────────────────────────────────────────────────────────

export interface SyncResponse {
  nodes: NodeResponse[];
  edges: EdgeResponse[];
}

// ─── Upload ──────────────────────────────────────────────────────────

export interface UploadResponse {
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

// ─── WS (WebSocket Events) ───────────────────────────────────────────

export type WsEventType =
  | 'NODE_MOVE'
  | 'NODE_CREATE'
  | 'NODE_DELETE'
  | 'NODE_UPDATE'
  | 'EDGE_CREATE';

export interface WsNodeMoveEvent {
  type: 'NODE_MOVE';
  workspaceId: string;
  userId: string;
  nodeId: string;
  x: number;
  y: number;
}

export interface WsNodeCreateEvent {
  type: 'NODE_CREATE';
  workspaceId: string;
  userId: string;
  node: {
    nodeId: string;
    title: string;
    nodeType: NodeType;
    position: Position;
    data: NodeContent;
    createdAt: string;
  };
}

export interface WsNodeDeleteEvent {
  type: 'NODE_DELETE';
  workspaceId: string;
  nodeId: string;
  userId: string;
}

export interface WsNodeUpdateEvent {
  type: 'NODE_UPDATE';
  workspaceId: string;
  nodeId: string;
  userId: string;
  patch: {
    title?: string;
    position?: Position;
    data?: NodeContent;
  };
}

export interface WsEdgeCreateEvent {
  type: 'EDGE_CREATE';
  workspaceId: string;
  userId: string;
  edge: {
    edgeId: string;
    sourceId: string;
    targetId: string;
    sourceHandle: string;
    targetHandle: string;
  };
}

export type WsEvent =
  | WsNodeMoveEvent
  | WsNodeCreateEvent
  | WsNodeDeleteEvent
  | WsNodeUpdateEvent
  | WsEdgeCreateEvent;
