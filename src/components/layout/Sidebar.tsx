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
import {
  getWorkspaces,
  createWorkspace,
  renameWorkspace,
  deleteWorkspace,
} from '@/api/workspace';
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
export const RAIL_WIDTH = 72; // Figma X4 레일 폭

// ─── 공통 소품 ────────────────────────────────────────────────────────────────

/*
 * CONTEXT
 * - Problem      : Figma 08 X1/X4 시안은 상단에 On:Node 브랜드 로고(파란 음파 마크 +
 *                  워드마크)를 둔다. 앱에는 이 애셋이 없어 사이드바에 로고 행이 비어 있었다.
 * - Why          : 브랜드 마크를 별도 파일(png/svg) 대신 인라인 SVG로 둔다 — 색을 디자인
 *                  토큰(--ds-main-blue)에 묶어 테마/리브랜딩에 자동 추종하고, 레일(24~28px)과
 *                  헤더(24px) 양쪽에서 size prop만으로 재사용한다.
 * - Alternatives : public/*.svg 파일 임포트 — 색이 하드코딩돼 토큰과 어긋나고, 레일/헤더
 *                  크기 변형마다 파일이 늘어 기각.
 * - Trade-offs   : 로고 형상이 코드에 박혀 디자이너가 직접 못 바꾼다. MVP 단계라 수용.
 * - Edge Case    : 음파 막대는 좌우 대칭(가운데가 가장 큼)으로 viewBox 비율 고정 — size가
 *                  바뀌어도 막대 비율이 일정하게 유지된다.
 */

/** On:Node 브랜드 마크 — 파란 라운드 사각형(레일에서는 원형) + 흰 이퀄라이저(음파) 막대 */
function OnNodeMark({ size = 28, round = false }: { size?: number; round?: boolean }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: round ? '50%' : Math.round(size * 0.3),
        backgroundColor: 'rgb(var(--ds-main-blue))',
      }}
      aria-hidden="true"
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 20 20" fill="#fff">
        <rect x="1" y="6.5" width="2.6" height="7" rx="1.3" />
        <rect x="5" y="4.5" width="2.6" height="11" rx="1.3" />
        <rect x="8.7" y="2.5" width="2.6" height="15" rx="1.3" />
        <rect x="12.4" y="4.5" width="2.6" height="11" rx="1.3" />
        <rect x="16.4" y="6.5" width="2.6" height="7" rx="1.3" />
      </svg>
    </span>
  );
}

/** On:Node 로고 락업 (마크 + 워드마크) — X1 펼침 헤더 */
function OnNodeLogo() {
  return (
    <span className="flex items-center gap-2">
      <OnNodeMark size={24} />
      <span className="text-[16px] font-extrabold tracking-tight text-main-blue">
        On:Node
      </span>
    </span>
  );
}

/** 워크스페이스 아이콘 — 이름 첫 글자를 색 사각형에 표시.
 *  기본(현재 워크스페이스)은 Main Blue, muted(목록의 다른 워크스페이스)는 연한 파랑 (Figma X1·X6). */
