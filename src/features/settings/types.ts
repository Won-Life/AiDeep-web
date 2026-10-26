export type SettingsTab = 'account' | 'general' | 'subscription';
export type SettingsModal =
  | 'nickname'
  | 'profile'
  | 'password'
  | 'delete'
  | null;
export type SettingsTheme = 'light' | 'dark' | 'system';
export interface SettingsAccount {
  userId: string;
  username: string;
  email: string;
  profileImageUrl: string | null;
  loginMethod: 'EMAIL' | 'GOOGLE' | null;
}
export interface GeneralSettings {
  language: 'ko';
  theme: SettingsTheme;
  startView: 'overview';
  emailNotifications: boolean;
}
export interface SettingsSubscription {
  plan: 'FREE' | 'PRO';
  nodeCount: number;
  chatCount: number;
  recordingMinutes: number;
}
export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}
/*
 * CONTEXT
 * - Problem      : 서버별 DTO/경로는 아직 확정되지 않았다.
 * - Why          : 화면은 도메인 값만 사용하고 HTTP 변환은 src/api/settings.ts에 둔다.
 * - Alternatives : 가짜 성공 응답 → 실제 저장 여부와 화면이 어긋난다.
 * - Trade-offs   : 미제공 동작은 optional capability로 저장 버튼만 비활성화한다.
 * - Edge Case    : 삭제는 성공 응답 전 계정/토큰을 제거하지 않는다.
 */
export interface SettingsApi {
  loadAccount: () => Promise<SettingsAccount>;
  loadGeneral?: () => Promise<GeneralSettings>;
  loadSubscription?: () => Promise<SettingsSubscription>;
  updateNickname?: (username: string) => Promise<SettingsAccount>;
  updateProfile?: (image: Blob | null) => Promise<SettingsAccount>;
  changePassword?: (values: PasswordChange) => Promise<void>;
  deleteAccount?: () => Promise<void>;
  saveGeneral?: (settings: GeneralSettings) => Promise<GeneralSettings>;
}
/*
 * CONTEXT
 * - Problem      : 다크 디자인이 공식 확정되지 않은 상태에서 기기 설정에 따라 적용된다.
 * - Why          : 설정 초기값은 공식 라이트 디자인을 사용한다.
 * - Alternatives : 시스템 기본값은 기기의 다크 설정을 자동으로 반영한다.
 * - Trade-offs   : 기본값에서는 기기의 테마 설정을 따르지 않는다.
 * - Edge Case    : 추후 서버에서 불러오는 명시적인 테마 선택은 그대로 유지한다.
 */
export const defaultGeneralSettings: GeneralSettings = {
  language: 'ko',
  theme: 'light',
  startView: 'overview',
  emailNotifications: false,
};
