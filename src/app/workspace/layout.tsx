'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { type Node } from '@xyflow/react';
import Sidebar, {
  type Project,
  type Resource,
  SIDEBAR_WIDTH,
  VISIBLE_BUTTON_WIDTH,
} from '@/components/layout/Sidebar';
import ChipHeader from '@/components/layout/ChipHeader';
import AiSidebar, { AI_SIDEBAR_WIDTH, AI_SIDEBAR_VISIBLE_WIDTH } from '@/features/ai/AiSidebar';
import UserMenu from '@/components/layout/UserMenu';
import { getMe } from '@/api/user';
import { logout } from '@/api/auth';
import { getWorkspaces /*, getWorkspaceMembers */ } from '@/api/workspace'; // getWorkspaceMembers — GET /workspace/:id/members 백엔드 미구현
import { getNodes } from '@/features/graph/api/getNodes';
import { convertToReactFlow } from '@/features/graph/components/GraphCanvas';
import { useWorkspaceWS } from '@/hooks/useWorkspaceWS';
import { onPresenceState } from '@/api/ws';
import { getCursorColor } from '@/utils/cursorColor';
import { type NodeView } from '@/features/nodes/TextUpdateNode';
import { WorkspaceLayoutProvider, useWorkspaceLayout } from './context';

const INITIAL_PROJECTS: Project[] = [
  { id: 'w1', name: 'Workspaces 1' },
  { id: 'w2', name: 'Workspaces 2' },
  { id: 'w3', name: 'Workspaces 3' },
  { id: 'w4', name: 'Workspaces 4' },
];

