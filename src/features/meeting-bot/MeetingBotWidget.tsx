"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { ApiError } from "@/api/types";
import MeetingBotStatusBadge, { type MeetingBotStatus } from "./MeetingBotStatusBadge";
import MeetingBotTargetField from "./MeetingBotTargetField";
import { MeetingBotLimitPanel, MeetingBotStatusActions, getMeetingBotView, type MeetingBotView } from "./MeetingBotStatusView";
import { createMeetingBotRequest, normalizeMeetingTarget, type MeetingBotPlatform, type MeetingBotRequest } from "./meetingBotRequest";
import type { MeetingTarget } from "./meetingTargets";
import "./meeting-bot.css";

/*
 * CONTEXT
 * - Problem      : 주력 기능인 회의 봇을 그래프에서 바로 발견하고 회의 링크 하나로 요청하는 화면이 필요하다.
 * - Why          : 그래프 위 버튼과 집중형 모달을 도메인 컴포넌트로 묶는다.
 * - Alternatives : 도구 메뉴 안에만 두면 주 진입점이 숨고, 별도 페이지는 그래프 맥락을 잃는다.
 * - Trade-offs   : 서버는 입장 결과를 조회할 수 없어 요청 직후엔 "입장 중"까지만 보이고 이후 상태는 외부 status로 받는다.
 * - Edge Case    : 무효한 URL, Escape/배경 닫기, 같은 링크의 진행 중인 봇(MEETING-007), 추가할 타이틀 없음.
 */

const DUPLICATE_BOT_CODE = "MEETING-007";

const PLATFORM_COPY: Record<MeetingBotPlatform, { label: string; field: string; placeholder: string; error: string }> = {
  ZOOM: {
    label: "Zoom",
    field: "Zoom 링크 또는 회의 ID",
    placeholder: "예: 123-4567-8901 또는 zoom.us/j/1234567890",
    error: "올바른 Zoom 링크나 회의 ID가 아니에요. 다시 확인해 주세요",
  },
  GOOGLE_MEET: {
    label: "Google Meet",
    field: "Google Meet 링크",
    placeholder: "예: meet.google.com/abc-defg-hij",
    error: "올바른 Google Meet 링크가 아니에요. 다시 확인해 주세요",
  },
};

function MeetingBotIcon() {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true">
      <circle cx="30" cy="30" r="30" fill="var(--meeting-primary-light)" />
      <rect x="17" y="22" width="26" height="20" rx="6" fill="var(--meeting-surface)" stroke="var(--meeting-primary)" strokeWidth="2.5" />
      <line x1="30" y1="22" x2="30" y2="15" stroke="var(--meeting-primary)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="30" cy="14" r="2.5" fill="var(--meeting-primary)" />
      <circle cx="25" cy="31" r="2.5" fill="var(--meeting-primary)" />
      <circle cx="35" cy="31" r="2.5" fill="var(--meeting-primary)" />
    </svg>
  );
}

function PlatformIcon({ platform }: { platform: MeetingBotPlatform }) {
  if (platform === "ZOOM") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <rect width="24" height="24" rx="6" fill="#2d8cff" />
        <rect x="5" y="8" width="9" height="8" rx="2" fill="#fff" />
        <path d="M15 11l4-2.5v7L15 13z" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 8h9v8H6a3 3 0 0 1-3-3z" fill="#4285f4" />
      <path d="M12 8h5v3.2L21 8v8l-4-3.2V16h-5z" fill="#00ac47" />
      <path d="M12 16h5v1a2 2 0 0 1-2 2h-3z" fill="#ea4335" />
      <path d="M12 5h3a2 2 0 0 1 2 2v1h-5z" fill="#ffba00" />
    </svg>
  );
}

function keepTabInsideDialog(event: KeyboardEvent, dialog: HTMLElement | null) {
  if (event.key !== "Tab" || !dialog) return;

  const focusable = dialog.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  );
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  const outside = !dialog.contains(active);
  const target = event.shiftKey
    ? (outside || active === first ? last : null)
    : (outside || active === last ? first : null);
  if (!target) return;

  event.preventDefault();
  target.focus();
}

