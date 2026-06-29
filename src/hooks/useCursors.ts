"use client";
import { useEffect, useState } from "react";
import { onCursorMove, onCursorLeave } from "@/api/ws";
import type { CursorPayload } from "@/api/ws";

export type CursorsMap = Record<string, CursorPayload>;

/**
 * Subscribes to remote cursor events and maintains a map of
 * { userId → CursorPayload }. Returns the current cursors state.
 *
 * Must be called AFTER subscribeToWorkspace (socket must exist).
 */
export function useCursors(
  workspaceId: string,
  currentUserId: string,
): CursorsMap {
  const [cursors, setCursors] = useState<CursorsMap>({});

  useEffect(() => {
    if (!workspaceId) return;

    const cleanupMove = onCursorMove((payload: CursorPayload) => {
      if (payload.userId === currentUserId) return;

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
  }, [workspaceId, currentUserId]);

  return cursors;
}
