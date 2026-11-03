'use client';

import { useState, type MouseEvent } from 'react';
import { figmaNodeColorOf } from '@/features/graph/constants/colors';
import { useProjectTree } from '@/features/workspace/useProjectTree';
import type { SidebarMeeting } from '@/features/meeting-bot/sidebarMeeting';
import LetterChip from '@/components/ui/LetterChip';
import { OnNodeMark, SidebarIcon } from './SidebarParts';
import SidebarHelp from './SidebarHelp';
import ProfileRow from './SidebarProfile';

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

/** hover한 화면 Y좌표를 필이 화면 밖으로 잘리지 않게 보정해 추적 — 레일·사이드바가
 *  화면 최상단(top 0) 고정이라 clientY가 곧 컨테이너 좌표다 */
function useHoverY() {
  const [hoverY, setHoverY] = useState<number | null>(null);
  return {
    hoverY,
    onMouseMove: (event: MouseEvent) => setHoverY(Math.min(Math.max(event.clientY, 28), window.innerHeight - 28)),
    onMouseLeave: () => setHoverY(null),
  };
}

/*
 * CONTEXT
 * - Problem      : 접힌 사이드바의 여백·선택 탭·아이콘·작은 프로필이 참고 이미지와 다르다.
 * - Why          : 72px 레일을 기준으로 로고 40px, 60px 탐색 행, 프로필 48px와 비례 간격을 맞춘다.
 * - Alternatives : 이미지 자체를 배경으로 쓰면 검색·프로필·펼치기 동작을 제공할 수 없다.
 * - Trade-offs   : 레일 브랜드 색상과 아이콘 윤곽을 참고 이미지 기준으로 고정한다.
 * - Edge Case    : 키보드 포커스와 기존 메뉴 동작은 유지하며 화면이 낮아도 탐색 행은 축소하지 않는다.
 */
/** 레일 네비 항목 — 아이콘 + 하단 라벨, active면 Main Blue 0.25 배경 + 좌측 액센트 탭 */
export function CollapsedRail({ onExpand, onExpandToSearch, onOpenArchive, onOpenChat, isChatOpen, onFocusNode, onAddProject, workspaceTitle, meeting }: {
  onExpand: () => void;
  onExpandToSearch: () => void;
  onOpenArchive?: () => void;
  onOpenChat?: () => void;
  isChatOpen: boolean;
  onFocusNode: (id: string) => void;
  onAddProject: () => void;
  workspaceTitle: string;
  meeting: SidebarMeeting | null;
}) {
  const { hoverY, onMouseMove, onMouseLeave } = useHoverY();
  const tree = useProjectTree('');
  return (
    <div className="relative flex h-full flex-col" onMouseLeave={onMouseLeave} onMouseMove={onMouseMove}>
      <button type="button" onClick={onExpand} aria-label="사이드바 펼치기" className="mx-auto mt-5"><OnNodeMark size={40} round /></button>
      <button type="button" onClick={onExpand} title={workspaceTitle} aria-label="워크스페이스 열기" className="mx-auto mt-4"><LetterChip text={workspaceTitle} fallback="W" size={38} background="rgb(var(--ds-main-blue-deep))" fontSize={14} /></button>
      <button type="button" onClick={onExpandToSearch} aria-label="검색" title="검색" className="mx-auto mt-4 flex size-10 items-center justify-center"><SidebarIcon name="search" width={27} /></button>
      <button type="button" onClick={onOpenChat} aria-label="AI 질문" aria-pressed={isChatOpen} title="AI 질문" className={`relative flex h-12 w-full items-center justify-center ${isChatOpen ? 'bg-main-blue-pale' : ''}`}>
        {isChatOpen && <span aria-hidden className="absolute top-1/2 left-0 h-[30px] w-[5px] -translate-y-1/2 rounded-r-[3px] bg-[#748dfd]" />}
        <SidebarIcon name="ai-chat" width={27} height={20} />
      </button>
      {meeting && <button type="button" onClick={() => onFocusNode(meeting.titleNodeId)} title={`회의 진행 중 · ${meeting.titleName}`} aria-label="회의 진행 중" className="mx-auto flex size-10 items-center justify-center text-red-500">●</button>}
      <div className="mx-3 my-2 border-t border-main-blue-pale" />
      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto pt-2">
        {tree.map((project) => {
          const { selected } = project;
          const color = figmaNodeColorOf(project.color)?.deep ?? project.color ?? 'rgb(var(--ds-main-blue))';
          return <button key={project.id} type="button" onClick={() => onFocusNode(project.id)} title={`${project.title} · 타이틀 ${project.count}개`} aria-label={project.title} aria-current={selected ? 'true' : undefined} className="shrink-0 rounded-[10px]" style={{ outline: selected ? '2px solid rgb(var(--ds-main-blue-deep))' : undefined }}><LetterChip text={project.title} size={32} fontSize={11.2} background={color} /></button>;
        })}
        <button type="button" onClick={onAddProject} aria-label="프로젝트 노드 추가" title="프로젝트 노드 추가" className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-main-blue text-main-blue">+</button>
      </div>
      <SidebarHelp collapsed />
      <ProfileRow collapsed onOpenArchive={onOpenArchive} />
      {hoverY !== null && <HoverTogglePill y={hoverY} chevron="›" label="사이드바 펼치기" onActivate={onExpand} />}
    </div>
  );
}

/** 펼친 사이드바 우측 경계의 hover 감지 띠 — hover 위치에 접기 필을 띄운다.
 *  상시 토글 버튼(«)을 대체한다. 띠는 경계에 반씩 걸쳐 트리 스크롤 영역 가림을 최소화. */
export function CollapseEdgeStrip({ onCollapse }: { onCollapse: () => void }) {
  const { hoverY, onMouseMove, onMouseLeave } = useHoverY();

  return (
    <div
      className="absolute inset-y-0 -right-[5px] z-50 w-[10px]"
      onMouseLeave={onMouseLeave}
    >
      <div className="h-full w-full" onMouseMove={onMouseMove} />
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
