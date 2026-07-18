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
import AiChatPanel from '@/features/chat/AiChatPanel';
import UserMenu from '@/components/layout/UserMenu';
import OnboardingPopup from '@/components/layout/OnboardingPopup';
import { getMe } from '@/api/user';
import { logout } from '@/api/auth';
import { getWorkspaces, getWorkspaceMembers } from '@/api/workspace';
import { getNodes } from '@/features/graph/api/getNodes';
import { convertToReactFlow } from '@/features/graph/components/GraphCanvas';
import { useWorkspaceWS } from '@/hooks/useWorkspaceWS';
import { onPresenceState } from '@/api/ws';
import { getCursorColor } from '@/utils/cursorColor';
import { SHOW_TEMP_HIDDEN_UI } from '@/lib/uiFlags';
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [resources, setResources] = useState<Resource[]>(INITIAL_RESOURCES);
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(
      INITIAL_RESOURCES.filter((r) => r.subItems.length > 0).map((r) => r.id),
    ),
  );

  const sidebarWidth = !SHOW_TEMP_HIDDEN_UI
    ? 0
    : isSidebarOpen
      ? SIDEBAR_WIDTH
      : VISIBLE_BUTTON_WIDTH;

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

        // 사이드바 Workspaces 목록: 서버 워크스페이스 전체를 매핑
        setProjects(list.map((w) => ({ id: w.workspaceId, name: w.title })));
        // 자물쇠(개인 워크스페이스) 판정 — 멤버 수 1명 이하 == 개인.
        // 부가 정보이므로 조회 실패 시 팀 취급(자물쇠 없음), 메인 로딩을 막지 않음.
        Promise.all(
          list.map((w) =>
            getWorkspaceMembers(w.workspaceId)
              .then((members) => members.length <= 1)
              .catch(() => false),
          ),
        ).then((personalFlags) => {
          // 함수형 업데이트 + id 매칭: 조회 동안 사용자가 추가/수정한 로컬 항목을 덮어쓰지 않는다
          const flagById = new Map(
            list.map((w, i) => [w.workspaceId, personalFlags[i]]),
          );
          setProjects((prev) =>
            prev.map((p) =>
              flagById.has(p.id) ? { ...p, isPersonal: flagById.get(p.id) } : p,
            ),
          );
        });

        return Promise.all([
          getNodes(ws.workspaceId),
          // getWorkspaceMembers(ws.workspaceId),
        ]);
      })
      .then((results) => {
        if (!results) return;
        const [nodeData] = results;
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

  // 주기적 재sync: 같은 계정의 다른 세션(예: Meet Scribe 익스텐션)이 만든 노드는
  // WS로 안 온다 — 서버가 발신자 유저룸을 broadcast에서 제외하고(ws.gateway .except),
  // 클라도 같은 userId 이벤트를 거르기 때문(useWorkspaceWS). 그래서 2분마다 서버 sync를
  // 다시 받아 로컬에 없는 노드/엣지만 append한다. 기존 노드는 건드리지 않아(위치·편집·WS
  // 반영분 보존) 드래그·낙관적 업데이트를 덮어쓰지 않는다.
  useEffect(() => {
    if (!synced || !workspaceId) return;
    const REFETCH_MS = 120_000;
    const id = setInterval(() => {
      getNodes(workspaceId)
        .then((data) => {
          const { nodes: fresh, edges: freshEdges } = convertToReactFlow(
            data.nodes ?? [],
            data.edges ?? [],
          );
          setNodes((prev) => {
            const have = new Set(prev.map((n) => n.id));
            const add = fresh.filter((n) => !have.has(n.id));
            return add.length ? [...prev, ...add] : prev;
          });
          setEdges((prev) => {
            const have = new Set(prev.map((e) => e.id));
            const add = freshEdges.filter((e) => !have.has(e.id));
            return add.length ? [...prev, ...add] : prev;
          });
        })
        .catch((err) => console.error('[graph] 주기 재sync 실패', err));
    }, REFETCH_MS);
    return () => clearInterval(id);
  }, [synced, workspaceId, setNodes, setEdges]);

  // 익스텐션(Meet Scribe) "완료된 회의록 확인하기"가 /workspace?focus=<nodeId>로 열면
  // 그 노드로 캔버스를 이동한다. synced 이후여야 노드가 state에 있어 GraphCanvas의 focus
  // effect(setCenter)가 실제로 중앙 이동한다.
  useEffect(() => {
    if (!synced) return;
    const focus = new URLSearchParams(window.location.search).get('focus');
    if (focus) setFocusedNodeId(focus);
  }, [synced, setFocusedNodeId]);

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
      <div className="absolute inset-0 z-0">{children}</div>

      {SHOW_TEMP_HIDDEN_UI && (
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
      )}

      <ChipHeader
        sidebarWidth={sidebarWidth}
        nodes={nodes as Node<NodeView>[]}
        onNodeFocus={setFocusedNodeId}
        activeProjectId={focusedNodeId}
        user={userMe}
        onLogout={handleLogout}
        workspaceId={workspaceId}
      />

      <DropDown sidebarWidth={sidebarWidth} onChatOpen={() => setIsChatOpen(true)} />

      {isChatOpen && (
        <AiChatPanel onClose={() => setIsChatOpen(false)} sidebarWidth={sidebarWidth} />
      )}

      <UserMenu
        username={userMe?.username ?? ''}
        email={userMe?.email ?? ''}
        onLogout={handleLogout}
      />

      <OnboardingPopup />
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
