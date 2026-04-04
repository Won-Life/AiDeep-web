'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import { emitWsAwareness, onWsAwareness } from '@/api/ws';
import type { WorkspaceRole } from '@/api/types';

// ─── Types ──────────────────────────────────────────────────────────

export interface AwarenessUserState {
  focusedNodeId: string | null;
  isOpen: boolean;
  user: {
    name: string;
    color: string;
    role: WorkspaceRole;
  };
}

/** nodeId → list of remote viewers */
export type NodeViewersMap = Record<
  string,
  { clientId: number; name: string; color: string }[]
>;

/** Remote toggle event emitted by OWNER/EDITOR */
export interface RemoteToggleEvent {
  nodeId: string | null;
  isOpen: boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────

interface UseWorkspaceAwarenessOptions {
  workspaceId: string;
  userName: string;
  userColor: string;
  role: WorkspaceRole;
  /** Called when a remote OWNER/EDITOR toggles a node open/closed */
  onRemoteToggle?: (event: RemoteToggleEvent) => void;
}

export function useWorkspaceAwareness({
  workspaceId,
  userName,
  userColor,
  role,
  onRemoteToggle,
}: UseWorkspaceAwarenessOptions) {
  const docRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<awarenessProtocol.Awareness | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onRemoteToggleRef = useRef(onRemoteToggle);
  onRemoteToggleRef.current = onRemoteToggle;

  const [nodeViewers, setNodeViewers] = useState<NodeViewersMap>({});

  // ── Build viewers map from awareness states ──

  const rebuildViewers = useCallback(
    (awareness: awarenessProtocol.Awareness) => {
      const map: NodeViewersMap = {};
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return;
        const s = state as AwarenessUserState;
        if (!s.focusedNodeId || !s.user) return;
        const entry = { clientId, name: s.user.name, color: s.user.color };
        if (!map[s.focusedNodeId]) {
          map[s.focusedNodeId] = [entry];
        } else {
          map[s.focusedNodeId].push(entry);
        }
      });
      setNodeViewers(map);
    },
    [],
  );

  // ── Lifecycle: create doc/awareness, subscribe to socket ──

  useEffect(() => {
    if (!workspaceId) return;

    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    docRef.current = doc;
    awarenessRef.current = awareness;

    // Set initial local state
    awareness.setLocalStateField('focusedNodeId', null);
    awareness.setLocalStateField('isOpen', false);
    awareness.setLocalStateField('user', {
      name: userName,
      color: userColor,
      role,
    });

    // Listen for remote awareness updates from server
    const cleanupSocket = onWsAwareness(({ data }) => {
      awarenessProtocol.applyAwarenessUpdate(
        awareness,
        new Uint8Array(data),
        null,
      );
    });

    // Handle awareness changes — rebuild viewers + detect remote toggles
    const handleChange = (
      changes: { added: number[]; updated: number[]; removed: number[] },
    ) => {
      rebuildViewers(awareness);

      // Detect remote toggle events
      const changedIds = [...changes.added, ...changes.updated];
      for (const clientId of changedIds) {
        if (clientId === awareness.clientID) continue;
        const state = awareness.getStates().get(clientId) as
          | AwarenessUserState
          | undefined;
        if (!state?.user) continue;
        onRemoteToggleRef.current?.({
          nodeId: state.focusedNodeId,
          isOpen: state.isOpen,
        });
      }
    };
    awareness.on('change', handleChange);

    // Emit current state on connect
    const update = awarenessProtocol.encodeAwarenessUpdate(awareness, [
      awareness.clientID,
    ]);
    emitWsAwareness(workspaceId, update);

    // 15-second TTL refresh
    refreshTimerRef.current = setInterval(() => {
      const a = awarenessRef.current;
      if (!a) return;
      const u = awarenessProtocol.encodeAwarenessUpdate(a, [a.clientID]);
      emitWsAwareness(workspaceId, u);
    }, 15_000);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      cleanupSocket();
      awareness.off('change', handleChange);
      awarenessProtocol.removeAwarenessStates(
        awareness,
        [awareness.clientID],
        'window unload',
      );
      awareness.destroy();
      doc.destroy();
      docRef.current = null;
      awarenessRef.current = null;
      setNodeViewers({});
    };
  }, [workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keep user info in sync ──

  useEffect(() => {
    awarenessRef.current?.setLocalStateField('user', {
      name: userName,
      color: userColor,
      role,
    });
  }, [userName, userColor, role]);

  // ── Emit helper ──

  const emitLocal = useCallback(
    (awareness: awarenessProtocol.Awareness) => {
      const update = awarenessProtocol.encodeAwarenessUpdate(awareness, [
        awareness.clientID,
      ]);
      emitWsAwareness(workspaceId, update);
    },
    [workspaceId],
  );

  // ── Public: set focused node + open state ──

  const setFocusedNodeId = useCallback(
    (nodeId: string | null) => {
      const awareness = awarenessRef.current;
      if (!awareness) return;
      awareness.setLocalStateField('focusedNodeId', nodeId);
      awareness.setLocalStateField('isOpen', nodeId !== null);
      emitLocal(awareness);
    },
    [emitLocal],
  );

  const setIsOpen = useCallback(
    (isOpen: boolean) => {
      const awareness = awarenessRef.current;
      if (!awareness) return;
      awareness.setLocalStateField('isOpen', isOpen);
      emitLocal(awareness);
    },
    [emitLocal],
  );

  return { nodeViewers, setFocusedNodeId, setIsOpen };
}
