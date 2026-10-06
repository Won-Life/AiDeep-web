import { getMe } from './user';
import type { SettingsApi } from '@/features/settings/types';

/*
 * CONTEXT
 * - Problem      : 계정 조회와 아직 제공되지 않은 설정 저장 API를 구분해야 한다.
 * - Why          : 기존 getMe 조회만 재사용하고 저장은 확인된 계약에 따라 연결한다.
 * - Alternatives : 임시 HTTP 경로 또는 mock 저장 → 운영 데이터/성공 표시 오염.
 * - Trade-offs   : 나머지는 optional capability로 남겨 가짜 저장 성공을 방지한다.
 * - Edge Case    : DTO에 없는 사진 및 로그인 방식은 임의로 추정하지 않는다.
 */
export const settingsApi: SettingsApi = {
  async loadAccount() {
    const user = await getMe();
    return { ...user, profileImageUrl: null, loginMethod: null };
  },
};
