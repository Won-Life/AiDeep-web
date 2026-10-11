import { getMe } from './user';
import client from './client';
import { ApiError } from './types';
import { PASSWORD_CHANGE_VALIDATION_CODES, getPasswordChangeErrorCode } from '@/features/settings/passwordChangeErrors';
import type { SettingsApi } from '@/features/settings/types';

/*
 * CONTEXT
 * - Problem      : 제공된 설정 API와 없는 API를 구분하고 비밀번호 오류를 처리해야 한다.
 * - Why          : 배포 Spring 계약에 있는 password·username·me 삭제만 연결하고 AUTH-026을 필드 오류로 정규화한다.
 * - Alternatives : 임시 HTTP 경로 또는 mock 저장 → 운영 데이터/성공 표시 오염.
 * - Trade-offs   : 사진·일반 설정은 optional capability로 남겨 가짜 저장 성공을 방지한다.
 * - Edge Case    : 비밀번호 불일치 401은 refresh하지 않지만 토큰 만료 401은 기존 큐로 처리한다.
 *                  닉네임 변경 응답은 문자열이라 성공 뒤 /user/me를 다시 읽는다.
 *                  로그인 방식은 연동된 OAuth 계정에 구글이 있으면 GOOGLE, 없으면 EMAIL이며 조회 실패 시 알 수 없음(null)이다.
 *                  계정 삭제는 소유 워크스페이스가 있으면 AUTH-033(409)이며 서버 사유를 그대로 보여준다.
 */
async function loadLoginMethod() {
  try {
    const { data: links } = await client.get<{ provider: string }[]>('/auth/oauth/links');
    return links.some((link) => link.provider.toUpperCase() === 'GOOGLE') ? 'GOOGLE' : 'EMAIL';
  } catch {
    return null;
  }
}

async function loadAccount() {
  const [user, loginMethod] = await Promise.all([getMe(), loadLoginMethod()]);
  return { ...user, profileImageUrl: null, loginMethod };
}

export const settingsApi: SettingsApi = {
  loadAccount,
  async updateNickname(username) {
    await client.patch<string>('/auth/username', { username });
    return loadAccount();
  },
  async deleteAccount() {
    await client.delete<string>('/auth/me');
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