const INITIAL_RESOURCES: Resource[] = [
  {
    id: 'r1',
    name: 'Resource n',
    subItems: [
      { id: 'r1-1', name: 'Resource n-1' },
      { id: 'r1-2', name: 'Resource n-2' },
      { id: 'r1-3', name: 'Resource n-3' },
    ],
  },
  { id: 'r2', name: 'Resource n', subItems: [] },
  {
    id: 'r3',
    name: 'Resource n',
    subItems: [
      { id: 'r3-1', name: 'Resource n-1' },
      { id: 'r3-2', name: 'Resource n-2' },
      { id: 'r3-3', name: 'Resource n-3' },
    ],
  },
  {
    id: 'r4',
    name: 'Resource n',
    subItems: [
      { id: 'r4-1', name: 'Resource n-1' },
      { id: 'r4-2', name: 'Resource n-2' },
      { id: 'r4-3', name: 'Resource n-3' },
    ],
  },
];

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function WorkspaceLayoutInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const {
    focusedNodeId,
    setFocusedNodeId,
    setUserMe,
    userMe,
    setSidebarWidth,
    workspaceId,
    setWorkspaceId,
    setWorkspaceRole,
    setWorkspaceMembers,
    setCollaborators,
    setNodes,
    setEdges,
    nodes,
    edgesRef,
    synced,
    setSynced,
  } = useWorkspaceLayout();

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = sessionStorage.getItem('sidebar_open');
    return stored !== null ? stored === 'true' : true;
  });
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = sessionStorage.getItem('ai_sidebar_open');
    return stored !== null ? stored === 'true' : false;
  });
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [resources, setResources] = useState<Resource[]>(INITIAL_RESOURCES);
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(
      INITIAL_RESOURCES.filter((r) => r.subItems.length > 0).map((r) => r.id),
    ),
  );

  const sidebarWidth = isSidebarOpen ? SIDEBAR_WIDTH : VISIBLE_BUTTON_WIDTH;
  const aiSidebarWidth = isAiSidebarOpen ? AI_SIDEBAR_WIDTH : AI_SIDEBAR_VISIBLE_WIDTH;

  useEffect(() => {
    setSidebarWidth(sidebarWidth);
  }, [sidebarWidth, setSidebarWidth]);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      sessionStorage.setItem('sidebar_open', String(next));
      return next;
    });
  }, []);

  const handleToggleAiSidebar = useCallback(() => {
    setIsAiSidebarOpen((prev) => {
      const next = !prev;
      sessionStorage.setItem('ai_sidebar_open', String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    getMe()
      .then(setUserMe)
      .catch(() => router.replace('/login'));
  }, [router, setUserMe]);

  // 워크스페이스 + 노드/엣지 + 참여자 목록 — 최초 1회만 fetch (synced 이후 스킵)
  useEffect(() => {
    if (synced) return;

    getWorkspaces()
      .then((list) => {
        if (!list.length) return Promise.reject('no workspace');
        const ws = list[0];
        setWorkspaceId(ws.workspaceId);
        setWorkspaceRole(ws.role);
        return Promise.all([
          getNodes(ws.workspaceId),
          // getWorkspaceMembers(ws.workspaceId),
        ]);
      })
      .then((results) => {
        if (!results) return;
        const [nodeData, members] = results;
        const { nodes: flowNodes, edges: flowEdges } = convertToReactFlow(
          nodeData.nodes ?? [],
          nodeData.edges ?? [],
        );
        setNodes(flowNodes);
        setEdges(flowEdges);
        // setWorkspaceMembers(members);
        setSynced(true);
      })
      .catch((err) => {
        if (err !== 'no workspace') {
          console.error('[WorkspaceLayout] sync failed', err);
        }
        setSynced(true);
      });
  }, [synced, setWorkspaceId, setWorkspaceRole, setNodes, setEdges, setWorkspaceMembers, setSynced]);

  useWorkspaceWS({
    workspaceId: workspaceId ?? '',
    currentUserId: userMe?.userId,
    userName: userMe?.username,
    color: userMe ? getCursorColor(userMe.userId) : undefined,
    profile: null,
    setNodes,
    setEdges,
    edgesRef,
  });

  // presence_state 이벤트 → collaborators 업데이트
  useEffect(() => {
    if (!workspaceId) return;
    const cleanup = onPresenceState((payload) => {
      if (payload.workspaceId !== workspaceId) return;
      setCollaborators(
        payload.members.filter((m) => m.userId !== userMe?.userId),
      );
    });
    return () => {
      cleanup();
      setCollaborators([]);
    };
  }, [workspaceId, userMe?.userId, setCollaborators]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {}
    router.replace('/login');
  }, [router]);

  const addProject = () =>
    setProjects((prev) => [
      ...prev,
      { id: makeId(), name: '', isEditing: true },
    ]);
  const saveProjectName = (id: string, name: string) =>
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name, isEditing: false } : p)),
    );
  const startEditProject = (id: string) =>
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isEditing: true } : p)),
    );
  const addResource = () =>
    setResources((prev) => [
      ...prev,
      { id: makeId(), name: '', subItems: [], isEditing: true },
    ]);
  const saveResourceName = (id: string, name: string) =>
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, name, isEditing: false } : r)),
    );
  const addSubItem = (resourceId: string) => {
    setResources((prev) =>
      prev.map((r) =>
        r.id === resourceId
          ? {
              ...r,
              subItems: [
                ...r.subItems,
                { id: makeId(), name: '', isEditing: true },
              ],
            }
          : r,
      ),
    );
    setExpanded((prev) => new Set([...prev, resourceId]));
  };
  const startEditResource = (id: string) =>
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isEditing: true } : r)),
    );
  const startEditSubItem = (resourceId: string, subItemId: string) =>
    setResources((prev) =>
      prev.map((r) =>
        r.id === resourceId
          ? {
              ...r,
              subItems: r.subItems.map((s) =>
                s.id === subItemId ? { ...s, isEditing: true } : s,
              ),
            }
          : r,
      ),
    );
  const saveSubItemName = (
    resourceId: string,
    subItemId: string,
    name: string,
  ) =>
    setResources((prev) =>
      prev.map((r) =>
        r.id === resourceId
          ? {
              ...r,
              subItems: r.subItems.map((s) =>
                s.id === subItemId ? { ...s, name, isEditing: false } : s,
              ),
            }
          : r,
      ),
    );
  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 캔버스 영역 — 오른쪽 AI 사이드바 공간 확보 */}
      <div className="absolute inset-0 z-0" style={{ right: aiSidebarWidth }}>{children}</div>

      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={handleToggleSidebar}
        projects={projects}
        resources={resources}
        expanded={expanded}
        onAddProject={addProject}
        onSaveProjectName={saveProjectName}
        onStartEditProject={startEditProject}
        onAddResource={addResource}
        onSaveResourceName={saveResourceName}
        onAddSubItem={addSubItem}
        onSaveSubItemName={saveSubItemName}
        onStartEditResource={startEditResource}
        onStartEditSubItem={startEditSubItem}
        onToggleExpand={toggleExpand}
      />

      <ChipHeader
        sidebarWidth={sidebarWidth}
        nodes={nodes as Node<NodeView>[]}
        onNodeFocus={setFocusedNodeId}
        activeProjectId={focusedNodeId}
        user={userMe}
        onLogout={handleLogout}
        workspaceId={workspaceId}
      />

      <AiSidebar isOpen={isAiSidebarOpen} onToggle={handleToggleAiSidebar} workspaceId={workspaceId} />

      <UserMenu
        username={userMe?.username ?? ''}
        email={userMe?.email ?? ''}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceLayoutProvider>
      <WorkspaceLayoutInner>{children}</WorkspaceLayoutInner>
    </WorkspaceLayoutProvider>
  );
}