function WorkspaceIcon({
  name,
  size = 24,
  muted = false,
}: {
  name: string;
  size?: number;
  muted?: boolean;
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[6px] font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        backgroundColor: muted
          ? 'rgb(var(--ds-main-blue-pale))'
          : 'rgb(var(--ds-main-blue))',
        color: muted ? 'rgb(var(--ds-main-blue-deep))' : '#ffffff',
      }}
    >
      {name.trim().charAt(0) || 'W'}
    </span>
  );
}

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--onnode-primary-200)] font-semibold text-[var(--onnode-primary-700)]"
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
  className = 'text-foreground',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface disabled:opacity-50 disabled:hover:bg-transparent ${className}`}
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
  onSettings,
}: {
  open: boolean;
  currentId: string | null;
  onClose: () => void;
  onSwitch: (ws: WorkspaceListItem) => void;
  onNewWorkspace: () => void;
  onSettings: () => void;
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
      <div className="absolute top-full left-0 z-50 mt-1 w-[232px] overflow-hidden rounded-[16px] border border-main-blue-light bg-background pb-1 shadow-md">
        <p className="border-b border-main-blue-pale px-4 pt-3 pb-2 text-[12px] text-main-blue-light">
          워크스페이스
        </p>
        {list === null ? (
          <p className="px-4 py-2.5 text-[12px] text-muted">불러오는 중…</p>
        ) : (
          list.map((ws) => {
            const isCurrent = ws.workspaceId === currentId;
            return (
              <button
                key={ws.workspaceId}
                type="button"
                onClick={() => {
                  onClose();
                  if (!isCurrent) onSwitch(ws);
                }}
                className={`flex w-full items-center gap-3 border-b border-main-blue-pale px-4 py-2.5 text-left text-[13px] transition-colors ${
                  isCurrent
                    ? 'bg-main-blue-pale font-semibold text-foreground shadow-[inset_3px_0_0_0_rgb(var(--ds-main-blue))]'
                    : 'text-main-blue-light hover:bg-surface'
                }`}
              >
                <WorkspaceIcon name={ws.title} size={28} muted={!isCurrent} />
                <span className="min-w-0 flex-1 truncate">{ws.title}</span>
              </button>
            );
          })
        )}
        <div className="pt-1">
          <MenuItem
            className="font-medium text-main-blue-deep"
            onClick={() => {
              onClose();
              onNewWorkspace();
            }}
          >
            + 새 워크스페이스
          </MenuItem>
          <MenuItem
            className="font-medium text-main-blue-deep"
            onClick={() => {
              onClose();
              onSettings();
            }}
          >
            워크스페이스 설정
          </MenuItem>
        </div>
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

// ─── 워크스페이스 삭제 확인 모달 (X9) ──────────────────────────────────────────
// 되돌릴 수 없는 작업이라 "이름 입력 일치" 확인을 요구한다(실수 삭제 방지).
// 조건부 마운트(호출부에서 confirmOpen && ...)로 열 때마다 fresh 상태 → 리셋 effect 불필요.
function WorkspaceDeleteConfirmModal({
  workspaceTitle,
  onClose,
  onConfirm,
}: {
  workspaceTitle: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matched = confirmText.trim() === workspaceTitle.trim();
  const submit = async () => {
    if (!matched || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setError(
        status === 403
          ? '소유자만 삭제할 수 있어요.'
          : status === 400
            ? '워크스페이스는 최소 한 개가 남아 있어야 해요.'
            : '삭제에 실패했어요. 잠시 후 다시 시도해주세요.',
      );
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="flex w-[360px] max-w-[90vw] flex-col gap-[14px] rounded-[16px] border border-gray-700 bg-background p-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-[16px] font-bold text-foreground">
            ‘{workspaceTitle}’를 삭제할까요?
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <p className="text-[12.5px] text-muted">
          이 워크스페이스의 프로젝트와 노드가 모두 삭제되고, 되돌릴 수 없어요.
        </p>
        <div>
          <p className="mb-1.5 text-[12px] font-semibold text-foreground">
            확인을 위해 워크스페이스 이름을 입력해주세요
          </p>
          <input
            autoFocus
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="워크스페이스 이름 입력"
            className="h-[36px] w-full rounded-[8px] border border-gray-700 bg-background px-3 text-[13px] text-foreground outline-none placeholder:text-gray-500"
          />
          <p className="mt-1.5 text-[11px] text-gray-500">
            이름이 일치해야 삭제 버튼이 켜져요.
          </p>
        </div>
        {error && <p className="text-[12px] text-red-500">{error}</p>}
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
            disabled={!matched || deleting}
            className="h-[38px] flex-1 rounded-[8px] bg-red-500 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 워크스페이스 설정 모달 (X8) — 이름 변경 + 삭제 진입 ────────────────────────
function WorkspaceSettingsModal({
  open,
  workspaceId,
  onClose,
  onRenamed,
  onDeleted,
}: {
  open: boolean;
  workspaceId: string | null;
  onClose: () => void;
  onRenamed: (title: string) => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState('');
  const [loadedTitle, setLoadedTitle] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 열릴 때 현재 이름·권한을 직접 조회 — 사이드바 상태(초기 로드/전환 시 비어있을 수 있음)에
  // 의존하지 않아 항상 정확. OWNER만 삭제 영역을 노출한다(서버도 OWNER만 허용).
  useEffect(() => {
    if (!open || !workspaceId) return;
    getWorkspaces()
      .then((list) => {
        const ws = list.find((w) => w.workspaceId === workspaceId);
        if (ws) {
          setTitle(ws.title);
          setLoadedTitle(ws.title);
          setIsOwner(ws.role === 'OWNER');
        }
      })
      .catch(() => {});
  }, [open, workspaceId]);

  if (!open || !workspaceId) return null;

  const save = async () => {
    const name = title.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      await renameWorkspace(workspaceId, name);
      onRenamed(name);
    } catch (err) {
      console.error('[WorkspaceSettingsModal] rename failed', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
        onClick={onClose}
      >
        <div
          className="flex w-[360px] max-w-[90vw] flex-col gap-[14px] rounded-[16px] border border-gray-700 bg-background p-[20px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between">
            <h2 className="text-[16px] font-bold text-foreground">
              워크스페이스 설정
            </h2>
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
            이름을 바꾸거나, 워크스페이스를 삭제할 수 있어요.
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
                  if (e.key === 'Enter') save();
                }}
                className="h-[36px] min-w-0 flex-1 rounded-[8px] border border-gray-700 bg-background px-3 text-[13px] text-foreground outline-none placeholder:text-gray-500"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-gray-500">
              아이콘은 이름 첫 글자로 자동 생성돼요.
            </p>
          </div>
          {isOwner && (
            <div className="rounded-[10px] border border-red-300 p-3">
              <p className="text-[12.5px] font-semibold text-red-500">
                되돌릴 수 없는 작업
              </p>
              <p className="mt-0.5 text-[11.5px] text-muted">
                삭제하면 이 워크스페이스의 프로젝트와 노드가 모두 사라져요.
              </p>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="mt-2 rounded-[8px] border border-red-300 px-3 py-1.5 text-[12px] font-semibold text-red-500 transition-colors hover:bg-red-50"
              >
                워크스페이스 삭제
              </button>
            </div>
          )}
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
              onClick={save}
              disabled={!title.trim() || saving}
              className="h-[38px] flex-1 rounded-[8px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'rgb(var(--ds-main-blue))' }}
            >
              저장
            </button>
          </div>
        </div>
      </div>
      {confirmOpen && (
        <WorkspaceDeleteConfirmModal
          workspaceTitle={loadedTitle}
          onClose={() => setConfirmOpen(false)}
          onConfirm={async () => {
            await deleteWorkspace(workspaceId);
            setConfirmOpen(false);
            onDeleted();
          }}
        />
      )}
    </>
  );
}

// ─── 프로필 (X2·X3) ──────────────────────────────────────────────────────────

// X2 프로필 메뉴 아이콘 (설정 기어 / 로그아웃)
function GearIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-muted"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-muted"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

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
          <div className="absolute bottom-[56px] left-2.5 z-50 w-[200px] overflow-hidden rounded-[10px] border border-gray-700 bg-background shadow-md">
            {/* 프로필 헤더 (X2) — 아바타 + 이름 + 이메일 */}
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              <Avatar name={name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-foreground">
                  {name || '사용자'}
                </span>
                <span className="block truncate text-[11px] text-muted">
                  {email}
                </span>
              </span>
            </div>
            <div className="border-t border-border" />
            <MenuItem disabled title="계정 설정 화면은 준비 중이에요">
              <GearIcon />
              설정
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}
            >
              <LogoutIcon />
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
  const { focusedNodeId } = useWorkspaceLayout();
  // 기본 전부 펼침 — 접은 프로젝트만 기억한다 (노드가 비동기 로드라 "펼침 집합" 초기화 불가)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // 선택 행 하이라이트(Figma: Main Blue 0.25 배경 + 왼쪽 파란 액센트 바).
  // 레이아웃 이동 없이 액센트를 그리려 inset box-shadow를 쓴다.
  const SELECTED_ROW =
    'bg-main-blue-pale shadow-[inset_3px_0_0_0_rgb(var(--ds-main-blue))]';

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
        const projectSelected = project.id === focusedNodeId;
        return (
          <div key={project.id} className="mb-0.5">
            <div
              className={`group flex items-center rounded-[6px] transition-colors ${
                projectSelected ? SELECTED_ROW : 'hover:bg-surface'
              }`}
            >
              {/* 디스클로저: 평상시 • 불릿, 행 hover 시 접기/펼치기 셰브런 (Figma는 불릿) */}
              <button
                type="button"
                onClick={() => toggle(project.id)}
                aria-label={collapsed ? '펼치기' : '접기'}
                className="w-5 shrink-0 py-1.5 text-center leading-none"
              >
                <span className="text-[13px] text-main-blue-deep group-hover:hidden">
                  •
                </span>
                <span className="hidden text-[9px] text-gray-500 group-hover:inline">
                  {collapsed ? '▸' : '▾'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onFocusNode(project.id)}
                className="min-w-0 flex-1 truncate py-1.5 pr-2 text-left text-[13px] font-semibold text-main-blue-deep"
              >
                {project.title}
              </button>
            </div>
            {!collapsed &&
              project.titles.map((t) => {
                const titleSelected = t.id === focusedNodeId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onFocusNode(t.id)}
                    className={`flex w-full items-center gap-1.5 rounded-[6px] py-1.5 pr-2 pl-7 text-left transition-colors ${
                      titleSelected ? SELECTED_ROW : 'hover:bg-surface'
                    }`}
                  >
                    <span className="shrink-0 text-[10px] leading-none text-main-blue-light">
                      ·
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-main-blue-light">
                      {t.title}
                    </span>
                    {/* 타이틀 옆 빨간 점(회의 녹음 보유)은 회의 기능 데이터 계약 확정 후 */}
                  </button>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}

// ─── 접힘 레일 (X4) ──────────────────────────────────────────────────────────

/** hover 위치를 따라다니는 펼치기/접기 필 — 원형 셰브런 + 라운드 라벨 버튼 (X4) */
function HoverTogglePill({
  y,
  chevron,
  label,
  onActivate,
}: {
  y: number;
  chevron: '›' | '‹';
  label: string;
  onActivate: () => void;
}) {
  return (
    <div
      className="absolute left-full z-50 flex -translate-y-1/2 items-center"
      style={{ top: y, marginLeft: -14 }}
    >
      <button
        type="button"
        onClick={onActivate}
        title={`${label} ⌘\\`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background text-[13px] text-main-blue shadow-sm hover:bg-main-blue-pale"
        style={{ borderColor: 'rgb(var(--ds-main-blue))' }}
      >
        {chevron}
      </button>
      {/* 원형 버튼과 라벨 필 사이 간격은 padding으로 채운다 — 사이가 비면
          mouseleave가 발생해 필이 사라져 클릭할 수 없다 */}
      <span className="pl-2">
        <button
          type="button"
          onClick={onActivate}
          className="whitespace-nowrap rounded-full border bg-background px-4 py-1.5 text-[12px] font-medium text-main-blue shadow-sm hover:bg-main-blue-pale"
          style={{ borderColor: 'rgb(var(--ds-main-blue))' }}
        >
          {label}
        </button>
      </span>
    </div>
  );
}

/** hover한 화면 Y좌표를 필이 화면 밖으로 잘리지 않게 보정 — 레일·사이드바가
 *  화면 최상단(top 0) 고정이라 clientY가 곧 컨테이너 좌표다 */
function clampHoverY(clientY: number): number {
  return Math.min(Math.max(clientY, 28), window.innerHeight - 28);
}

/** 레일 네비 항목 — 아이콘 + 하단 라벨, active면 Main Blue 0.25 배경 + 좌측 액센트 탭 */
function RailItem({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`relative flex w-full flex-col items-center gap-1.5 py-2.5 transition-colors ${
        active ? 'bg-main-blue-pale' : 'hover:bg-surface'
      }`}
    >
      {active && (
        <span
          className="absolute top-1/2 left-0 h-9 w-[5px] -translate-y-1/2 rounded-r-full"
          style={{ backgroundColor: 'rgb(var(--ds-main-blue))' }}
          aria-hidden="true"
        />
      )}
      {children}
      <span
        className={`text-[10px] leading-none ${
          active
            ? 'font-semibold text-main-blue-deep'
            : 'font-medium text-main-blue-light'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function CollapsedRail({
  onExpand,
  onExpandToSearch,
}: {
  onExpand: () => void;
  onExpandToSearch: () => void;
}) {
  // hover한 Y좌표 — null이면 펼치기 필 숨김
  const [hoverY, setHoverY] = useState<number | null>(null);

  return (
    <div
      className="relative flex h-full flex-col"
      onMouseLeave={() => setHoverY(null)}
    >
      {/* mousemove 추적은 레일 본체에만 건다 — 바깥에 뜬 필 위에서는 위치가
          고정돼야 하고, 필은 이 컨테이너의 자손이라 hover가 유지된다 */}
      <div
        className="flex h-full flex-col"
        onMouseMove={(e) => setHoverY(clampHoverY(e.clientY))}
      >
        {/* 로고 (On:Node 마크) → 클릭 시 펼침 */}
        <button
          type="button"
          onClick={onExpand}
          title="사이드바 펼치기 ⌘\"
          className="flex justify-center pt-4 pb-3"
        >
          <OnNodeMark size={40} round />
        </button>
        <div className="mx-3.5 border-t border-border" />

        {/* 네비: 그래프(현재 뷰)·검색·프로젝트 */}
        <div className="flex flex-col pt-2.5">
          <RailItem label="그래프" active onClick={onExpand}>
            {/* 겹친 사각형 — 뒤 외곽선 + 앞 채움 */}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="8.5" y="3.5" width="12" height="12" rx="3" stroke="rgb(var(--ds-main-blue-deep))" strokeWidth="2" />
              <rect x="3" y="8" width="13" height="13" rx="3" fill="rgb(var(--ds-main-blue-deep))" />
            </svg>
          </RailItem>
          <RailItem label="검색" onClick={onExpandToSearch}>
            {/* 돋보기 + 내부 플러스(줌 인) */}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--ds-main-blue-light))" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m20.5 20.5-5.3-5.3" />
              <path d="M10.5 8.2v4.6M8.2 10.5h4.6" />
            </svg>
          </RailItem>
          <RailItem label="프로젝트" onClick={onExpand}>
            {/* 막대 차트 + 우상단 플러스 */}
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
              <g fill="rgb(var(--ds-main-blue))">
                <rect x="3" y="13" width="4" height="8" rx="1.5" />
                <rect x="9.5" y="8" width="4" height="13" rx="1.5" />
                <rect x="16" y="13" width="4" height="8" rx="1.5" />
              </g>
              <path d="M19.2 2.2v5.6M16.4 5h5.6" stroke="rgb(var(--ds-main-blue))" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            </svg>
          </RailItem>
        </div>

        <div className="flex-1" />

        <ProfileRow collapsed />
      </div>

      {/* hover 위치 추종 펼치기 필 (X4) */}
      {hoverY !== null && (
        <HoverTogglePill
          y={hoverY}
          chevron="›"
          label="사이드바 펼치기"
          onActivate={onExpand}
        />
      )}
    </div>
  );
}

