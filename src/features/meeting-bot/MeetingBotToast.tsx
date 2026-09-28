"use client";

import { createPortal } from "react-dom";

export type MeetingBotToastKind = "success" | "error";

const TOAST_CONTENT: Record<MeetingBotToastKind, { message: string; color: string; background: string; border: string; icon: string }> = {
  success: {
    message: "회의 봇 참여 요청을 접수했어요.",
    color: "#21804a",
    background: "#e7f5eb",
    border: "#d5e9dc",
    icon: "✓",
  },
  error: {
    message: "회의 봇 참여 요청에 실패했어요. 다시 시도해주세요.",
    color: "#c44949",
    background: "#fcecec",
    border: "#f2d4d4",
    icon: "!",
  },
};

export default function MeetingBotToast({ kind, onClose }: { kind: MeetingBotToastKind; onClose: () => void }) {
  const content = TOAST_CONTENT[kind];

  return createPortal(
    <div
      role={kind === "error" ? "alert" : "status"}
      className="meeting-bot-ui fixed right-5 top-5 z-[110] flex w-[360px] max-w-[calc(100vw-40px)] items-center gap-3 rounded-xl border bg-[var(--meeting-surface)] px-4 py-3 text-sm text-[var(--meeting-ink)] shadow-lg sm:right-8"
      style={{ borderColor: content.border }}
    >
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-full font-bold"
        style={{ color: content.color, backgroundColor: content.background }}
      >
        {content.icon}
      </span>
      <span className="min-w-0 flex-1">{content.message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="알림 닫기"
        className="shrink-0 rounded p-1 text-[var(--meeting-muted)] hover:bg-[var(--meeting-soft-surface)]"
      >
        ×
      </button>
    </div>,
    document.body,
  );
}
