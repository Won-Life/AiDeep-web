'use client';
import { useState } from 'react';
import {
  isNicknameValid,
  isPasswordChangeValid,
  isAccountDeletionConfirmed,
} from './settingsRules';

export function useNicknameForm(initial: string) {
  const [value, setValue] = useState(initial);
  return { value, setValue, valid: isNicknameValid(value) };
}
export function usePasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const values = { currentPassword, newPassword };
  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirm,
    setConfirm,
    values,
    valid: isPasswordChangeValid(values, confirm),
    mismatch: Boolean(confirm) && newPassword !== confirm,
  };
}
export function useAccountDeletionForm() {
  const [confirmation, setConfirmation] = useState('');
  return {
    confirmation,
    setConfirmation,
    valid: isAccountDeletionConfirmed(confirmation),
  };
}