/** 펼친 사이드바 우측 경계의 hover 감지 띠 — hover 위치에 접기 필을 띄운다.
 *  상시 토글 버튼(«)을 대체한다. 띠는 경계에 반씩 걸쳐 트리 스크롤 영역 가림을 최소화. */
function CollapseEdgeStrip({ onCollapse }: { onCollapse: () => void }) {
  const [hoverY, setHoverY] = useState<number | null>(null);

  return (
    <div
      className="absolute inset-y-0 -right-[5px] z-50 w-[10px]"
      onMouseLeave={() => setHoverY(null)}
    >
      <div
        className="h-full w-full"
        onMouseMove={(e) => setHoverY(clampHoverY(e.clientY))}
      />
      {hoverY !== null && (
        <HoverTogglePill
          y={hoverY}
          chevron="‹"
          label="사이드바 접기"
          onActivate={onCollapse}
        />
      )}
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
  const [settingsOpen, setSettingsOpen] = useState(false);
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
          {/* 헤더 (X1·X6): On:Node 로고 행 + 워크스페이스 스위처 행 */}
          <div className="shrink-0 px-3 pt-3">
            {/* 접기는 우측 경계 hover 필(CollapseEdgeStrip)·⌘\ 로 — 상시 버튼 없음 */}
            <div className="pb-2">
              <OnNodeLogo />
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSwitcherOpen((v) => !v)}
                aria-expanded={switcherOpen}
                className="flex w-full min-w-0 items-center gap-2 rounded-[8px] px-1 py-1 text-left transition-colors hover:bg-surface"
              >
                <WorkspaceIcon name={workspaceTitle} />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-foreground">
                  {workspaceTitle}
                </span>
                <span className="text-[10px] text-muted">⌄</span>
              </button>
              <WorkspaceSwitcher
                open={switcherOpen}
                currentId={workspaceId}
                onClose={() => setSwitcherOpen(false)}
                onSwitch={switchWorkspace}
                onNewWorkspace={() => setNewWsOpen(true)}
                onSettings={() => setSettingsOpen(true)}
              />
            </div>
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

          <CollapseEdgeStrip onCollapse={onToggle} />
        </>
      ) : (
        <CollapsedRail
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

      <WorkspaceSettingsModal
        open={settingsOpen}
        workspaceId={workspaceId}
        onClose={() => setSettingsOpen(false)}
        onRenamed={(title) => {
          setWorkspaceTitle(title);
          setSettingsOpen(false);
        }}
        onDeleted={async () => {
          setSettingsOpen(false);
          // 삭제 후 남은 워크스페이스로 전환 (서버가 최소 1개 유지를 보장)
          try {
            const list = await getWorkspaces();
            const next =
              list.find((w) => w.workspaceId !== workspaceId) ?? list[0];
            if (next) switchWorkspace(next);
          } catch (err) {
            console.error('[Sidebar onDeleted] switch failed', err);
          }
        }}
      />
    </aside>
  );
}
