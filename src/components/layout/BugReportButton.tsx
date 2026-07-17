"use client";
import { useState } from "react";
import { Tooltip } from "@/components/ui/Tooltip";

// 오류 신고하기
const BUG_REPORT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScQUirVvqlceWPVhZJGYo1JCSrr04RcqWe-gYNFdbeypmOMlw/viewform?embedded=true";

export default function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Tooltip label="오류 신고/피드백" align="end">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="오류 신고하기"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-surface"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20a7 7 0 0 0 7-7v-2a7 7 0 1 0-14 0v2a7 7 0 0 0 7 7Z" />
            <path d="M9 9V7a3 3 0 1 1 6 0v2" />
            <path d="M12 13v4" />
            <path d="M5 13H2" />
            <path d="M22 13h-3" />
            <path d="m5 7-2-2" />
            <path d="m19 7 2-2" />
            <path d="m5 19-2 2" />
            <path d="m19 19 2 2" />
          </svg>
        </button>
      </Tooltip>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="flex h-[80vh] w-[640px] max-w-[95vw] flex-col gap-3 rounded-[16px] border border-gray-700 bg-background p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between">
              <span className="text-[16px] font-bold text-foreground">
                오류 신고하기
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="닫기"
                className="text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <iframe
              src={BUG_REPORT_FORM_URL}
              title="오류 신고하기 폼"
              className="w-full flex-1 rounded-[8px] border border-border"
            >
              로딩 중…
            </iframe>
          </div>
        </div>
      )}
    </>
  );
}
