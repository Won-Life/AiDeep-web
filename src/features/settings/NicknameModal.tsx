'use client';
import { useId } from 'react';
import Modal from '@/components/ui/Modal';
import { useNicknameForm } from './useSettingsForms';
import {
  SettingsError,
  SettingsField,
  SettingsFormActions,
} from './SettingsFormParts';
import type { PersonalSettings } from './usePersonalSettings';

export default function NicknameModal({
  settings,
}: {
  settings: PersonalSettings;
}) {
  const id = useId();
  const form = useNicknameForm(settings.account?.username ?? '');
  const { pending, error } = settings.request;
  return (
    <Modal
      isOpen
      onClose={settings.closeModal}
      labelledBy={id}
      className="settings-modal settings-nickname-modal"
      closeOnBackdrop={!pending}
    >
      <h2 id={id}>닉네임 수정</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (form.valid) settings.updateNickname(form.value.trim());
        }}
      >
        <fieldset disabled={pending}>
          <SettingsField
            label="닉네임"
            value={form.value}
            maxLength={12}
            onChange={(event) => form.setValue(event.target.value)}
            invalid={Boolean(form.value) && !form.valid}
            hint="2~12자, 한글, 영문, 숫자 사용 가능"
            autoComplete="nickname"
            required
          />
          <SettingsError message={error} />
          <SettingsFormActions
            onCancel={settings.closeModal}
            label="저장"
            pending={pending}
            disabled={
              !settings.api.updateNickname ||
              !form.valid ||
              form.value.trim() === settings.account?.username
            }
          />
        </fieldset>
      </form>
    </Modal>
  );
}
