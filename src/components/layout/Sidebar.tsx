'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type { Node } from '@xyflow/react';
import { useWorkspaceLayout } from '@/app/workspace/context';
import { getWorkspaces, createWorkspace } from '@/api/workspace';
import { logout } from '@/api/auth';
import { createProjectNode } from '@/features/graph/api/nodes';
import { getRandomColorPair } from '@/features/graph/constants/colors';
import type { WorkspaceListItem } from '@/api/types';

/*
 * CONTEXT
 * - Problem      : 기존 사이드바는 워크스페이스 목록 + 더미 Resource 트리 구조였고
 *                  SHOW_TEMP_HIDDEN_UI=false로 제품에서 숨겨져 있었다. Figma 08
 *                  X1~X7 시안은 "단일 워크스페이스 안에서 작업" 구조로 전면 재편됐다:
 *                  헤더(스위처) + 노드 검색(⌘K) + 프로젝트→타이틀 트리 + 프로필,
 *                  접으면 아이콘 레일.
 * - Why          : 트리는 WorkspaceLayoutContext의 nodes·edges(WS 단일 진실 소스의
 *                  로컬 사본)에서 유도하는 읽기 전용 뷰다 — 별도 REST 조회를 하면
 *                  같은 데이터의 두 사본이 생겨 어긋난다. 행 클릭은 setFocusedNodeId로
 *                  GraphCanvas의 기존 카메라 이동 effect를 재사용한다.
 * - Alternatives : 사이드바 자체 getNodes 조회 — 단일 진실 소스 규칙 위반, 기각.
 *                  워크스페이스 전환을 페이지 리로드로 처리 — 상태는 간단해지나
 *                  로그인 세션·캔버스 복귀 비용이 커서 setSynced(false) 재동기화 채택.
 * - Trade-offs   : 회의 진행 중 배너(X5)는 회의 기능(별도 담당)이 상태를 주기 전까지
 *                  meeting=null 스텁으로 숨김. 타이틀 옆 빨간 점도 같은 이유로 보류.
 * - Edge Case    : 검색어가 프로젝트명에 맞으면 자식 전체 노출, 타이틀에만 맞으면
 *                  해당 타이틀만 남긴다. 트리 정렬은 캔버스 y좌표 순 — 시안의
 *                  위→아래 배치와 일치.
 */

export const SIDEBAR_WIDTH = 240;
export const RAIL_WIDTH = 48;

// ─── 공통 소품 ────────────────────────────────────────────────────────────────

/** 워크스페이스 아이콘 — 이름 첫 글자를 어두운 사각형에 표시 */
function WorkspaceIcon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[6px] bg-foreground font-semibold text-background"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {name.trim().charAt(0) || 'W'}
    </span>
  );
}

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-surface-hover font-semibold text-foreground"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {name.trim().charAt(0) || '?'}
    </span>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-surface disabled:opacity-50 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

// ─── 트리 유도 ────────────────────────────────────────────────────────────────

type NodeData = { title?: string; isMain?: boolean };

interface TreeTitle {
  id: string;
  title: string;
}

interface TreeProject {
  id: string;
  title: string;
  titles: TreeTitle[];
}

function nodeTitle(n: Node): string {
  return ((n.data as NodeData)?.title ?? '').trim();
}

/** context의 nodes·edges에서 프로젝트 → 타이틀(직계 자식) 2단 트리를 유도 */
function useProjectTree(query: string): TreeProject[] {
  const { nodes, edges } = useWorkspaceLayout();

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const projects = nodes
    .filter((n) => (n.data as NodeData)?.isMain)
    .sort((a, b) => a.position.y - b.position.y)
    .map((p) => {
      const titles = edges
        .filter((e) => e.source === p.id)
        .map((e) => byId.get(e.target))
        .filter((n): n is Node => Boolean(n))
        .sort((a, b) => a.position.y - b.position.y)
        .map((n) => ({ id: n.id, title: nodeTitle(n) || '제목 없음' }));
      return { id: p.id, title: nodeTitle(p) || '제목 없음', titles };
    });

  const q = query.trim().toLowerCase();
  if (!q) return projects;
  return projects
    .map((p) => {
      if (p.title.toLowerCase().includes(q)) return p; // 프로젝트 매칭 → 자식 전체 유지
      const titles = p.titles.filter((t) => t.title.toLowerCase().includes(q));
      return { ...p, titles };
    })
    .filter((p) => p.title.toLowerCase().includes(q) || p.titles.length > 0);
}

