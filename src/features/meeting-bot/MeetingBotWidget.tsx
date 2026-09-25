"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import MeetingBotStatusBadge, { type MeetingBotStatus } from "./MeetingBotStatusBadge";
import MeetingBotToast, { type MeetingBotToastKind } from "./MeetingBotToast";
import "./meeting-bot.css";

/*
 * CONTEXT
 * - Problem      : 주력 기능인 회의 봇을 그래프에서 바로 발견하고 회의 링크 하나로 요청하는 화면이 필요하다.
 * - Why          : 그래프 위 버튼과 집중형 모달을 도메인 컴포넌트로 묶는다.
 * - Alternatives : 도구 메뉴 안에만 두면 주 진입점이 숨고, 별도 페이지는 그래프 맥락을 잃는다.
 * - Trade-offs   : 요청 알림은 내부 상태로 관리하고, 지속되는 봇 상태는 외부에서 전달받는다.
 * - Edge Case    : 무효한 URL, Escape/배경 닫기, 다른 모달 위 겹침, 화면이 좁은 경우를 처리한다.
 */

const LOGO_SRC = "/images/meeting-bot/onnode-logo-black.svg";

function isMeetingUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
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

function MeetingBotAddModal({ onClose, onRequest }: {
  onClose: () => void;
  onRequest: (meetingUrl: string) => Promise<boolean>;
}) {
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
    if (!isMeetingUrl(value)) {
      setError("https://로 시작하는 회의 링크를 입력해주세요.");
      inputRef.current?.focus();
      return;
    }
    setIsSubmitting(true);
    const accepted = await onRequest(value);
    setIsSubmitting(false);
    if (accepted) onClose();
  }

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
        className="relative my-auto w-full max-w-[480px] rounded-[20px] bg-[var(--meeting-surface)] p-6 text-[var(--meeting-ink)] shadow-2xl sm:p-10"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="회의 봇 추가 닫기"
          className="absolute right-5 top-4 flex size-10 items-center justify-center rounded-full text-3xl font-light text-[var(--meeting-muted)] transition-colors hover:bg-[var(--meeting-soft-surface)]"
        >
          ×
        </button>
        <div className="flex justify-start">
          <Image src={LOGO_SRC} alt="On:Node" width={120} height={23} priority />
        </div>
        <h2 id="meeting-bot-title" className="mt-6 text-left text-[26px] font-bold">회의 봇 추가</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--meeting-muted)]">회의 내용을 기록하고 정리해요.</p>
        <form onSubmit={handleSubmit} noValidate className="mt-6">
          <label htmlFor="meeting-bot-url" className="block text-[15px] font-semibold">회의 링크</label>
          <input
            ref={inputRef}
            id="meeting-bot-url"
            type="url"
            inputMode="url"
            autoComplete="url"
            disabled={isSubmitting}
            value={meetingUrl}
            onChange={(event) => { setMeetingUrl(event.target.value); setError(""); }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "meeting-bot-url-error" : undefined}
            placeholder="Zoom, Google Meet 등의 회의 링크"
            className="mt-2 h-14 w-full rounded-xl border-2 border-[var(--meeting-input-border)] bg-[var(--meeting-surface)] px-4 text-[15px] outline-none placeholder:text-[var(--meeting-muted)] focus:border-[var(--meeting-muted)]"
          />
          {error ? <p id="meeting-bot-url-error" role="alert" className="mt-2 text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 h-14 w-full rounded-xl bg-[var(--meeting-primary)] text-base font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--meeting-primary)] disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "요청 중..." : "봇 참여 요청"}
          </button>
        </form>
      </section>
    </div>,
    document.body,
  );
}

export default function MeetingBotWidget({ status = null, requestMeetingBot }: {
  status?: MeetingBotStatus | null;
  requestMeetingBot?: (meetingUrl: string) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState<MeetingBotToastKind | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const closeModal = useCallback(() => setIsOpen(false), []);
  const handleRequest = useCallback(async (meetingUrl: string) => {
    try {
      await requestMeetingBot?.(meetingUrl);
      setToast("success");
      return true;
    } catch {
      setToast("error");
      return false;
    }
  }, [requestMeetingBot]);

  return (
    <div className="meeting-bot-ui">
      <div className="pointer-events-none absolute bottom-20 right-5 z-30 flex flex-col items-end gap-3 sm:right-8">
        {status ? <MeetingBotStatusBadge status={status} /> : null}
        <button
          type="button"
          onClick={() => { setToast(null); setIsOpen(true); }}
          className="pointer-events-auto rounded-[13px] bg-[var(--meeting-primary)] px-5 py-3 text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--meeting-primary)] sm:text-base"
        >
          회의 봇 추가
        </button>
      </div>
      {toast ? <MeetingBotToast kind={toast} onClose={() => setToast(null)} /> : null}
      {isOpen ? (
        <MeetingBotAddModal
          onClose={closeModal}
          onRequest={handleRequest}
        />
      ) : null}
    </div>
  );
}
