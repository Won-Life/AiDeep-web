import { NextResponse } from 'next/server';
import {
  createDemoChatReply,
  DemoChatConfigurationError,
} from '@/features/chat/server/openaiDemoChat';
import { DEMO_CHAT_LIMITS } from '@/features/chat/demoChatConfig';

export const runtime = 'nodejs';

interface DemoChatRequestBody {
  message?: unknown;
  graphContext?: unknown;
}

const requestTimestamps = new Map<string, number[]>();
const REQUEST_WINDOW_MS = 60_000;

function getRequestKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

function isRateLimited(request: Request): boolean {
  const key = getRequestKey(request);
  const now = Date.now();
  const timestamps = (requestTimestamps.get(key) ?? []).filter(
    (timestamp) => now - timestamp < REQUEST_WINDOW_MS,
  );

  if (timestamps.length >= DEMO_CHAT_LIMITS.maxRequestsPerMinute) {
    requestTimestamps.set(key, timestamps);
    return true;
  }

  requestTimestamps.set(key, [...timestamps, now]);
  return false;
}

function isDemoChatRequest(body: DemoChatRequestBody): body is {
  message: string;
  graphContext: string;
} {
  return typeof body.message === 'string' && typeof body.graphContext === 'string';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DemoChatRequestBody;

    if (!isDemoChatRequest(body)) {
      return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 400 });
    }

    if (
      !body.message.trim()
      || body.message.length > DEMO_CHAT_LIMITS.maxMessageChars
      || body.graphContext.length > DEMO_CHAT_LIMITS.maxGraphContextChars
    ) {
      return NextResponse.json({ message: '요청 크기가 제한을 초과했습니다.' }, { status: 400 });
    }

    if (isRateLimited(request)) {
      return NextResponse.json({ message: '잠시 후 다시 시도해주세요.' }, { status: 429 });
    }

    const reply = await createDemoChatReply(body);
    return NextResponse.json(reply);
  } catch (error) {
    if (error instanceof DemoChatConfigurationError) {
      console.error('[demo-chat] OpenAI configuration is missing');
      return NextResponse.json({ message: '채팅을 준비 중입니다.' }, { status: 503 });
    }

    console.error('[demo-chat] request failed', error);
    return NextResponse.json(
      { message: '답변을 불러오지 못했어요. 잠시 후 다시 시도해주세요.' },
      { status: 502 },
    );
  }
}
