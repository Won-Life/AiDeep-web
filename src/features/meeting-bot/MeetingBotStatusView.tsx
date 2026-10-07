"use client";

import type { MeetingBotStatus } from "./MeetingBotStatusBadge";

/*
 * CONTEXT
 * - Problem      : 봇 요청 후 입장 중·완료·실패·무료 플랜 종료 화면이 Figma(M1a/M2/M1c/M4)에 있다.
 * - Why          : 모달 상태를 외부에서 받는 status/limitReached로 정하고, 화면은 값만 보고 그린다.
 * - Alternatives : 모달 내부에서 요청 결과로 상태를 추론 → 서버가 입장 결과를 주지 않아 불가능.
 * - Trade-offs   : 상태를 전달하는 서버 API가 연결되기 전에는 form 화면만 실제로 보인다.
 * - Edge Case    : waiting은 입장 대기와 같은 화면, completed는 form으로 되돌린다.
 */
export type MeetingBotView = "form" | "joining" | "added" | "failed" | "limit";

export function getMeetingBotView(status: MeetingBotStatus | null | undefined, limitReached: boolean): MeetingBotView {
  if (limitReached) return "limit";
  if (status === "waiting" || status === "joining") return "joining";
  if (status === "recording") return "added";
  if (status === "error") return "failed";
  return "form";
}

function Dot({ color }: { color: string }) {
  return <span aria-hidden="true" className="mr-2 inline-block size-2 rounded-full align-middle" style={{ backgroundColor: color }} />;
}

const PRIMARY_BUTTON =
  "h-[46px] w-full rounded-[10px] bg-[var(--meeting-primary)] text-sm font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--meeting-primary)]";

export function MeetingBotStatusActions({ view, onRetry, onEditLink, onViewGraph }: {
  view: Exclude<MeetingBotView, "form" | "limit">;
  onRetry: () => void;
  onEditLink: () => void;
  onViewGraph: () => void;
}) {
  if (view === "joining") {
    return (
      <div role="status" className="mt-6">
        <p className="flex h-10 items-center justify-center rounded-full bg-[var(--meeting-primary)] text-[13px] font-semibold text-white">
          <Dot color="#ffb454" />봇이 회의에 입장하는 중이에요...
        </p>
        <button type="button" disabled className={`${PRIMARY_BUTTON} mt-4 cursor-not-allowed opacity-50`}>입장 중...</button>
        <p className="mt-4 text-center text-[11px] text-[var(--meeting-muted)]/80">
          대기실이 켜져 있으면 호스트가 승인해야 입장할 수 있어요
        </p>
      </div>
    );
  }

  if (view === "added") {
    return (
      <div role="status" className="mt-6">
        <p className="flex h-10 items-center justify-center rounded-full bg-[var(--meeting-primary-soft)] text-[13px] font-semibold text-[var(--meeting-ink)]">
          <Dot color="#5aa9ff" />봇이 추가 (입장) 되었습니다
        </p>
        <button type="button" onClick={onViewGraph} className={`${PRIMARY_BUTTON} mt-4`}>실시간 그래프 뷰 보러가기 →</button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p
        role="alert"
        className="flex h-10 items-center justify-center rounded-full border border-[var(--meeting-error)] bg-[var(--meeting-error-surface)] text-[13px] font-semibold text-[var(--meeting-error)]"
      >
        <Dot color="var(--meeting-error)" />봇이 회의에 입장하지 못했어요
      </p>
      <p className="mt-2 text-center text-[11px] text-[var(--meeting-muted)]/80">
        호스트가 입장을 승인하지 않았거나, 회의가 아직 시작되지 않았을 수 있어요
      </p>
      <button type="button" onClick={onRetry} className={`${PRIMARY_BUTTON} mt-4`}>다시 시도</button>
      <div className="mt-4 text-center">
        <button type="button" onClick={onEditLink} className="text-[13px] font-semibold underline underline-offset-2">링크 다시 입력</button>
      </div>
    </div>
  );
}

export function MeetingBotLimitPanel({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div role="status" className="text-center">
      <div aria-hidden="true" className="mx-auto size-[60px] rounded-full bg-[var(--meeting-primary-light)]" />
      <h2 id="meeting-bot-title" className="mt-6 text-lg font-bold">무료 플랜 녹음 시간이 끝났어요</h2>
      <p className="mt-3 text-[13px] leading-5 text-[var(--meeting-muted)]">
        회의당 최대 5분까지 녹음할 수 있어요.<br />
        봇은 회의에서 나갔고, 지금까지의 대화는 노드로 정리됐어요.
      </p>
      <button type="button" onClick={onConfirm} className={`${PRIMARY_BUTTON} mt-8`}>그래프 확인하기</button>
      <p className="mt-4 text-[11px] text-[var(--meeting-muted)]/80">유료 요금제는 다음 스프린트에서 추가돼요</p>
    </div>
  );
}
