/*
 * CONTEXT
 * - Problem      : 화면의 React Flow 노드에는 답변 근거가 될 본문이 없고, 데모 챗봇은 기존 RAG 검색 없이 최신 그래프를 전달받아야 한다.
 * - Why          : 기존 인증된 workspace sync 호출을 재사용해 그래프 snapshot을 만들고, Chat UI는 하나의 API 함수만 호출하도록 분리한다.
 * - Alternatives : 화면 state에 markdownBody를 영구 보관하면 그래프 렌더링 모델의 책임이 늘어나고, 서버 Route가 Nest sync를 다시 호출하면 브라우저 메모리 JWT를 전달해야 한다.
 * - Trade-offs   : 질문마다 sync 요청이 한 번 추가된다. 데모에서는 최신 저장 상태를 답변에 반영하는 이점이 더 크다.
 * - Edge Case    : 워크스페이스가 없거나 Route 응답이 예상 형식이 아니면 호출 실패로 처리해 기존 Chat UI의 오류·재시도 상태를 사용한다.
 */

import { getNodes } from '@/features/graph/api/getNodes';
import { DEMO_CHAT_LIMITS } from '../demoChatConfig';
import { buildGraphContext } from './graphContext';

interface DemoChatResponse {
  answer?: unknown;
}

function hasAnswer(body: DemoChatResponse): body is { answer: string } {
  return typeof body.answer === 'string' && body.answer.trim().length > 0;
}

export async function requestDemoChat(
  workspaceId: string,
  message: string,
): Promise<string> {
  const trimmedMessage = message.trim();
  if (!trimmedMessage || trimmedMessage.length > DEMO_CHAT_LIMITS.maxMessageChars) {
    throw new Error('Demo chat message is invalid');
  }

  const graph = await getNodes(workspaceId);
  const response = await fetch('/api/demo-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: trimmedMessage,
      graphContext: buildGraphContext(graph),
    }),
  });

  const body = (await response.json()) as DemoChatResponse;
  if (!response.ok || !hasAnswer(body)) {
    throw new Error('Demo chat request failed');
  }

  return body.answer.trim();
}
