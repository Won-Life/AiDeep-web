'use client';

import { useState } from 'react';
import { useWorkspaceLayout } from '@/app/workspace/context';
import { useSelectedNodeId } from '@/features/workspace/useSelectedNodeId';
import {
  buildScopeOptions,
  defaultScope,
  enclosingProjectScope,
  excludeRecordingIds,
  isScopeInsideRecording,
  sameScope,
  scopeFromSelection,
  scopeKey,
  scopeNodeIds,
  summarizeScope,
  type ChatScope,
} from './scope';

/*
 * CONTEXT
 * - Problem      : 질문의 범위가 캔버스 선택을 따라 흔들리면 대화 도중 근거가 슬그머니 바뀐다(Figma Q1·Q4).
 * - Why          : 범위를 "선택 따라가기"와 "고정" 두 상태로 나눈다. 첫 질문을 보내면 그 범위로 고정하고, 선택이 달라지면 바꿀지 물어본다.
 * - Alternatives : 항상 선택을 따라감 → 답변 근거가 몰래 바뀐다. 항상 고정 → 다른 노드를 보려면 매번 메뉴를 열어야 한다.
 * - Trade-offs   : 상태가 둘이라 분기가 늘지만 화면에 보이는 문구(칩 · 안내)와 1:1 로 대응한다.
 * - Edge Case    : 고정한 노드가 지워지면 선택 → 기본 범위 순으로 되돌린다. 녹음 중인 회의 안은 막고, 더 넓은 범위로 물을 땐 녹음 중인 회의를 근거에서 뺀다.
 */
export function useChatScope() {
  const { nodes, edges, meetings } = useWorkspaceLayout();
  const selectedId = useSelectedNodeId();
  const selectedScope = scopeFromSelection(selectedId, nodes, edges);

  const [follow, setFollow] = useState(true);
  const [pinned, setPinned] = useState<ChatScope | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  const pinnedAlive = pinned && nodes.some((node) => node.id === pinned.rootId) ? pinned : null;
  const current = follow
    ? (selectedScope ?? pinnedAlive ?? defaultScope(nodes))
    : (pinnedAlive ?? selectedScope ?? defaultScope(nodes));

  const pendingChange = !follow && pinnedAlive && selectedScope
    && !sameScope(pinnedAlive, selectedScope) && dismissedKey !== scopeKey(selectedScope)
    ? selectedScope
    : null;

  const blockedByRecording = current ? isScopeInsideRecording(current, edges, meetings) : false;
  const summary = current ? summarizeScope(current, nodes, edges) : null;
  const rootTitle = current ? nodes.find((node) => node.id === current.rootId) : undefined;
  const recordingProject = current && blockedByRecording ? enclosingProjectScope(current, nodes, edges) : null;

  /** 질문에 실을 노드 id — 녹음 중인 회의는 뺀다 */
  const nodeIdsToAsk = current ? excludeRecordingIds(scopeNodeIds(current, edges), edges, meetings) : [];

  const pick = (scope: ChatScope) => {
    setPinned(scope);
    setFollow(false);
  };
  /** 첫 질문을 보낼 때 지금 범위로 고정한다 */
  const lockCurrent = () => {
    if (follow && current) pick(current);
  };
  const followSelection = () => {
    setFollow(true);
    setPinned(null);
    setDismissedKey(null);
  };

  return {
    current,
    summary,
    rootTitle: (rootTitle?.data as { title?: string } | undefined)?.title?.trim() || '제목 없음',
    follow,
    pendingChange,
    pendingChangeSummary: pendingChange ? summarizeScope(pendingChange, nodes, edges) : null,
    blockedByRecording,
    recordingProject,
    recordingProjectSummary: recordingProject ? summarizeScope(recordingProject, nodes, edges) : null,
    options: buildScopeOptions(current, selectedScope, nodes, edges),
    nodeIdsToAsk,
    pick,
    lockCurrent,
    followSelection,
    applyPendingChange: () => pendingChange && pick(pendingChange),
    keepPinned: () => pendingChange && setDismissedKey(scopeKey(pendingChange)),
  };
}