// ─── 회의 진행 중 배너 (X5) ───────────────────────────────────────────────────

/** 회의 기능(별도 담당)이 제공할 상태 계약 — 확정 전까지 호출부에서 null 고정 */
export interface ActiveMeeting {
  titleNodeId: string;
  titleName: string;
  source: string; // 예: 'Zoom'
  elapsedLabel: string; // 예: '03:12'
}

function MeetingBanner({
  meeting,
  onClick,
}: {
  meeting: ActiveMeeting | null;
  onClick: (titleNodeId: string) => void;
}) {
  if (!meeting) return null;
  return (
    <button
      type="button"
      onClick={() => onClick(meeting.titleNodeId)}
      className="flex w-full items-center justify-between rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-left"
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-red-500">
          <span className="text-[9px]">●</span> 회의 진행 중
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] text-muted">
          {meeting.titleName} · {meeting.source} · {meeting.elapsedLabel}
        </span>
      </span>
      <span className="text-[12px] text-muted">›</span>
    </button>
  );
}

// ─── 워크스페이스 스위처 (X6) + 새 워크스페이스 모달 (X7) ────────────────────

function WorkspaceSwitcher({
  open,
  currentId,
  onClose,
  onSwitch,
  onNewWorkspace,
}: {
  open: boolean;
  currentId: string | null;
  onClose: () => void;
  onSwitch: (ws: WorkspaceListItem) => void;
  onNewWorkspace: () => void;
}) {
  const [list, setList] = useState<WorkspaceListItem[] | null>(null);

  useEffect(() => {
    if (!open) return;
    getWorkspaces()
      .then(setList)
      .catch((err) => {
        console.error('[WorkspaceSwitcher] getWorkspaces failed', err);
        setList([]);
      });
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-11 left-3 z-50 w-[200px] rounded-[10px] border border-gray-700 bg-background py-1.5 shadow-md">
        <p className="px-3 pt-1 pb-1.5 text-[11px] text-gray-500">워크스페이스</p>
        {list === null ? (
          <p className="px-3 py-2 text-[12px] text-muted">불러오는 중…</p>
        ) : (
          list.map((ws) => (
            <MenuItem
              key={ws.workspaceId}
              onClick={() => {
                onClose();
                if (ws.workspaceId !== currentId) onSwitch(ws);
              }}
            >
              <WorkspaceIcon name={ws.title} size={18} />
              <span className="min-w-0 flex-1 truncate">{ws.title}</span>
              {ws.workspaceId === currentId && (
                <span className="text-[12px]">✓</span>
              )}
            </MenuItem>
          ))
        )}
        <div className="my-1 border-t border-border" />
        <MenuItem
          onClick={() => {
            onClose();
            onNewWorkspace();
          }}
        >
          + 새 워크스페이스
        </MenuItem>
        <MenuItem disabled title="워크스페이스 설정 화면은 준비 중이에요">
          워크스페이스 설정
        </MenuItem>
      </div>
    </>
  );
}

function NewWorkspaceModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (workspaceId: string, title: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async () => {
    const name = title.trim();
    if (!name || submitting) return;
    setSubmitting(true);
    try {
      const { workspaceId } = await createWorkspace({ title: name, role: 'OWNER' });
      setTitle('');
      onCreated(workspaceId, name);
    } catch (err) {
      console.error('[NewWorkspaceModal] createWorkspace failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="flex w-[360px] max-w-[90vw] flex-col gap-[14px] rounded-[16px] border border-gray-700 bg-background p-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-[16px] font-bold text-foreground">새 워크스페이스</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <p className="text-[12.5px] text-muted">
          과목 묶음이나 팀 단위로 워크스페이스를 나눠 쓸 수 있어요.
        </p>
        <div>
          <p className="mb-1.5 text-[12px] font-semibold text-foreground">이름</p>
          <div className="flex items-center gap-2">
            <WorkspaceIcon name={title || '새'} size={32} />
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              placeholder="새 워크스페이스"
              className="h-[36px] min-w-0 flex-1 rounded-[8px] border border-gray-700 bg-background px-3 text-[13px] text-foreground outline-none placeholder:text-gray-500"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-gray-500">
            아이콘은 이름 첫 글자로 자동 생성돼요.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-[38px] flex-1 rounded-[8px] border border-border bg-background text-[13px] font-semibold text-muted transition-colors hover:bg-surface"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim() || submitting}
            className="h-[38px] flex-1 rounded-[8px] bg-foreground text-[13px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            만들기
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 프로필 (X2·X3) ──────────────────────────────────────────────────────────

function ProfileRow({ collapsed }: { collapsed?: boolean }) {
  const router = useRouter();
  const { userMe } = useWorkspaceLayout();
  const [menuOpen, setMenuOpen] = useState(false);
  const name = userMe?.username ?? '';
  const email = userMe?.email ?? '';

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    router.replace('/login');
  };

  return (
    <div className="relative shrink-0 border-t border-border p-2.5">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
        className="flex w-full items-center gap-2.5 rounded-[8px] px-1.5 py-1.5 transition-colors hover:bg-surface"
      >
        <Avatar name={name} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[13px] font-semibold text-foreground">
                {name}
              </span>
              <span className="block truncate text-[11px] text-muted">
                {email}
              </span>
            </span>
            <span className="text-[11px] text-muted">⌄</span>
          </>
        )}
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute bottom-[56px] left-2.5 z-50 w-[180px] rounded-[10px] border border-gray-700 bg-background py-1.5 shadow-md">
            <MenuItem disabled title="계정 설정 화면은 준비 중이에요">
              계정 설정
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}
            >
              로그아웃
            </MenuItem>
          </div>
        </>
      )}
    </div>
  );
}

