export interface NodeResponse {
  whiteboardId: string;
  graphs: Graph[];
  meta: {
    name: string;
    version: number;
    updatedAt: string;
  };
}

export interface Graph {
  graphId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta: {
    updatedAt: string;
  };
}

export interface GraphNode {
  nodeId: string;
  nodeType: "PROJECT";
  contentType: "CONTENTCARD";
  position: { x: number; y: number };
  color: string;
  meta: {
    starred: boolean;
    createdAt: string;
    updatedAt: string;
  };
  title: string;
  body: string;
  referenceType: "PDF";
  referenceid: string;
}

export interface GraphEdge {
  edgeId: string;
  source: string;
  target: string;
  type: string;
  sourceHandle: string;
  targetHandle: string;
}
