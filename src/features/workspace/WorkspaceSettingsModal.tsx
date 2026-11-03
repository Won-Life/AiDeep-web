'use client';

import { useEffect, useState } from 'react';
import { deleteWorkspace, getWorkspaces, renameWorkspace } from '@/api/workspace';
import { WorkspaceDialog, WorkspaceNameField } from './WorkspaceDialogParts';
import WorkspaceDeleteConfirmModal from './WorkspaceDeleteConfirmModal';

/** 이름 변경 + (소유자만) 삭제 진입. 열 때마다 새로 마운트되어 현재 이름·권한을 다시 읽는다 */
export default function WorkspaceSettingsModal({
  open,
  workspaceId,
  onClose,
  onRenamed,
  onDeleted,
}: {
  open: boolean;
  workspaceId: string | null;
  onClose: () => void;
  onRenamed: (title: string) => void;
  onDeleted: () => void;
}) {
  if (!open || !workspaceId) return null;
  return <WorkspaceSettingsDialog workspaceId={workspaceId} onClose={onClose} onRenamed={onRenamed} onDeleted={onDeleted} />;
}

function WorkspaceSettingsDialog({ workspaceId, onClose, onRenamed, onDeleted }: {
  workspaceId: string;
  onClose: () => void;
  onRenamed: (title: string) => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState('');
  const [loadedTitle, setLoadedTitle] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 사이드바 상태(초기 로드/전환 시 비어 있을 수 있음)에 기대지 않고 직접 조회한다.
  // OWNER만 삭제 영역을 노출한다(서버도 OWNER만 허용).
  useEffect(() => {
    let cancelled = false;
    getWorkspaces()
      .then((list) => {
        const ws = list.find((item) => item.workspaceId === workspaceId);
        if (!ws || cancelled) return;
        setTitle(ws.title);
        setLoadedTitle(ws.title);
        setIsOwner(ws.role === 'OWNER');
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [workspaceId]);

  const save = async () => {
    const name = title.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      await renameWorkspace(workspaceId, name);
      onRenamed(name);
    } catch (err) {
      console.error('[WorkspaceSettingsModal] rename failed', err);
      setError('이름을 바꾸지 못했어요. 잠시 후 다시 시도해주세요.');
      setSaving(false);
    }
  };

  // 삭제 확인이 떠 있는 동안 설정 모달은 닫아 두어 배경 딤이 겹치지 않게 한다(입력 상태는 유지).
  if (confirmOpen) {
    return (
      <WorkspaceDeleteConfirmModal
        workspaceTitle={loadedTitle}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await deleteWorkspace(workspaceId);
          setConfirmOpen(false);
          onDeleted();
        }}
      />
    );
  }

  return (
    <WorkspaceDialog
      title="워크스페이스 설정"
      subtitle="이름을 바꾸거나, 워크스페이스를 삭제할 수 있어요."
      onClose={onClose}
      onSubmit={save}
      pending={saving}
      submitLabel="저장"
      submitDisabled={!title.trim()}
      error={error}
    >
      <WorkspaceNameField value={title} onChange={setTitle} />
      {isOwner && (
        <div className="rounded-[20px] border border-[#F23240] px-4 py-3">
          <p className="text-[11px] font-semibold text-[#D14040]">되돌릴 수 없는 작업</p>
          <p className="mt-0.5 text-[10px] text-gray-500">삭제하면 이 워크스페이스의 프로젝트와 노드가 모두 사라져요.</p>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="mt-2 rounded-full border border-[#F23240] px-3 py-0.5 text-[10px] font-semibold text-[#D14040] transition-colors hover:bg-red-50"
          >
            워크스페이스 삭제
          </button>
        </div>
      )}
    </WorkspaceDialog>
  );
}
