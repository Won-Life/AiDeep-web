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

// 플리 추천 프롬프트 템플릿 — 상황/분위기/메시지 자리를 빈칸으로 두고 사용자가 직접 채운다.
export const PLAYLIST_PROMPT_TEMPLATE = '  때 듣는, 분위기는 , 메시지는 인 음악 추천해줘';
// 입력 직후 커서를 첫 빈칸(맨 앞 공백 사이)에 둔다.
export const PLAYLIST_PROMPT_CARET = 1;