function MeetingBotAddModal({ view, target, failureMessage, onClose, onRequest, onEditLink, onViewGraph }: {
  view: MeetingBotView;
  target: MeetingTarget | null;
  failureMessage: string;
  onClose: () => void;
  onRequest: (meetingTarget: string, platform: MeetingBotPlatform, nodeId: string) => Promise<string | null>;
  onEditLink: () => void;
  onViewGraph: () => void;
}) {
  const activeTargetId = target?.id ?? "";
  const [platform, setPlatform] = useState<MeetingBotPlatform>("ZOOM");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    inputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      keepTabInsideDialog(event, dialogRef.current);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const value = meetingUrl.trim();
    if (!normalizeMeetingTarget(value, platform)) {
      setError(PLATFORM_COPY[platform].error);
      inputRef.current?.focus();
      return;
    }
    if (!activeTargetId) return;
    setIsSubmitting(true);
    const message = await onRequest(value, platform, activeTargetId);
    setIsSubmitting(false);
    if (message) setError(message);
  }

  function handleRetry() {
    const value = meetingUrl.trim();
    if (!normalizeMeetingTarget(value, platform) || !activeTargetId) {
      onEditLink();
      return;
    }
    void onRequest(value, platform, activeTargetId).then((message) => { if (message) setError(message); });
  }

  const copy = PLATFORM_COPY[platform];
  const locked = isSubmitting || view !== "form";

  return createPortal(
    <div
      className="meeting-bot-ui fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-[5px]"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-bot-title"
        className="relative my-auto w-full max-w-[484px] rounded-[24px] bg-[var(--meeting-surface)] px-6 py-9 text-[var(--meeting-ink)] shadow-2xl sm:px-[54px]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="회의 봇 추가 닫기"
          className="absolute right-4 top-3 flex size-10 items-center justify-center rounded-full text-3xl font-light text-[var(--meeting-muted)] transition-colors hover:bg-[var(--meeting-soft-surface)]"
        >
          ×
        </button>
        {view === "limit" ? <MeetingBotLimitPanel onConfirm={onViewGraph} /> : (<>
        <div className="flex justify-center">
          <MeetingBotIcon />
        </div>
        <h2 id="meeting-bot-title" className="mt-4 text-center text-lg font-bold">회의 봇 추가</h2>
        <p className="mt-2 text-center text-[13px] leading-5 text-[var(--meeting-muted)]">
          봇을 시작하면 회의를 녹음하고 자동으로 노드를 만들어드려요
        </p>
        <MeetingBotTargetField target={target} />
        <form onSubmit={handleSubmit} noValidate className="mt-5">
          <div role="radiogroup" aria-label="플랫폼" className="grid grid-cols-2 gap-3">
            {(Object.keys(PLATFORM_COPY) as MeetingBotPlatform[]).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={platform === value}
                disabled={locked}
                onClick={() => { setPlatform(value); setError(""); }}
                className={`flex h-11 items-center justify-center gap-2 rounded-lg border-2 text-sm font-semibold transition-colors ${
                  platform === value
                    ? "border-[var(--meeting-primary)] bg-[var(--meeting-primary-light)]"
                    : "border-[var(--meeting-primary-soft)] bg-[var(--meeting-surface)] hover:bg-[var(--meeting-soft-surface)]"
                }`}
              >
                <PlatformIcon platform={value} />
                {PLATFORM_COPY[value].label}
              </button>
            ))}
          </div>
          <label htmlFor="meeting-bot-url" className="mt-5 block text-[13px] font-semibold text-[var(--meeting-muted)]">
            {copy.field}
          </label>
          <input
            ref={inputRef}
            id="meeting-bot-url"
            type="text"
            inputMode="url"
            autoComplete="off"
            disabled={locked}
            value={meetingUrl}
            onChange={(event) => { setMeetingUrl(event.target.value); setError(""); }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "meeting-bot-url-error" : undefined}
            placeholder={copy.placeholder}
            className={`mt-2 h-10 w-full rounded-full border px-4 text-center text-[13px] outline-none placeholder:text-[var(--meeting-muted)]/60 ${
              error
                ? "border-[var(--meeting-error)] bg-[var(--meeting-error-surface)]"
                : "border-[var(--meeting-primary)] bg-[var(--meeting-surface)] focus:border-2"
            }`}
          />
          {error ? (
            <p id="meeting-bot-url-error" role="alert" className="mt-2 text-xs text-[var(--meeting-error)]">{error}</p>
          ) : (
            <p className="mt-2 text-xs text-[var(--meeting-muted)]/70">무료 플랜: 회의당 최대 5분 녹음</p>
          )}
          {view === "form" ? (
            <>
              <button
                type="submit"
                disabled={isSubmitting || !target}
                className="mt-6 h-[46px] w-full rounded-[10px] bg-[var(--meeting-primary)] text-sm font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--meeting-primary)] disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting ? "요청 중..." : "회의 봇 추가하기"}
              </button>
              <p className="mt-4 text-center text-[11px] text-[var(--meeting-muted)]/80">
                봇은 카메라·마이크를 끈 채 입장하고, 참가자에게 녹음 안내 메시지를 보내요
              </p>
            </>
          ) : (
            <MeetingBotStatusActions view={view} failureMessage={failureMessage} onRetry={handleRetry} onEditLink={onEditLink} onViewGraph={onViewGraph} />
          )}
        </form>
        </>)}
      </section>
    </div>,
    document.body,
  );
}

