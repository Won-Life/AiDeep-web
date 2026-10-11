"use client";

import type { MeetingTarget } from "./meetingTargets";

export default function MeetingBotTargetField({ target }: { target: MeetingTarget | null }) {
  if (!target) {
    return (
      <p role="note" className="mt-5 rounded-xl bg-[var(--meeting-soft-surface)] px-4 py-3 text-center text-[12px] leading-5 text-[var(--meeting-muted)]">
        봇을 추가할 타이틀 노드를 먼저 만들어주세요. 봇은 타이틀 노드 아래에 회의 노드를 추가해요.
      </p>
    );
  }

  return (
    <p className="mt-5 flex h-9 w-full items-center justify-center rounded-full bg-[var(--meeting-primary)] px-4 text-[12px] font-semibold text-white">
      <span className="truncate">&lsquo;{target.title}&rsquo; 타이틀 아래 추가돼요</span>
    </p>
  );
}
