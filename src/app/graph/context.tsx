"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import type { Edge, Node } from "@xyflow/react";
import type { UserMeResponse, WorkspaceRole } from "@/api/types";

interface GraphLayoutContextValue {
  // 유저
  userMe: UserMeResponse | null;
  setUserMe: (user: UserMeResponse | null) => void;
  // 레이아웃
  focusedNodeId: string | null;
  setFocusedNodeId: (id: string | null) => void;
  sidebarWidth: number;
  setSidebarWidth: (w: number) => void;
  // 워크스페이스
  workspaceId: string | null;
  setWorkspaceId: Dispatch<SetStateAction<string | null>>;
  workspaceRole: WorkspaceRole | null;
  setWorkspaceRole: Dispatch<SetStateAction<WorkspaceRole | null>>;
  // 그래프 데이터 (페이지 이동 시 유지)
  nodes: Node[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  edges: Edge[];
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  edgesRef: RefObject<Edge[]>;
  synced: boolean;
  setSynced: Dispatch<SetStateAction<boolean>>;
}

const GraphLayoutContext = createContext<GraphLayoutContextValue>(
  null as unknown as GraphLayoutContextValue,
);

export function GraphLayoutProvider({ children }: { children: ReactNode }) {
  const [userMe, setUserMe] = useState<UserMeResponse | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(0);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [synced, setSynced] = useState(false);

  const edgesRef = useRef<Edge[]>(edges);
  edgesRef.current = edges;

  return (
    <GraphLayoutContext.Provider
      value={{
        userMe, setUserMe,
        focusedNodeId, setFocusedNodeId,
        sidebarWidth, setSidebarWidth,
        workspaceId, setWorkspaceId,
        workspaceRole, setWorkspaceRole,
        nodes, setNodes,
        edges, setEdges,
        edgesRef,
        synced, setSynced,
      }}
    >
      {children}
    </GraphLayoutContext.Provider>
  );
}

export const useGraphLayout = () => useContext(GraphLayoutContext);
