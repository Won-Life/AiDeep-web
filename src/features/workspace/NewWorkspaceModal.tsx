'use client';

import { useState } from 'react';
import { createWorkspace } from '@/api/workspace';
import { WorkspaceDialog, WorkspaceNameField } from './WorkspaceDialogParts';

/** 열 때마다 새로 마운트되어 입력이 비워진 상태로 시작한다 */
export default function NewWorkspaceModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (workspaceId: string, title: string) => void;
}) {
  if (!open) return null;
  return <NewWorkspaceDialog onClose={onClose} onCreated={onCreated} />;
}

function NewWorkspaceDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (workspaceId: string, title: string) => void }) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const name = title.trim();
    if (!name) return;
    setSubmitting(true);
    setError(null);
    try {
      const { workspaceId } = await createWorkspace({ title: name, role: 'OWNER' });
      onCreated(workspaceId, name);
    } catch (err) {
      console.error('[NewWorkspaceModal] createWorkspace failed', err);
      setError('만들지 못했어요. 잠시 후 다시 시도해주세요.');
      setSubmitting(false);
    }
  };

  return (
    <WorkspaceDialog
      title="새 워크스페이스"
      subtitle="과목, 사이드 프로젝트처럼 따로 모아두고 싶은 주제마다 만들어보세요."
      onClose={onClose}
      onSubmit={submit}
      pending={submitting}
      submitLabel="만들기"
      submitDisabled={!title.trim()}
      error={error}
    >
      <WorkspaceNameField value={title} onChange={setTitle} placeholder="새 워크스페이스" />
    </WorkspaceDialog>
  );
}
