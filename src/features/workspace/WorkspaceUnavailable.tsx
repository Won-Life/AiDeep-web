'use client';

import WorkspaceLoading from '@/components/ui/WorkspaceLoading';
import FirstProjectPrompt from './FirstProjectPrompt';

/*
 * CONTEXT
 * - Problem      : 캔버스를 열 수 없는 상태(불러오는 중 / 워크스페이스 없음)가 둘 다 스피너로 보였다.
 * - Why          : 불러오기가 끝났는데 워크스페이스가 없으면 첫 프로젝트 만들기 화면을 보여준다.
 * - Alternatives : 페이지에서 분기 → 이미 복잡한 페이지 컴포넌트의 조건이 늘어난다.
 * - Trade-offs   : 두 상태의 선택을 이 컴포넌트가 맡고 페이지는 "캔버스를 못 연다"만 판단한다.
 * - Edge Case    : 만들기가 끝나면 onCreated로 다시 불러와 로딩을 거쳐 그래프가 열린다.
 */
export default function WorkspaceUnavailable({ synced, onCreated }: { synced: boolean; onCreated: () => void }) {
  return synced ? <FirstProjectPrompt onCreated={onCreated} /> : <WorkspaceLoading />;
}
