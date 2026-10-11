'use client';
import { useId } from 'react';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';
import { isSignupPasswordValid } from '@/features/auth/signupRules';
import { usePasswordChangeForm } from './useSettingsForms';
import {
  SettingsError,
  SettingsField,
  SettingsFormActions,
} from './SettingsFormParts';
import type { PersonalSettings } from './usePersonalSettings';

export default function PasswordChangeModal({
  settings,
}: {
  settings: PersonalSettings;
}) {
  const id = useId();
  const form = usePasswordChangeForm();
  const { pending, error, errorCode } = settings.request;
  const currentInvalid = errorCode === 'CURRENT_PASSWORD_MISMATCH';
  return (
    <Modal
      isOpen
      onClose={settings.closeModal}
      labelledBy={id}
      className="settings-modal"
      closeOnBackdrop={!pending}
    >
      <h2 id={id}>비밀번호 변경</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (form.valid) settings.changePassword(form.values);
        }}
      >
        <fieldset disabled={pending}>
          <SettingsField
            label="현재 비밀번호"
            type="password"
            autoComplete="current-password"
            placeholder="현재 비밀번호를 입력하세요"
            value={form.currentPassword}
            onChange={(event) => {
              form.setCurrentPassword(event.target.value);
              settings.request.clearError();
            }}
            required
            invalid={currentInvalid}
            hint={
              currentInvalid ? '현재 비밀번호가 일치하지 않습니다' : undefined
            }
          />
          {!currentInvalid && <SettingsError message={error} />}
          <SettingsField
            label="새 비밀번호"
            type="password"
            autoComplete="new-password"
            placeholder="8자 이상 입력하세요"
            value={form.newPassword}
            onChange={(event) => form.setNewPassword(event.target.value)}
            required
            invalid={
              Boolean(form.newPassword) &&
              !isSignupPasswordValid(form.newPassword)
            }
            hint="영문, 숫자, 특수문자를 포함해 8자 이상"
          />
          <SettingsField
            label="새 비밀번호 확인"
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호를 한번 더 입력하세요"
            value={form.confirm}
            onChange={(event) => form.setConfirm(event.target.value)}
            required
            invalid={form.mismatch}
            hint={
              form.mismatch
                ? '비밀번호가 일치하지 않습니다'
                : form.newPassword && form.newPassword === form.currentPassword
                  ? '현재 비밀번호와 다른 비밀번호를 입력해주세요'
                  : undefined
            }
          />
          {pending ? (
            <span className="settings-forgot">현재 비밀번호를 잊으셨나요?</span>
          ) : (
            <Link href="/forgot-password" className="settings-forgot">
              현재 비밀번호를 잊으셨나요?
            </Link>
          )}
          <SettingsFormActions
            onCancel={settings.closeModal}
            label="변경하기"
            pending={pending}
            disabled={!settings.api.changePassword || !form.valid}
          />
        </fieldset>
      </form>
    </Modal>
  );
}
