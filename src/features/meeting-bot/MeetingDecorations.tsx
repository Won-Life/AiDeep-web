"use client";

import { branchPath } from "@/features/edge/BranchEdge";
import { HUB_OFFSET } from "@/features/graph/logic/placement";
import { contentBannerPath } from "@/features/nodes/contentBannerPath";
import type { MeetingPlaceholder } from "./meetingGraphDecor";

/** 녹음 중인 타이틀 아래 "노드 생성 중…" 자리(Figma M3). 타이틀 노드 좌상단 기준으로 그린다. */
export function MeetingNodePlaceholder({
  placeholder,
  titleWidth,
  titleHeight,
}: {
  placeholder: MeetingPlaceholder;
  titleWidth: number;
  titleHeight: number;
}) {
  const { offset, width, height, side } = placeholder;
  const startX = side === "right" ? titleWidth : 0;
  const startY = titleHeight / 2;
  const endX = side === "right" ? offset.x : offset.x + width;
  const endY = offset.y + height / 2;
  // 기본 엣지와 같은 줄기 위치(HUB_OFFSET)라 실제 엣지 줄기와 겹쳐 보인다
  const hubX = startX + (side === "right" ? HUB_OFFSET : -HUB_OFFSET);

  return (
    <>
      <svg aria-hidden className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1} style={{ zIndex: -2 }}>
        <path
          d={branchPath(startX, startY, hubX, endX, endY)}
          fill="none"
          stroke="rgb(var(--ds-gray-300))"
          strokeWidth={2}
          strokeDasharray="5 4"
          strokeLinecap="round"
        />
      </svg>
      <div
        role="status"
        className="pointer-events-none absolute flex items-center justify-between gap-3 px-5 text-[11px] font-semibold text-foreground"
        style={{ left: offset.x, top: offset.y, width, height }}
      >
        <svg aria-hidden className="absolute inset-0 overflow-visible" width={width} height={height} style={{ zIndex: -1 }}>
          <path
            d={contentBannerPath(width, height, side === "right")}
            fill="rgb(var(--ds-main-blue-pale))"
            stroke="rgb(var(--ds-main-blue))"
            strokeWidth={2}
            strokeDasharray="6 4"
            strokeLinejoin="round"
          />
        </svg>
        <span className="truncate">노드 생성 중…</span>
        <svg aria-hidden width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgb(var(--ds-main-blue))" strokeWidth="1.5" strokeLinecap="round">
          <rect x="3" y="7" width="10" height="7" rx="1.5" />
          <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
        </svg>
      </div>
    </>
  );
}

/** 녹음 중 잠긴 하위 노드 위 말풍선(Figma M3 · M3c). */
export function MeetingLockHint() {
  return (
    <div className="pointer-events-none absolute bottom-full right-0 z-20 mb-3 w-max">
      <p className="rounded-full bg-[rgb(var(--ds-main-blue-deep))] px-4 py-1.5 text-[11px] font-medium text-white shadow-sm">
        클릭하면 내용을 볼 수 있어요. 녹음 중에는 수정할 수 없어요
      </p>
      <span
        aria-hidden
        className="absolute -bottom-1 right-6 size-2.5 rotate-45 bg-[rgb(var(--ds-main-blue-deep))]"
      />
    </div>
  );
}
