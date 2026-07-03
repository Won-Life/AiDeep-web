'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import { emitWsAwareness, onWsAwareness } from '@/api/ws';
import type { WorkspaceRole } from '@/api/types';

// ─── Types ──────────────────────────────────────────────────────────

export interface AwarenessUserState {
  openEditorNodeId: string | null;
  openNodeIds: string[];
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

// ─── Hook ───────────────────────────────────────────────────────────

interface UseWorkspaceAwarenessOptions {
  workspaceId: string;
  userName: string;
  userColor: string;
  role: WorkspaceRole;
}

export function useWorkspaceAwareness({
  workspaceId,
  userName,
  userColor,
  role,
}: UseWorkspaceAwarenessOptions) {
  const docRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<awarenessProtocol.Awareness | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [nodeViewers, setNodeViewers] = useState<NodeViewersMap>({});
  const [aggregateOpenNodeIds, setAggregateOpenNodeIds] = useState<string[]>([]);

  // ── viewer 뱃지용: openEditorNodeId 기준으로 nodeId → 유저 목록 재계산 ──

  const rebuildViewers = useCallback(
    (awareness: awarenessProtocol.Awareness) => {
      const map: NodeViewersMap = {};
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return;
        const s = state as AwarenessUserState;
        if (!s.openEditorNodeId || !s.user) return;
        const entry = { clientId, name: s.user.name, color: s.user.color };
        if (!map[s.openEditorNodeId]) {
          map[s.openEditorNodeId] = [entry];
        } else {
          map[s.openEditorNodeId].push(entry);
        }
      });
      setNodeViewers(map);
    },
    [],
  );

  // ── 전체 참여자 openNodeIds 합집합 재계산 ──

  const rebuildAllOpenNodeIds = useCallback(
    (awareness: awarenessProtocol.Awareness) => {
      const ids = new Set<string>();
      awareness.getStates().forEach((state) => {
        const s = state as AwarenessUserState;
        (s.openNodeIds ?? []).forEach((id) => ids.add(id));
      });
      setAggregateOpenNodeIds(Array.from(ids));
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

    awareness.setLocalStateField('openEditorNodeId', null);
    awareness.setLocalStateField('openNodeIds', []);
    awareness.setLocalStateField('user', {
      name: userName,
      color: userColor,
      role,
    });

    const cleanupSocket = onWsAwareness(({ data }) => {
      awarenessProtocol.applyAwarenessUpdate(
        awareness,
        new Uint8Array(data),
        null,
      );
    });

    /*
     * CONTEXT
     * - Problem      : awareness change 이벤트에서 열림/닫힘을 감지하는 방법이 두 가지 존재
     * - Why          : 전체 재계산 방식 선택 — 매번 awareness.getStates() 전체 순회해서 합집합 재계산
     *                  awareness를 SOT(Single Source of Truth)로 삼아 모든 상태를 awareness 기준으로 일관되게 관리
     * - Alternatives : diff 방식 (changes.added/removed/updated 기반) — 변경된 유저만 처리해서 성능상 더 효율적
     *                  기각 이유: prevOpenNodeIdsRef 관리, 추가/삭제/제거 로직 분기, state 동기화 복잡도 증가
     * - Trade-offs   : 코드 단순함과 유지보수성을 얻는 대신, 변경 시 전체 유저 순회 (협업 유저 수 적어 문제 없음)
     * - Edge Case    : 유저 수 적고(<10명) 패널 열림/닫힘 빈도 낮아(<1초당 1회) 성능 영향 미미할 것이라 예상
     */
    const handleChange = () => {
      rebuildViewers(awareness);
      rebuildAllOpenNodeIds(awareness);
    };
    awareness.on('change', handleChange);

    const update = awarenessProtocol.encodeAwarenessUpdate(awareness, [
      awareness.clientID,
    ]);
    emitWsAwareness(workspaceId, update);

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
      const removalUpdate = awarenessProtocol.encodeAwarenessUpdate(awareness, [awareness.clientID]);
      emitWsAwareness(workspaceId, removalUpdate);
      awareness.destroy();
      doc.destroy();
      docRef.current = null;
      awarenessRef.current = null;
      setNodeViewers({});
      setAggregateOpenNodeIds([]);
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

  // ── Public: 내가 열어둔 노드 id 목록을 awareness에 업데이트 ──

  const setAwarenessOpenNodeIds = useCallback(
    (openNodeIds: string[]) => {
      const awareness = awarenessRef.current;
      if (!awareness) return;
      awareness.setLocalStateField('openNodeIds', openNodeIds);
      emitLocal(awareness);
    },
    [emitLocal],
  );

  // ── Public: 현재 포커스된 노드 id를 awareness에 업데이트 (viewer 뱃지용) ──

  const setOpenEditorNodeId = useCallback(
    (nodeId: string | null) => {
      const awareness = awarenessRef.current;
      if (!awareness) return;
      awareness.setLocalStateField('openEditorNodeId', nodeId);
      emitLocal(awareness);
    },
    [emitLocal],
  );

  return { nodeViewers, aggregateOpenNodeIds, setOpenEditorNodeId, setAwarenessOpenNodeIds };
}
