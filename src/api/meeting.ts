import client from './client';

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
