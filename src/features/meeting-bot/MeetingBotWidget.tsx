"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import "./meeting-bot.css";

/*
 * CONTEXT
 * - Problem      : 주력 기능인 회의 봇을 그래프에서 바로 발견하고 회의 링크 하나로 요청하는 화면이 필요하다.
 * - Why          : 그래프 위 버튼, 집중형 모달, 요청 뒤 작은 상태 뱃지를 도메인 컴포넌트로 묶는다.
 * - Alternatives : 도구 메뉴 안에만 두면 주 진입점이 숨고, 별도 페이지는 그래프 맥락을 잃는다.
 * - Trade-offs   : 봇 API 계약 전까지 입력과 상태는 브라우저 안의 시안이며 실제 참여 요청은 보내지 않는다.
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

function MeetingBotAddModal({ onClose, onPreview }: {
  onClose: () => void;
  onPreview: (meetingUrl: string) => void;
}) {
  const [meetingUrl, setMeetingUrl] = useState("");
  const [error, setError] = useState("");
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = meetingUrl.trim();
    if (!isMeetingUrl(value)) {
      setError("https://로 시작하는 회의 링크를 입력해주세요.");
      inputRef.current?.focus();
      return;
    }
    onPreview(value);
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
        className="relative my-auto w-full max-w-[562px] rounded-[28px] bg-[var(--meeting-surface)] px-6 pb-7 pt-12 text-[var(--meeting-ink)] shadow-2xl sm:px-[52px] sm:pb-9"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="회의 봇 추가 닫기"
          className="absolute right-5 top-4 flex size-10 items-center justify-center rounded-full text-3xl font-light text-[var(--meeting-muted)] transition-colors hover:bg-[var(--meeting-soft-surface)]"
        >
          ×
        </button>
        <div className="flex justify-center">
          <Image src={LOGO_SRC} alt="On:Node" width={170} height={33} priority />
        </div>
        <h2 id="meeting-bot-title" className="mt-9 text-center text-[28px] font-bold">회의 봇 추가</h2>
        <p className="mt-2 text-center text-[15px] leading-6 text-[var(--meeting-muted)]">
          회의 링크를 입력하면 On:Node 봇이 참여를 요청합니다.
        </p>
        <div className="mt-6 flex items-center gap-3 rounded-[13px] bg-[var(--meeting-soft-surface)] px-5 py-4 text-[13px] text-[var(--meeting-muted)] sm:text-sm">
          <span className="size-2.5 shrink-0 rounded-full bg-[var(--meeting-accent)]" aria-hidden="true" />
          봇 입장 후 발화를 기록하고 그래프에 연결해요
        </div>
        <form onSubmit={handleSubmit} noValidate className="mt-8">
          <label htmlFor="meeting-bot-url" className="block text-[15px] font-semibold">회의 링크</label>
          <input
            ref={inputRef}
            id="meeting-bot-url"
            type="url"
            inputMode="url"
            autoComplete="url"
            value={meetingUrl}
            onChange={(event) => { setMeetingUrl(event.target.value); setError(""); }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "meeting-bot-url-error" : undefined}
            placeholder="Zoom, Google Meet 등의 회의 링크"
            className="mt-3 h-[60px] w-full rounded-xl border-2 border-[var(--meeting-primary-border)] bg-[var(--meeting-surface)] px-4 text-[15px] outline-none placeholder:text-[var(--meeting-muted)] focus:border-[var(--meeting-primary)]"
          />
          {error ? <p id="meeting-bot-url-error" role="alert" className="mt-2 text-sm text-red-600">{error}</p> : null}
          <p className="mt-3 text-[13px] text-[var(--meeting-muted)]">호스트가 봇의 입장을 승인해야 할 수 있습니다.</p>
          <button
            type="submit"
            className="mt-6 h-[62px] w-full rounded-[13px] bg-[var(--meeting-primary)] text-[17px] font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--meeting-primary)]"
          >
            봇 참여 요청
          </button>
        </form>
        <p className="mt-4 text-center text-[13px] text-[var(--meeting-muted)]">
          UI 미리보기 · 실제 봇은 아직 호출되지 않습니다.
        </p>
      </section>
    </div>,
    document.body,
  );
}

export default function MeetingBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  return (
    <div className="meeting-bot-ui">
      <div className="pointer-events-none absolute bottom-20 right-5 z-30 flex flex-col items-end gap-3 sm:right-8">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto rounded-[13px] bg-[var(--meeting-primary)] px-5 py-3 text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--meeting-primary)] sm:text-base"
        >
          회의 봇 추가
        </button>
        {previewUrl ? (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="회의 봇 상태 미리보기"
            className="pointer-events-auto flex w-[270px] items-center gap-3 rounded-[15px] bg-[var(--meeting-surface)] px-4 py-3 text-left text-[var(--meeting-ink)] shadow-lg"
          >
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--meeting-accent)]"><span className="size-2 rounded-full bg-white" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-bold">회의 입장 대기 · 시안</span>
              <span className="block truncate text-[11px] text-[var(--meeting-muted)]">On:Node 봇 · 실제 요청 전송 안 됨</span>
            </span>
          </button>
        ) : null}
      </div>
      {isOpen ? (
        <MeetingBotAddModal
          onClose={() => setIsOpen(false)}
          onPreview={(meetingUrl) => { setPreviewUrl(meetingUrl); setIsOpen(false); }}
        />
      ) : null}
    </div>
  );
}
