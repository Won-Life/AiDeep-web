'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import { WorkspaceDialog } from './WorkspaceDialogParts';

// 되돌릴 수 없는 작업이라 "이름 입력 일치" 확인을 요구한다(실수 삭제 방지).
// 조건부 마운트(호출부에서 confirmOpen && ...)로 열 때마다 fresh 상태 → 리셋 effect 불필요.
export default function WorkspaceDeleteConfirmModal({
  workspaceTitle,
  onClose,
  onConfirm,
}: {
  workspaceTitle: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matched = confirmText.trim() === workspaceTitle.trim();
  const submit = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setError(
        status === 403
          ? '소유자만 삭제할 수 있어요.'
          : status === 400
            ? '워크스페이스는 최소 한 개가 남아 있어야 해요.'
            : '삭제에 실패했어요. 잠시 후 다시 시도해주세요.',
      );
      setDeleting(false);
    }
  };

  return (
    <WorkspaceDialog
      title={`‘${workspaceTitle}’를 삭제할까요?`}
      subtitle="이 워크스페이스의 프로젝트와 노드가 모두 삭제되고, 되돌릴 수 없어요."
      onClose={onClose}
      onSubmit={submit}
      pending={deleting}
      submitLabel="삭제"
      submitVariant="danger"
      submitDisabled={!matched}
      error={error}
    >
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-foreground">확인을 위해 워크스페이스 이름을 입력해주세요</p>
        <Input
          data-autofocus
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder="워크스페이스 이름 입력"
          aria-label="삭제할 워크스페이스 이름 확인"
          autoComplete="off"
          className="!h-9 !rounded-full !px-4 !text-[12px]"
        />
        <p className="mt-1.5 text-[10px] text-gray-500">이름이 일치해야 삭제 버튼이 켜져요.</p>
      </div>
    </WorkspaceDialog>
  );
}
