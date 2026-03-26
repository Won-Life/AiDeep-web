"use client";
import { useEffect, useState, useRef } from "react";
import { onCursorMove, onCursorLeave } from "@/api/ws";
import type { CursorPayload } from "@/api/ws";

export type CursorsMap = Record<string, CursorPayload>;

/**
 * Subscribes to remote cursor events and maintains a map of
 * { userId → CursorPayload }. Returns the current cursors state.
 *
 * Must be called AFTER subscribeToWorkspace (socket must exist).
 */
export function useCursors(workspaceId: string): CursorsMap {
  const [cursors, setCursors] = useState<CursorsMap>({});
  const cursorsRef = useRef(cursors);
  cursorsRef.current = cursors;

  useEffect(() => {
    if (!workspaceId) return;

    const cleanupMove = onCursorMove((payload: CursorPayload) => {
      setCursors((prev) => ({
        ...prev,
        [payload.userId]: payload,
      }));
    });

    const cleanupLeave = onCursorLeave((payload: { userId: string }) => {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[payload.userId];
        return next;
      });
    });

    return () => {
      cleanupMove();
      cleanupLeave();
      setCursors({});
    };
  }, [workspaceId]);

  return cursors;
}
