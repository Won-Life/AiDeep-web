export const PASSWORD_CHANGE_VALIDATION_CODES = [
  'AUTH-025', 'AUTH-026', 'CURRENT_PASSWORD_REQUIRED', 'CURRENT_PASSWORD_MISMATCH',
] as const;

export function getPasswordChangeErrorCode(code: string): string {
  if (code === 'AUTH-025') return 'CURRENT_PASSWORD_REQUIRED';
  if (code === 'AUTH-026') return 'CURRENT_PASSWORD_MISMATCH';
  return code;
}
