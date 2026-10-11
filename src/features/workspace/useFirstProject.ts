'use client';

import { useRef, useState } from 'react';
import { createWorkspace } from '@/api/workspace';
import { createProjectNode } from '@/features/graph/api/nodes';
import { getRandomColorPair } from '@/features/graph/constants/colors';

export const FIRST_WORKSPACE_TITLE = '내 워크스페이스';
export const FIRST_PROJECT_TITLE = '첫 프로젝트';

/*
 * CONTEXT
 * - Problem      : 워크스페이스가 없는 사용자가 빈 화면에서 시작할 방법이 없다.
 * - Why          : 워크스페이스를 먼저 만들고 첫 프로젝트 노드를 만든 뒤 화면이 다시 불러오도록 알린다.
 * - Alternatives : 온보딩 훅 재사용 → 화면 이동(router.replace)이라 이미 열린 워크스페이스 화면이 갱신되지 않는다.
 * - Trade-offs   : 첫 프로젝트 이름은 온보딩과 같은 기본값이며 사용자가 이후 더블클릭으로 바꾼다.
 * - Edge Case    : 워크스페이스만 만들어지고 노드 생성이 실패하면 재시도에서 같은 워크스페이스를 쓴다.
 */
export function useFirstProject(onCreated: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const workspaceId = useRef<string | null>(null);

  async function create() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      workspaceId.current ??= (await createWorkspace({ title: FIRST_WORKSPACE_TITLE, role: 'OWNER' })).workspaceId;
      const colors = getRandomColorPair();
      await createProjectNode(workspaceId.current, FIRST_PROJECT_TITLE, { x: 0, y: 0 }, { color: colors.bg, textColor: colors.text });
      onCreated();
    } catch {
      setError('프로젝트를 만들지 못했어요. 다시 시도해주세요.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return { busy, error, create };
}