// ─── 프로젝트 트리 (X1) ──────────────────────────────────────────────────────

function ProjectTreeSection({
  query,
  onAddProject,
  onFocusNode,
}: {
  query: string;
  onAddProject: () => void;
  onFocusNode: (id: string) => void;
}) {
  const tree = useProjectTree(query);
  // 기본 전부 펼침 — 접은 프로젝트만 기억한다 (노드가 비동기 로드라 "펼침 집합" 초기화 불가)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
      <div className="flex items-center justify-between px-1 pt-3 pb-1.5">
        <span className="text-[11px] font-medium text-gray-500">프로젝트</span>
        <button
          type="button"
          onClick={onAddProject}
          aria-label="새 프로젝트 노드"
          className="px-1 text-[15px] leading-none text-muted hover:text-foreground"
        >
          +
        </button>
      </div>

      {tree.length === 0 && (
        <p className="px-1 py-2 text-[12px] text-gray-500">
          {query.trim() ? '검색 결과가 없어요' : '아직 프로젝트가 없어요'}
        </p>
      )}

      {tree.map((project) => {
        const collapsed = collapsedIds.has(project.id);
        return (
          <div key={project.id} className="mb-0.5">
            <div className="group flex items-center rounded-[6px] transition-colors hover:bg-surface">
              <button
                type="button"
                onClick={() => toggle(project.id)}
                aria-label={collapsed ? '펼치기' : '접기'}
                className="w-5 shrink-0 py-1.5 text-center text-[9px] text-gray-500"
              >
                {collapsed ? '▸' : '▾'}
              </button>
              <button
                type="button"
                onClick={() => onFocusNode(project.id)}
                className="min-w-0 flex-1 truncate py-1.5 pr-2 text-left text-[13px] font-medium text-foreground"
              >
                {project.title}
              </button>
            </div>
            {!collapsed &&
              project.titles.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onFocusNode(t.id)}
                  className="flex w-full items-center rounded-[6px] py-1.5 pr-2 pl-8 text-left transition-colors hover:bg-surface"
                >
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">
                    {t.title}
                  </span>
                  {/* 타이틀 옆 빨간 점(회의 녹음 보유)은 회의 기능 데이터 계약 확정 후 */}
                </button>
              ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── 접힘 레일 (X4) ──────────────────────────────────────────────────────────

function CollapsedRail({
  workspaceName,
  onExpand,
  onExpandToSearch,
}: {
  workspaceName: string;
  onExpand: () => void;
  onExpandToSearch: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex h-full flex-col items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onExpand}
        title="사이드바 펼치기 ⌘\"
        className="mt-3"
      >
        <WorkspaceIcon name={workspaceName} />
      </button>
      <button
        type="button"
        onClick={onExpandToSearch}
        aria-label="노드 검색"
        title="노드 검색 ⌘K"
        className="mt-4 flex h-8 w-8 items-center justify-center rounded-[8px] text-muted transition-colors hover:bg-surface hover:text-foreground"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>

      <div className="flex-1" />

      {/* hover 시 펼치기 핸들 (X4) */}
      {hovered && (
        <button
          type="button"
          onClick={onExpand}
          className="absolute top-1/2 -right-3 z-50 flex h-10 w-6 -translate-y-1/2 items-center justify-center rounded-[6px] border border-gray-700 bg-background text-[11px] text-muted shadow-md hover:text-foreground"
          title="사이드바 펼치기 ⌘\"
        >
          ›
        </button>
      )}

      <ProfileRow collapsed />
    </div>
  );
}

// ─── Sidebar 본체 ────────────────────────────────────────────────────────────

export default function Sidebar({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  const {
    workspaceId,
    setWorkspaceId,
    setWorkspaceRole,
    setNodes,
    setEdges,
    setSynced,
    setFocusedNodeId,
    nodes,
  } = useWorkspaceLayout();

  const [query, setQuery] = useState('');
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [newWsOpen, setNewWsOpen] = useState(false);
  const [workspaceTitle, setWorkspaceTitle] = useState('워크스페이스');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pendingSearchFocusRef = useRef(false);

  // 현재 워크스페이스 이름 — 목록 조회 결과에서 1회 확보
  useEffect(() => {
    if (!workspaceId) return;
    getWorkspaces()
      .then((list) => {
        const ws = list.find((w) => w.workspaceId === workspaceId);
        if (ws) setWorkspaceTitle(ws.title);
      })
      .catch(() => {});
  }, [workspaceId]);

  // ⌘K 검색 포커스 · ⌘\ 토글 — 전역 단축키 훅(#243) 도입 시 그쪽으로 이관.
  // e.key가 아니라 e.code(물리 키 위치) 비교인 이유: 한글 자판에서는 K 자리의
  // e.key가 'ㅏ'로 들어와 'k' 비교가 실패한다. IME 조합 중에는 'Process'가 되기도 함.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.code === 'KeyK') {
        e.preventDefault();
        if (!isOpen) {
          pendingSearchFocusRef.current = true;
          onToggle();
        } else {
          searchInputRef.current?.focus();
        }
      } else if (e.code === 'Backslash') {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onToggle]);

  // 접힘 → ⌘K/검색 아이콘으로 펼친 직후 검색 인풋 포커스
  useEffect(() => {
    if (isOpen && pendingSearchFocusRef.current) {
      pendingSearchFocusRef.current = false;
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  const switchWorkspace = useCallback(
    (ws: Pick<WorkspaceListItem, 'workspaceId' | 'title' | 'role'>) => {
      // 그래프 상태를 비우고 재동기화 — layout의 sync effect가 새 workspaceId로 다시 fetch
      setNodes([]);
      setEdges([]);
      setFocusedNodeId(null);
      setWorkspaceId(ws.workspaceId);
      setWorkspaceRole(ws.role);
      setWorkspaceTitle(ws.title);
      setSynced(false);
    },
    [setNodes, setEdges, setFocusedNodeId, setWorkspaceId, setWorkspaceRole, setSynced],
  );

  const addProjectNode = useCallback(async () => {
    if (!workspaceId) return;
    // 기존 프로젝트들 아래쪽 빈 공간에 배치 후 카메라 이동(focus)
    const projectYs = nodes
      .filter((n) => (n.data as NodeData)?.isMain)
      .map((n) => n.position.y);
    const position = {
      x: 0,
      y: projectYs.length ? Math.max(...projectYs) + 240 : 0,
    };
    try {
      const colorPair = getRandomColorPair();
      const { nodeId } = await createProjectNode(workspaceId, '', position, {
        color: colorPair.bg,
        textColor: colorPair.text,
      });
      setNodes((prev) => [
        ...prev,
        {
          id: nodeId,
          type: 'textUpdater',
          position,
          data: {
            title: '',
            isMain: true,
            color: colorPair.bg,
            textColor: colorPair.text,
          },
        },
      ]);
      setFocusedNodeId(nodeId);
    } catch (err) {
      console.error('[Sidebar] createProjectNode failed', err);
    }
  }, [workspaceId, nodes, setNodes, setFocusedNodeId]);

  const focusNode = useCallback(
    (id: string) => setFocusedNodeId(id),
    [setFocusedNodeId],
  );

  return (
    <aside
      className="fixed top-0 left-0 z-50 flex h-full flex-col border-r border-border bg-background transition-[width] duration-200 ease-out"
      style={{ width: isOpen ? SIDEBAR_WIDTH : RAIL_WIDTH }}
    >
      {isOpen ? (
        <>
          {/* 헤더 (X1·X6) */}
          <div className="relative flex shrink-0 items-center gap-2 px-3 pt-3 pb-2">
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
              aria-expanded={switcherOpen}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-[8px] px-1 py-1 text-left transition-colors hover:bg-surface"
            >
              <WorkspaceIcon name={workspaceTitle} />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-foreground">
                {workspaceTitle}
              </span>
              <span className="text-[10px] text-muted">⌄</span>
            </button>
            <button
              type="button"
              onClick={onToggle}
              aria-label="사이드바 접기"
              title="사이드바 접기 ⌘\"
              className="shrink-0 px-1 text-[14px] text-gray-500 hover:text-foreground"
            >
              «
            </button>
            <WorkspaceSwitcher
              open={switcherOpen}
              currentId={workspaceId}
              onClose={() => setSwitcherOpen(false)}
              onSwitch={switchWorkspace}
              onNewWorkspace={() => setNewWsOpen(true)}
            />
          </div>

          {/* 회의 진행 중 배너 (X5) — 회의 기능이 상태를 주기 전까지 숨김(null) */}
          <div className="shrink-0 px-3 empty:hidden">
            <MeetingBanner meeting={null} onClick={focusNode} />
          </div>

          {/* 노드 검색 (⌘K) */}
          <div className="shrink-0 px-3 pt-1">
            <div className="flex h-[32px] items-center gap-2 rounded-[8px] border border-border bg-surface px-2.5 focus-within:border-gray-700">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-gray-500" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="노드 검색"
                className="min-w-0 flex-1 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-gray-500"
              />
              <span className="shrink-0 rounded border border-border bg-background px-1 text-[10px] text-gray-500">
                ⌘K
              </span>
            </div>
          </div>

          <ProjectTreeSection
            query={query}
            onAddProject={addProjectNode}
            onFocusNode={focusNode}
          />

          <ProfileRow />
        </>
      ) : (
        <CollapsedRail
          workspaceName={workspaceTitle}
          onExpand={onToggle}
          onExpandToSearch={() => {
            pendingSearchFocusRef.current = true;
            onToggle();
          }}
        />
      )}

      <NewWorkspaceModal
        open={newWsOpen}
        onClose={() => setNewWsOpen(false)}
        onCreated={(id, title) => {
          setNewWsOpen(false);
          switchWorkspace({ workspaceId: id, title, role: 'OWNER' });
        }}
      />
    </aside>
  );
}
