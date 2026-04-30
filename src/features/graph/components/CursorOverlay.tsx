"use client";
import { useReactFlow, useViewport } from "@xyflow/react";
import type { CursorsMap } from "@/hooks/useCursors";

interface CursorOverlayProps {
  cursors: CursorsMap;
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

/**
 * Renders user cursors on top of the ReactFlow canvas.
 * Flow coordinates → screen coordinates via flowToScreenPosition.
 */
export default function CursorOverlay({ cursors }: CursorOverlayProps) {
  const { flowToScreenPosition } = useReactFlow();
  useViewport(); // re-render on zoom/pan

  const entries = Object.entries(cursors);
  if (entries.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[60] overflow-hidden">
      {entries.map(([userId, cursor]) => {
        const screen = flowToScreenPosition({ x: cursor.x, y: cursor.y });

        return (
          <div
            key={userId}
            className="absolute transition-transform duration-75 ease-linear"
            style={{
              transform: `translate(${screen.x}px, ${screen.y}px)`,
            }}
          >
            <PointerIcon color={cursor.color} />
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
