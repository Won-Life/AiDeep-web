'use client';

import { useEffect, useState } from 'react';
import { getWorkspaces } from '@/api/workspace';
import type { WorkspaceListItem } from '@/api/types';
import LetterChip from '@/components/ui/LetterChip';
import { useDismissable } from '@/hooks/useDismissable';

/*
 * CONTEXT
 * - Problem      : 워크스페이스 메뉴 폭·선택 표시·행 간격이 X6 시안과 다르다.
 * - Why          : 303px 팝업과 44px 목록 행, 파란 선택 탭과 구분선으로 시안의 위계를 재현한다.
 * - Alternatives : 공통 MenuItem 수정은 프로필 등 다른 메뉴에 영향을 주므로 이 메뉴만 조정한다.
 * - Trade-offs   : 메뉴는 사이드바 밖으로 펼쳐지며 작은 화면에서는 뷰포트 폭으로 제한한다.
 * - Edge Case    : 긴 이름은 말줄임하고 현재 항목·전환·생성·설정과 Escape 닫기를 유지한다.
 */
export default function WorkspaceSwitcher({
  open,
  currentId,
  onClose,
  onSwitch,
  onNewWorkspace,
  onSettings,
}: {
  open: boolean;
  currentId: string | null;
  onClose: () => void;
  onSwitch: (ws: WorkspaceListItem) => void;
  onNewWorkspace: () => void;
  onSettings: () => void;
}) {
  const [list, setList] = useState<WorkspaceListItem[] | null>(null);

  useEffect(() => {
    if (!open) return;
    getWorkspaces()
      .then(setList)
      .catch((err) => {
        console.error('[WorkspaceSwitcher] getWorkspaces failed', err);
        setList([]);
      });
  }, [open]);

  useDismissable({ open, onClose });

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div id="workspace-switcher-menu" role="menu" aria-label="워크스페이스" className="sidebar-workspace-menu absolute top-full -left-[5px] z-50 mt-4 w-[303px] max-w-[calc(100vw-22px)] overflow-hidden rounded-[21px] border border-[#7A89FF] bg-background shadow-[0_3px_2px_rgba(53,62,112,0.16)]">

        <p className="flex h-[30px] items-center px-[13px] text-[10px] text-[#7A89FF]">
          워크스페이스
        </p>
        {list === null ? (
          <p className="px-4 py-2.5 text-[12px] text-muted">불러오는 중…</p>
        ) : (
          list.map((ws, index) => {
            const isCurrent = ws.workspaceId === currentId;
            return (
              <button
                key={ws.workspaceId}
                type="button"
                role="menuitemradio"
                aria-checked={isCurrent}
                autoFocus={isCurrent || (!currentId && index === 0)}
                onClick={() => {
                  onClose();
                  if (!isCurrent) onSwitch(ws);
                }}
                className={`sidebar-workspace-option relative flex h-11 w-full items-center gap-[11px] px-[13px] text-left text-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#7A89FF] ${
                  isCurrent ? 'bg-[#E9EDFF] font-semibold text-[#3454C3]' : 'text-[#A9B9FF] hover:bg-[#F3F5FF]'
                }`}
              >
                <LetterChip text={ws.title} fallback="W" size={29} radius={6} background={isCurrent ? 'rgb(var(--ds-main-blue-deep))' : '#C3CDFF'} />
                <span className="min-w-0 flex-1 truncate">{ws.title}</span>
              </button>
            );
          })
        )}
        <div className="border-t border-[#7A89FF] px-[13px] py-[5px]">
          <button
            type="button"
            role="menuitem"
            className="flex h-[26px] w-full items-center rounded px-[10px] text-left text-[10px] font-medium text-[#3454C3] hover:bg-[#F3F5FF]"
            onClick={() => {
              onClose();
              onNewWorkspace();
            }}
          >
            + 새 워크스페이스
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex h-[26px] w-full items-center rounded px-[10px] text-left text-[10px] font-medium text-[#3454C3] hover:bg-[#F3F5FF]"
            onClick={() => {
              onClose();
              onSettings();
            }}
          >
            워크스페이스 설정
          </button>
        </div>
      </div>
    </>
  );
}
