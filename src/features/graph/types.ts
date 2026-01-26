export type Timestamp = string | number;
export type NodeType = string;
export type ContentType = string;
export type ReferenceType = string;

export interface WhiteboardResponse {
  whiteboardId: string;
  graphs: GraphDto[];
  meta: {
    updatedAt: Timestamp;
    version: number;
    name?: string | null;
  };
}

export interface GraphDto {
  graphId: string;
  nodes: NodeDto[];
  edges: EdgeDto[];
  meta: {
    updatedAt: string;
  };
}

export interface NodeDto {
  nodeId: string;
  nodeType: NodeType;
  contentType: ContentType;
  position: { x: number; y: number };
  color: string;
  meta: {
    updatedAt: string;
    createdAt: string;
    starred: boolean;
  };
  title: string;
  body?: string | null;
  referenceType?: ReferenceType | null;
  referenceid?: string | null;
}

export interface EdgeDto {
  edgeId: string;
  source: string;
  target: string;
  type?: string | null;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}
