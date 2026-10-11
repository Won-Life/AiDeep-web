import client from './client';
import type { ActiveMeeting } from './types';

export type InviteBotPlatform = 'ZOOM' | 'GOOGLE_MEET';

export interface InviteBotInput {
  url: string;
  type: InviteBotPlatform;
  workspaceId: string;
  nodeId: string;
}

/*
 * CONTEXT
 * - Problem      : 서버 Bottype은 ZOOM | GOOGLE | DISCORD라 화면의 GOOGLE_MEET과 값이 다르다.
 * - Why          : 서버 값 변환은 HTTP 어댑터가 맡아 화면은 도메인 값만 쓴다.
 * - Alternatives : 화면 값을 서버 값으로 바꾸기 → 서버 이름이 UI로 새어 나온다.
 * - Trade-offs   : 응답은 botId만 돌려주며 입장 상태는 서버에 조회 API가 없어 다루지 않는다.
 * - Edge Case    : 같은 링크의 진행 중인 봇(MEETING-007), 워크스페이스/노드 없음(005/006)은 ApiError로 올라간다.
 */
export function toServerBotType(type: InviteBotPlatform): 'ZOOM' | 'GOOGLE' {
  return type === 'GOOGLE_MEET' ? 'GOOGLE' : 'ZOOM';
}

export async function inviteMeetingBot(input: InviteBotInput): Promise<string> {
  const { data } = await client.post<{ botId: string }>('/meeting/bot', {
    url: input.url,
    type: toServerBotType(input.type),
    workspaceId: input.workspaceId,
    nodeId: input.nodeId,
  });
  return data.botId;
}

/*
 * CONTEXT
 * - Problem      : 실시간 이벤트(Pub/Sub)는 구독자가 없으면 버려져, 새로고침·재접속하면 진행 중 회의를 알 수 없다.
 * - Why          : 서버의 진행 중 회의 조회(GET /meeting)로 상태를 되맞춘다.
 * - Alternatives : 이벤트만 신뢰 → 놓친 이벤트가 영구히 반영되지 않는다.
 * - Trade-offs   : 진행 중인 회의만 온다. 종료·실패한 회의는 조회에 없다.
 * - Edge Case    : 권한 없음(403)·네트워크 오류는 호출부가 무시해도 화면이 깨지지 않아야 한다.
 */
export async function getActiveMeetings(workspaceId: string): Promise<ActiveMeeting[]> {
  const { data } = await client.get<ActiveMeeting[]>('/meeting', { params: { workspaceId } });
  return Array.isArray(data) ? data : [];
}
