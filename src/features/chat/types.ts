export type ChatRole = 'assistant' | 'user';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

export type ChatStatus = 'empty' | 'sending' | 'ready' | 'error';

export const SUGGESTED_QUESTIONS = [
  '프로젝트 내용 요약해줘',
  '최근 결정사항 알려줘',
  '해야 할 일 알려줘',
  '미해결 질문 찾아줘',
] as const;
