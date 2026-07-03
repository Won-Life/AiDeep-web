"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import type { Edge, Node } from "@xyflow/react";
import type {
  UserMeResponse,
  WorkspaceMember,
  WorkspaceRole,
} from "@/api/types";
import type { PresenceMember } from "@/api/ws";

interface WorkspaceLayoutContextValue {
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
  // 워크스페이스 참여자 (DB 전체 목록 — 초기화 시 fetch)
  workspaceMembers: WorkspaceMember[];
  setWorkspaceMembers: Dispatch<SetStateAction<WorkspaceMember[]>>;
  // 현재 접속 중인 참여자 (presence_state 이벤트 기반)
  collaborators: PresenceMember[];
  setCollaborators: Dispatch<SetStateAction<PresenceMember[]>>;
  // 그래프 데이터 (페이지 이동 시 유지)
  nodes: Node[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  edges: Edge[];
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  edgesRef: RefObject<Edge[]>;
  synced: boolean;
  setSynced: Dispatch<SetStateAction<boolean>>;
}

const WorkspaceLayoutContext = createContext<WorkspaceLayoutContextValue>(
  null as unknown as WorkspaceLayoutContextValue,
);

export function WorkspaceLayoutProvider({ children }: { children: ReactNode }) {
  const [userMe, setUserMe] = useState<UserMeResponse | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(0);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [collaborators, setCollaborators] = useState<PresenceMember[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [synced, setSynced] = useState(false);

  const edgesRef = useRef<Edge[]>(edges);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  return (
    <WorkspaceLayoutContext.Provider
      value={{
        userMe, setUserMe,
        focusedNodeId, setFocusedNodeId,
        sidebarWidth, setSidebarWidth,
        workspaceId, setWorkspaceId,
        workspaceRole, setWorkspaceRole,
        workspaceMembers, setWorkspaceMembers,
        collaborators, setCollaborators,
        nodes, setNodes,
        edges, setEdges,
        edgesRef,
        synced, setSynced,
      }}
    >
      {children}
    </WorkspaceLayoutContext.Provider>
  );
}

export const useWorkspaceLayout = () => useContext(WorkspaceLayoutContext);
