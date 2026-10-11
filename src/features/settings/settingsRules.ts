import { isSignupPasswordValid } from '../auth/signupRules';
import type { PasswordChange } from './types';

export function isNicknameValid(value: string) {
  return /^[가-힣a-zA-Z0-9]{2,12}$/.test(value.trim());
}
export function getProfileFileError(file: Pick<File, 'type' | 'size'>): string {
  if (!['image/jpeg', 'image/png'].includes(file.type))
    return 'JPG, PNG 파일만 올릴 수 있어요';
  if (file.size > 5 * 1024 * 1024)
    return '파일이 너무 커요. 5MB 이하 JPG, PNG만 올릴 수 있어요';
  if (!file.size) return '비어 있는 파일은 올릴 수 없어요';
  return '';
}
export function isPasswordChangeValid(values: PasswordChange, confirm: string) {
  return (
    Boolean(values.currentPassword) &&
    isSignupPasswordValid(values.newPassword) &&
    values.newPassword === confirm &&
    values.newPassword !== values.currentPassword
  );
}
export function isAccountDeletionConfirmed(value: string) {
  return value === '계정 삭제';
}
export function getCenterCrop(width: number, height: number, zoom: number) {
  const side = Math.min(width, height) / Math.min(3, Math.max(1, zoom));
  return { x: (width - side) / 2, y: (height - side) / 2, side };
}
