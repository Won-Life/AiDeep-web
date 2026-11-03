'use client';

import { useElapsedLabel } from './meetingTime';
import type { SidebarMeeting } from './sidebarMeeting';

/** 사이드바의 회의 진행 중 카드 — 눌러서 회의 타이틀 노드로 이동 (Figma X5) */
export default function MeetingBanner({
  meeting,
  onClick,
}: {
  meeting: SidebarMeeting | null;
  onClick: (titleNodeId: string) => void;
}) {
  // 녹음이 시작된 뒤에만 경과 시간이 흐른다. 그 전에는 "입장 중"으로 보인다.
  const elapsed = useElapsedLabel(meeting?.since ?? '', Boolean(meeting?.since));
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
          {meeting.titleName} · {meeting.since ? elapsed : '입장 중'}
        </span>
      </span>
      <span className="text-[12px] text-muted">›</span>
    </button>
  );
}
