'use client';
import { useId } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAccountDeletionForm } from './useSettingsForms';
import { SettingsError } from './SettingsFormParts';
import type { PersonalSettings } from './usePersonalSettings';

export default function AccountDeletionModal({
  settings,
}: {
  settings: PersonalSettings;
}) {
  const id = useId();
  const form = useAccountDeletionForm();
  const { pending, error } = settings.request;
  return (
    <Modal
      isOpen
      onClose={settings.closeModal}
      labelledBy={id}
      className="settings-modal settings-delete-modal"
      closeOnBackdrop={!pending}
    >
      <h2 id={id}>계정을 삭제할까요?</h2>
      <p className="settings-hint">
        삭제하면 모든 프로젝트, 노드, 녹음 파일이 즉시 삭제되며 복구할 수
        없어요.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (form.valid) settings.deleteAccount();
        }}
      >
        <fieldset disabled={pending}>
          <label className="settings-delete-label" htmlFor={`${id}-confirm`}>
            확인을 위해 아래에 ‘계정 삭제’를 입력해주세요
          </label>
          <Input
            id={`${id}-confirm`}
            value={form.confirmation}
            onChange={(event) => form.setConfirmation(event.target.value)}
            placeholder="계정 삭제"
            className="settings-form-input"
            autoComplete="off"
          />
          <SettingsError message={error} />
          <div className="settings-form-actions">
            <Button
              variant="secondary"
              className="settings-cancel"
              disabled={pending}
              onClick={settings.closeModal}
            >
              취소
            </Button>
            <Button
              variant="danger"
              type="submit"
              loading={pending}
              disabled={!settings.api.deleteAccount || !form.valid}
            >
              삭제하기
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
