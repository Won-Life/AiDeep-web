'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createWorkspace, getWorkspaces } from '@/api/workspace';
import { createProjectNode } from '@/features/graph/api/nodes';
import { getRandomColorPair } from '@/features/graph/constants/colors';

/*
 * CONTEXT
 * - Problem      : 새 계정은 워크스페이스가 없어 기본 화면에서 대기할 수 있다.
 * - Why          : 완료 화면의 액션에서 기존 생성 API를 재사용한다.
 * - Alternatives : 가입 도중 생성 → 온보딩 전에 불필요한 작업을 시작한다.
 * - Trade-offs   : 첫 프로젝트 선택 시에만 프로젝트 노드를 생성한다.
 * - Edge Case    : 실패 후 재시도에서 생성된 워크스페이스와 노드를 재사용한다.
 */
export function useOnboardingWorkspace() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const workspaceId = useRef<string | null>(null);
  const nodeCreated = useRef(false);
  async function enter(createProject: boolean) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      if (!workspaceId.current) {
        const workspaces = await getWorkspaces();
        workspaceId.current = workspaces.find((workspace) => workspace.role !== 'VIEWER')?.workspaceId
          ?? (await createWorkspace({ title: '내 워크스페이스', role: 'OWNER' })).workspaceId;
      }
      if (createProject && !nodeCreated.current) {
        const colors = getRandomColorPair();
        await createProjectNode(workspaceId.current, '첫 프로젝트', { x: 0, y: 0 }, { color: colors.bg, textColor: colors.text });
        nodeCreated.current = true;
      }
      router.replace(`/workspace?workspaceId=${encodeURIComponent(workspaceId.current)}`);
    } catch { setError('프로젝트를 준비하지 못했어요. 다시 시도해주세요.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return { busy, error, enter };
}