export default function MeetingBotWidget({ workspaceId, target, status = null, limitReached = false, requestMeetingBot, onViewGraph }: {
  workspaceId: string;
  target: MeetingTarget | null;
  status?: MeetingBotStatus | null;
  limitReached?: boolean;
  requestMeetingBot: (request: MeetingBotRequest) => Promise<unknown>;
  onViewGraph?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [requestPhase, setRequestPhase] = useState<"joining" | "failed" | null>(null);
  const [failureMessage, setFailureMessage] = useState("");
  const [editedKey, setEditedKey] = useState<string | null>(null);
  const viewKey = `${status}-${limitReached}-${requestPhase}`;
  const externalView = getMeetingBotView(status, limitReached);
  const requestView: MeetingBotView = requestPhase ?? "form";
  const view: MeetingBotView = editedKey === viewKey ? "form" : externalView !== "form" ? externalView : requestView;

  const closeModal = useCallback(() => setIsOpen(false), []);
  const handleRequest = useCallback(async (meetingTarget: string, platform: MeetingBotPlatform, nodeId: string) => {
    setRequestPhase(null);
    setEditedKey(null);
    try {
      await requestMeetingBot(createMeetingBotRequest(meetingTarget, workspaceId, nodeId, platform));
      setRequestPhase("joining");
      return null;
    } catch (error) {
      if (error instanceof ApiError && error.errorCode === DUPLICATE_BOT_CODE) return error.reason;
      setFailureMessage(error instanceof ApiError ? error.reason : "회의 봇 요청을 보내지 못했어요. 다시 시도해주세요.");
      setRequestPhase("failed");
      return null;
    }
  }, [requestMeetingBot, workspaceId]);

  return (
    <div className="meeting-bot-ui">
      <div className="pointer-events-none absolute bottom-20 right-5 z-30 flex flex-col items-end gap-3 sm:right-8">
        {status ? <MeetingBotStatusBadge status={status} /> : null}
        <button
          type="button"
          onClick={() => { setRequestPhase(null); setEditedKey(null); setIsOpen(true); }}
          aria-label="회의 봇 추가"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[var(--meeting-error)] bg-[var(--meeting-error-surface)] px-4 py-2 text-xs font-semibold text-[var(--meeting-ink)] shadow-md transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--meeting-error)]"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="10" fill="var(--meeting-error)" />
            <path d="M6 8.5v3M8 7v6M10 5.5v9M12 7v6M14 8.5v3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          회의 녹음 시작
        </button>
      </div>
      {isOpen ? (
        <MeetingBotAddModal
          view={view}
          target={target}
          failureMessage={failureMessage}
          onClose={closeModal}
          onRequest={handleRequest}
          onEditLink={() => setEditedKey(viewKey)}
          onViewGraph={() => { closeModal(); onViewGraph?.(); }}
        />
      ) : null}
    </div>
  );
}
