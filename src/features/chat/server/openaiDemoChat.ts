/*
 * CONTEXT
 * - Problem      : 데모 챗봇은 기존 RAG 검색 threshold에 의존하지 않고, 전달받은 그래프 컨텍스트로 답변해야 한다.
 * - Why          : OpenAI 호출을 서버 전용 모듈로 격리해 API 키를 브라우저 번들에 포함하지 않고, 이후 AI-BE 연동으로 교체할 지점을 하나로 제한한다.
 * - Alternatives : 브라우저에서 OpenAI를 직접 호출하는 방식은 키가 노출되고, Nest에 데모 Controller를 추가하는 방식은 이번 Web 단독 데모 범위를 벗어난다.
 * - Trade-offs   : 이 모듈은 데모 전용 Route Handler에만 사용된다. 데모 종료 후 Route와 함께 제거하거나 기존 RAG client로 교체한다.
 * - Edge Case    : OpenAI 설정 누락, 비정상 응답, 네트워크 실패는 호출자에게 세부 정보를 노출하지 않고 구분 가능한 오류로 전달한다.
 */

import { DEMO_CHAT_LIMITS } from '../demoChatConfig';

export interface DemoChatInput {
  message: string;
  graphContext: string;
}

export interface DemoChatReply {
  answer: string;
}

export class DemoChatConfigurationError extends Error {
  constructor() {
    super('Demo chat is not configured');
    this.name = 'DemoChatConfigurationError';
  }
}

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

const DEVELOPER_INSTRUCTIONS = [
  '당신은 AiDeep 프로젝트 그래프를 설명하는 한국어 도우미입니다.',
  '반드시 제공된 그래프 컨텍스트만 근거로 답변하세요.',
  '컨텍스트에 근거가 없으면 추측하지 말고, 그래프에서 확인할 수 없다고 답변하세요.',
  '답변은 사용자가 바로 이해할 수 있도록 간결하게 작성하세요.',
].join('\n');

interface OpenAiResponsesPayload {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      type?: unknown;
      text?: unknown;
    }>;
  }>;
}

function readAnswer(payload: OpenAiResponsesPayload): string | null {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string' && content.text.trim()) {
        return content.text.trim();
      }
    }
  }

  return null;
}

export async function createDemoChatReply({
  message,
  graphContext,
}: DemoChatInput): Promise<DemoChatReply> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_CHAT_MODEL;

  if (process.env.DEMO_OPENAI_CHAT_ENABLED !== 'true' || !apiKey || !model) {
    throw new DemoChatConfigurationError();
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: DEMO_CHAT_LIMITS.maxOutputTokens,
      input: [
        { role: 'developer', content: DEVELOPER_INSTRUCTIONS },
        {
          role: 'user',
          content: `그래프 컨텍스트:\n${graphContext}\n\n사용자 질문:\n${message}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as OpenAiResponsesPayload;
  const answer = readAnswer(payload);

  if (!answer) {
    throw new Error('OpenAI response did not include output_text');
  }

  return { answer };
}
