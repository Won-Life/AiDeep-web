export type MeetingBotStatus = "waiting" | "joining" | "recording" | "completed" | "error";

const STATUS_CONTENT: Record<MeetingBotStatus, { label: string; detail: string; color: string; background: string }> = {
  waiting: { label: "회의 입장 대기", detail: "봇이 회의 입장을 기다리고 있어요", color: "#b45a98", background: "#fcecf6" },
  joining: { label: "회의 참여 중", detail: "봇이 회의에 연결하고 있어요", color: "#4a67d8", background: "#e9eeff" },
  recording: { label: "회의 기록 중", detail: "회의 내용을 기록하고 있어요", color: "#21804a", background: "#e7f5eb" },
  completed: { label: "회의 기록 종료", detail: "회의 기록이 종료됐어요", color: "#5f6879", background: "#eef0f4" },
  error: { label: "회의 연결 오류", detail: "연결 상태를 확인해주세요", color: "#c44949", background: "#fcecec" },
};

export default function MeetingBotStatusBadge({ status }: { status: MeetingBotStatus }) {
  const content = STATUS_CONTENT[status];

  return (
    <div role="status" className="flex w-[270px] max-w-[calc(100vw-40px)] items-center gap-3 rounded-[15px] border border-[var(--meeting-input-border)] bg-[var(--meeting-surface)] px-4 py-3 text-left text-[var(--meeting-ink)] shadow-lg">
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: content.background }}
      >
        <span className="size-2.5 rounded-full" style={{ backgroundColor: content.color }} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{content.label}</span>
        <span className="block truncate text-xs text-[var(--meeting-muted)]">{content.detail}</span>
      </span>
    </div>
  );
}
