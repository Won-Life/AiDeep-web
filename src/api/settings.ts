import { getMe } from './user';
import client from './client';
import { ApiError } from './types';
import { PASSWORD_CHANGE_VALIDATION_CODES, getPasswordChangeErrorCode } from '@/features/settings/passwordChangeErrors';
import type { SettingsApi } from '@/features/settings/types';

/*
 * CONTEXT
 * - Problem      : 제공된 설정 API와 없는 API를 구분하고 비밀번호 오류를 처리해야 한다.
 * - Why          : 원격 Spring 계약의 password만 연결하며 AUTH-026을 필드 오류로 정규화한다.
 * - Alternatives : 임시 HTTP 경로 또는 mock 저장 → 운영 데이터/성공 표시 오염.
 * - Trade-offs   : 나머지는 optional capability로 남겨 가짜 저장 성공을 방지한다.
 * - Edge Case    : 비밀번호 불일치 401은 refresh하지 않지만 토큰 만료 401은 기존 큐로 처리한다.
 */
export const settingsApi: SettingsApi = {
  async loadAccount() {
    const user = await getMe();
    return { ...user, profileImageUrl: null, loginMethod: null };
  },
  async changePassword({ currentPassword, newPassword }) {
    try {
      await client.patch<string>('/auth/password', { currentPassword, newPassword }, {
        skipAuthRefreshForErrorCodes: PASSWORD_CHANGE_VALIDATION_CODES,
      });
    } catch (failure) {
      if (failure instanceof ApiError) {
        throw new ApiError(getPasswordChangeErrorCode(failure.errorCode), failure.reason, failure.data);
      }
      throw failure;
    }
  },
};
