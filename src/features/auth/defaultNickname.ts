import { updateUsername } from '@/api/user';
import type { UserMeResponse } from '@/api/types';

export const DEFAULT_NICKNAME_PREFIX = '사용자';

export function hasNickname(user: Pick<UserMeResponse, 'username'>): boolean {
  return ((user.username as string | null | undefined) ?? '').trim().length > 0;
}

export function generateDefaultNickname(random: () => number = Math.random): string {
  return `${DEFAULT_NICKNAME_PREFIX}${Math.floor(1000 + random() * 9000)}`;
}

/*
 * CONTEXT
 * - Problem      : 이메일 가입 후 온보딩을 마치지 않았거나 예전에 가입한 사용자는 닉네임이 비어 있다.
 * - Why          : 비어 있으면 "사용자" + 숫자 4자리를 서버에 한 번 저장하고 이후 화면은 그 값을 쓴다.
 * - Alternatives : 화면에서만 대체 이름을 보여주기 → 저장되지 않아 다른 참여자에게는 계속 비어 보인다.
 * - Trade-offs   : 서버가 닉네임 중복을 허용해 숫자가 겹쳐도 문제 없다. 서버 가입 시 부여가 더 근본적이다.
 * - Edge Case    : 저장 실패 시 이름 없이 진행하고 다음 접속이나 재연결에서 다시 시도한다(예외를 던지지 않는다).
 */
export async function ensureNickname(
  user: UserMeResponse,
  save: (username: string) => Promise<void> = updateUsername,
  random: () => number = Math.random,
): Promise<UserMeResponse> {
  if (hasNickname(user)) return user;
  const username = generateDefaultNickname(random);
  try {
    await save(username);
    return { ...user, username };
  } catch {
    return user;
  }
}
