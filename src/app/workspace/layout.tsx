'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar, { SIDEBAR_WIDTH, RAIL_WIDTH } from '@/components/layout/Sidebar';
import OfflineBanner from '@/components/ui/OfflineBanner';
import ToastHost from '@/components/ui/ToastHost';
import { showToast } from '@/components/ui/toastStore';
import DropDown from '@/components/ui/DropDown';
import AiChatPanel, {
  AI_CHAT_HANDLE_WIDTH,
  AI_CHAT_PANEL_WIDTH,
} from '@/features/chat/AiChatPanel';
import ArchiveModal from '@/components/layout/ArchiveModal';
import SessionLoadError from '@/features/auth/SessionLoadError';
import { getMe } from '@/api/user';
import { logout } from '@/api/auth';
import { getWorkspaces } from '@/api/workspace';
import { getNodes } from '@/features/graph/api/getNodes';
import { convertToReactFlow } from '@/features/graph/api/mappers';
import { useWorkspaceWS } from '@/hooks/useWorkspaceWS';
import { onPresenceState } from '@/api/ws';
import { getCursorColor } from '@/utils/cursorColor';
import { WorkspaceLayoutProvider, useWorkspaceLayout } from './context';

// 마지막으로 보던 워크스페이스 — 새로고침 후에도 유지 (sync effect가 읽고/쓴다)
const LAST_WORKSPACE_KEY = 'aideep_last_workspace_id';

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
    syncError,
    setSyncError,
  } = useWorkspaceLayout();

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = sessionStorage.getItem('sidebar_open');
    return stored !== null ? stored === 'true' : true;
  });
  const [isChatOpen, setIsChatOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('aideep_chat_open') === 'true';
  });
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [sessionLoadFailed, setSessionLoadFailed] = useState(false);
  const [sessionAttempt, setSessionAttempt] = useState(0);

  const sidebarWidth = isSidebarOpen ? SIDEBAR_WIDTH : RAIL_WIDTH;

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

  const setChatOpen = useCallback((next: boolean) => {
    setIsChatOpen(next);
    sessionStorage.setItem('aideep_chat_open', String(next));
  }, []);

  const handleToggleChat = useCallback(() => {
    setIsChatOpen((current) => {
      const next = !current;
      sessionStorage.setItem('aideep_chat_open', String(next));
      return next;
    });
  }, []);

  /*
   * CONTEXT
   * - Problem      : 사용자 조회의 네트워크·서버 오류도 로그인 화면으로 보냈다.
   * - Why          : 인증 만료는 공용 client가 처리하고 조회 실패는 화면에서 재시도한다.
   * - Alternatives : 모든 실패 redirect → 유효한 세션에서도 재로그인을 요구한다.
   * - Trade-offs   : 일시적 장애 동안 사용자 정보를 필요로 하는 기능은 대기한다.
   * - Edge Case    : 연결 복구, unmount 후 응답, React StrictMode의 effect 재실행.
   */
  useEffect(() => {
    let active = true;
    let loading = false;
    const loadSession = async () => {
      if (loading) return;
      loading = true;
      try {
        const user = await getMe();
        if (active) {
          setUserMe(user);
          setSessionLoadFailed(false);
        }
      } catch {
        if (active) setSessionLoadFailed(true);
      } finally {
        loading = false;
      }
    };
    void loadSession();
    window.addEventListener('online', loadSession);
    return () => {
      active = false;
      window.removeEventListener('online', loadSession);
    };
  }, [sessionAttempt, setUserMe]);

  // 워크스페이스 + 노드/엣지 + 참여자 목록 — 최초 1회만 fetch (synced 이후 스킵)
  // syncError 중에도 스킵 — L2 "다시 시도"가 setSyncError(false)로 해제해야 재시도된다.
  useEffect(() => {
    if (synced || syncError) return;

    getWorkspaces()
      .then((list) => {
        if (!list.length) return Promise.reject('no workspace');
        // 우선순위: ① 온보딩 등에서 넘긴 ?workspaceId ② 사이드바 스위처로 전환한 현재 workspaceId
        // ③ 마지막으로 보던 워크스페이스(localStorage — 새로고침 시 첫 번째로 돌아가는 문제 방지) ④ 첫 번째
        const requestedId = new URLSearchParams(window.location.search).get('workspaceId');
        const lastViewedId = localStorage.getItem(LAST_WORKSPACE_KEY);
        const ws =
          (requestedId && list.find((w) => w.workspaceId === requestedId)) ||
          (workspaceId && list.find((w) => w.workspaceId === workspaceId)) ||
          (lastViewedId &&
            list.find((w) => w.workspaceId === lastViewedId)) ||
          list[0];
        localStorage.setItem(LAST_WORKSPACE_KEY, ws.workspaceId);
        if (requestedId) {
          const params = new URLSearchParams(window.location.search);
          params.delete('workspaceId');
          const rest = params.toString();
          window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''));
        }
        setWorkspaceId(ws.workspaceId);
        setWorkspaceRole(ws.role);

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
        if (err === 'no workspace') {
          // 워크스페이스 0개는 에러가 아니라 빈 상태 — 캔버스를 그대로 연다.
          setSynced(true);
          return;
        }
        // 네트워크·서버 실패 → L2 에러 화면. synced는 false로 둬 다시 시도 시 재fetch.
        console.error('[WorkspaceLayout] sync failed', err);
        setSyncError(true);
      });
  }, [synced, syncError, workspaceId, setWorkspaceId, setWorkspaceRole, setNodes, setEdges, setWorkspaceMembers, setSynced, setSyncError]);

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
            if (add.length) {
              // 이 경로로 들어오는 새 노드는 사실상 Meet Scribe가 만든 회의 노드(위 주석).
              // updater 안의 호출이라 StrictMode에서 2회 실행될 수 있지만,
              // showToast의 동일 메시지 1초 dedup이 흡수한다.
              showToast(`회의 노드 ${add.length}개가 만들어졌어요`, 'announce');
            }
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

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 z-0 transition-[right] duration-200 ease-out"
        style={{ right: isChatOpen ? AI_CHAT_PANEL_WIDTH : AI_CHAT_HANDLE_WIDTH }}
      >
        {children}
      </div>

      <Sidebar isOpen={isSidebarOpen} onToggle={handleToggleSidebar} />

      {/* 상단 ChipHeader는 렌더하지 않는다 — 캔버스 상단바를 없애 우측 도크 에디터를
          full-height(Figma C3)로 띄우기 위함. 프로필·설정·아카이브·프로젝트 칩 기능은
          좌측 사이드바로 이전 중(별도 세션). 컴포넌트 파일(ChipHeader.tsx)은 유지. */}

      <DropDown sidebarWidth={sidebarWidth} onChatOpen={() => setChatOpen(true)} />

      <AiChatPanel isOpen={isChatOpen} onToggle={handleToggleChat} />

      {isArchiveOpen && workspaceId && (
        <ArchiveModal
          workspaceId={workspaceId}
          onClose={() => setIsArchiveOpen(false)}
        />
      )}

      {/* L3: 오프라인 배너 + 저장 실패 토스트 */}
      {sessionLoadFailed && (
        <div className="absolute inset-0 z-[60]">
          <SessionLoadError onRetry={() => {
            setSessionLoadFailed(false);
            setSessionAttempt((attempt) => attempt + 1);
          }} />
        </div>
      )}
      <OfflineBanner />
      <ToastHost />
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
