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
import DropDown from '@/components/ui/DropDown';
import UserMenu from '@/components/layout/UserMenu';
import { getMe } from '@/api/user';
import { logout } from '@/api/auth';
import { getWorkspaces } from '@/api/workspace';
import { getNodes } from '@/features/graph/api/getNodes';
import { convertToReactFlow } from '@/features/graph/components/GraphCanvas';
import { useWorkspaceWS } from '@/hooks/useWorkspaceWS';
import { useCursors } from '@/hooks/useCursors';
import { type NodeView } from '@/features/nodes/TextUpdateNode';
import { GraphLayoutProvider, useGraphLayout } from './context';

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

function GraphLayoutInner({ children }: { children: ReactNode }) {
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
    setNodes,
    setEdges,
    nodes,
    edgesRef,
    synced,
    setSynced,
  } = useGraphLayout();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [resources, setResources] = useState<Resource[]>(INITIAL_RESOURCES);
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(
      INITIAL_RESOURCES.filter((r) => r.subItems.length > 0).map((r) => r.id),
    ),
  );

  const sidebarWidth = isSidebarOpen ? SIDEBAR_WIDTH : VISIBLE_BUTTON_WIDTH;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('sidebar_open');
      if (stored !== null) setIsSidebarOpen(stored === 'true');
    }
  }, []);

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

  useEffect(() => {
    getMe()
      .then(setUserMe)
      // DO: 500(서버 에러)에도 /login으로 리다이렉트됨
      // isAxiosError(err) && err.response?.status === 401 일 때만 로그아웃해야 함
      .catch(() => router.replace('/login'));
  }, [router, setUserMe]);

  // 워크스페이스 + 노드/엣지 — 최초 1회만 fetch (synced 이후 스킵)
  useEffect(() => {
    if (synced) return;
    getWorkspaces()
      .then((list) => {
        if (!list.length) return;
        const ws = list[0];
        setWorkspaceId(ws.workspaceId);
        setWorkspaceRole(ws.role);
        return getNodes(ws.workspaceId);
      })
      .then((data) => {
        if (!data) return;
        const { nodes: flowNodes, edges: flowEdges } = convertToReactFlow(
          data.nodes ?? [],
          data.edges ?? [],
        );
        setNodes(flowNodes);
        setEdges(flowEdges);
        setSynced(true);
      })
      .catch((err) => {
        console.error('[GraphLayout] sync failed', err);
        setSynced(true);
      });
  }, [synced, setWorkspaceId, setNodes, setEdges, setSynced]);

  useWorkspaceWS({
    workspaceId: workspaceId ?? '',
    currentUserId: userMe?.userId,
    setNodes,
    setEdges,
    edgesRef,
  });

  const collaborators = useCursors(workspaceId ?? '', userMe?.userId ?? '');

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
      {/* 캔버스 영역 — 페이지 콘텐츠 */}
      <div className="absolute inset-0 z-0">{children}</div>

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
        collaborators={collaborators}
        workspaceId={workspaceId}
      />

      <DropDown sidebarWidth={sidebarWidth} />

      <UserMenu
        username={userMe?.username ?? ''}
        email={userMe?.email ?? ''}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default function GraphLayout({ children }: { children: ReactNode }) {
  return (
    <GraphLayoutProvider>
      <GraphLayoutInner>{children}</GraphLayoutInner>
    </GraphLayoutProvider>
  );
}
