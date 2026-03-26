"use client";
import { useReactFlow, useViewport } from "@xyflow/react";
import type { CursorsMap } from "@/hooks/useCursors";

interface CursorOverlayProps {
  cursors: CursorsMap;
  currentUserId?: string;
  isGrabbing?: boolean;
  isHoveringNode?: boolean;
}

/* ─── SVG Icons ─────────────────────────────────────────── */

function PointerIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="20" viewBox="0 0 16 20" className="drop-shadow-sm">
      <path
        d="M0 0L16 12.5L8.5 13.5L12 20L9 21L5.5 14.5L0 19V0Z"
        fill={color}
        stroke="white"
        strokeWidth="1"
      />
    </svg>
  );
}

/** Open hand — "you can grab this" */
function OpenHandIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="22" viewBox="0 0 24 24" className="drop-shadow-sm">
      <path
        d="M6.5 12V7.5a1 1 0 0 1 2 0V12m0-6.5a1 1 0 0 1 2 0V12m0-5a1 1 0 0 1 2 0V12m0-3.5a1 1 0 0 1 2 0V15a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5v-3.5a1 1 0 0 1 2 0V12"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Closed hand — "grabbing" */
function GrabHandIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="22" viewBox="0 0 24 24" className="drop-shadow-sm">
      <path
        d="M7 11V6a1 1 0 0 1 2 0v4m0 0V4a1 1 0 0 1 2 0v7m0-5V5a1 1 0 0 1 2 0v6m0-3a1 1 0 0 1 2 0v7c0 3.5-2.5 6-6 6s-5.5-2-7-4l-2.5-3.5a1.5 1.5 0 0 1 2-2L7 15V11Z"
        fill={color}
        stroke="white"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Renders user cursors on top of the ReactFlow canvas.
 * Flow coordinates → screen coordinates via flowToScreenPosition.
 *
 * Local user cursor has 3 states:
 *   pointer (default) → open hand (hovering node) → closed hand (dragging)
 * Remote cursors always show the pointer icon.
 */
export default function CursorOverlay({
  cursors,
  currentUserId,
  isGrabbing,
  isHoveringNode,
}: CursorOverlayProps) {
  const { flowToScreenPosition } = useReactFlow();
  useViewport(); // re-render on zoom/pan

  const entries = Object.entries(cursors);
  if (entries.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[60] overflow-hidden">
      {entries.map(([userId, cursor]) => {
        const screen = flowToScreenPosition({ x: cursor.x, y: cursor.y });
        const isSelf = userId === currentUserId;

        let icon: React.ReactNode;
        if (isSelf && isGrabbing) {
          icon = <GrabHandIcon color={cursor.color} />;
        } else if (isSelf && isHoveringNode) {
          icon = <OpenHandIcon color={cursor.color} />;
        } else {
          icon = <PointerIcon color={cursor.color} />;
        }

        return (
          <div
            key={userId}
            className="absolute transition-transform duration-75 ease-linear"
            style={{
              transform: `translate(${screen.x}px, ${screen.y}px)`,
            }}
          >
            {icon}
            {/* Name badge */}
            <span
              className="ml-3 -mt-1 inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs text-white shadow-sm"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.userName}
            </span>
          </div>
        );
      })}
    </div>
  );
}
