"use client";

import { useEffect, useState } from "react";
import type { MeetingInfo } from "./meetingState";
import { isMeetingActive, toBotStatus } from "./meetingState";
import { useElapsedLabel } from "./meetingTime";

const AUTO_HIDE_MS = 10_000;

function Wave({ color }: { color: string }) {
  return (
    <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: color }}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
        <path d="M3 6v4M5.5 4v8M8 2v12M10.5 5v6M13 6.5v3" />
      </svg>
    </span>
  );
}

function copyFor(info: MeetingInfo): { title: string; detail?: string; color: string } {
  switch (toBotStatus(info.status)) {
    case "recording": return { title: "녹음 중", color: "#E63840" };
    case "waiting": return { title: "대기실에서 승인을 기다리는 중", color: "#748DFD" };
    case "completed": return { title: "회의 녹음이 종료됐어요", color: "#748DFD" };
    case "error": return { title: "회의 연결에 실패했어요", detail: "다시 시도해 주세요", color: "#E63840" };
    default: return { title: "봇이 회의에 입장하는 중", color: "#748DFD" };
  }
}

/*
 * CONTEXT
 * - Problem      : 회의 중에는 어떤 회의가 어떤 상태인지 그래프 화면 어디서나 보여야 한다(Figma M3 · M5).
 * - Why          : 그래프 상단 가운데 알약으로 상태와 경과 시간을 보여 준다. 종료·실패는 잠시 뒤 스스로 사라진다.
 * - Alternatives : 노드 칩만 두기 → 그 노드가 화면 밖이면 회의 중인지 알 수 없다.
 * - Trade-offs   : 플랫폼 이름과 무료 플랜 남은 시간은 서버가 주지 않아 표시하지 않는다.
 * - Edge Case    : 같은 회의의 상태가 바뀌면 숨김 타이머를 다시 시작하고, 진행 중에는 숨기지 않는다.
 */
export default function MeetingTopBadge({ meeting }: { meeting: MeetingInfo | null }) {
  const active = meeting ? isMeetingActive(meeting.status) : false;
  const recording = meeting ? toBotStatus(meeting.status) === "recording" : false;
  const elapsed = useElapsedLabel(meeting?.occurredAt ?? "", recording);
  const [hiddenKey, setHiddenKey] = useState<string | null>(null);
  const key = meeting ? `${meeting.meetingId}:${meeting.status}` : null;

  useEffect(() => {
    if (!key || active) return;
    const timer = setTimeout(() => setHiddenKey(key), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [key, active]);

  if (!meeting || (!active && hiddenKey === key)) return null;
  const copy = copyFor(meeting);

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-3 rounded-full border border-[#748DFD] bg-white px-4 py-2 text-[#111111] shadow-[0_4px_10px_rgba(53,62,112,0.16)]"
      >
        <Wave color={copy.color} />
        <span className="whitespace-nowrap text-[13px] font-bold">{copy.title}</span>
        {recording ? <span className="whitespace-nowrap text-[11px] text-[#6B7280]">{elapsed}</span> : null}
        {copy.detail ? <span className="whitespace-nowrap text-[11px] text-[#6B7280]">{copy.detail}</span> : null}
      </div>
    </div>
  );
}

/** 회의 중인 타이틀 아래가 읽기 전용임을 알리는 하단 안내(Figma M3). */
export function MeetingReadOnlyNote() {
  return (
    <p className="pointer-events-none absolute bottom-5 left-1/2 z-20 w-max max-w-[min(90%,720px)] -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-center text-[11px] leading-4 text-[#555555] shadow-sm">
      ■ 녹음 중인 타이틀 아래의 모든 노드(기존 노드 포함)는 읽기 전용이에요 (이동·이름 변경·삭제·내용 수정 불가). 내용 확인은 가능하고, 녹음 종료 후 편집할 수 있어요
    </p>
  );
}

/** 회의가 붙은 타이틀 노드 아래의 칩: 녹음 중 `03:12`, 그 전 단계는 입장 중. */
export function MeetingNodeChip({ meeting }: { meeting: MeetingInfo }) {
  const recording = toBotStatus(meeting.status) === "recording";
  const elapsed = useElapsedLabel(meeting.occurredAt, recording);
  return (
    <span
      role="status"
      className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#D43B3B] px-3 py-1 text-[11px] font-semibold text-white shadow-sm"
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-white" />
      {recording ? `녹음 중 ${elapsed}` : "봇 입장 중"}
    </span>
  );
}
