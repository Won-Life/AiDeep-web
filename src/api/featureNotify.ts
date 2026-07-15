import client from './client';

export type NotifyFeature =
  | 'AI_SUMMARY'
  | 'AI_CHATBOT'
  | 'AI_AUTO_STRUCTURE'
  | 'WORD_DICTIONARY';

/** 미완성 기능 완성 알림 신청 — 서버가 JWT의 유저 이메일을 저장한다. 중복 신청은 서버에서 idempotent 처리. */
export async function requestFeatureNotify(feature: NotifyFeature): Promise<void> {
  await client.post('/feature-notify', { feature });
}
