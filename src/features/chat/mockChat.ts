import type { ChatMessage } from './types';

const MOCK_RESPONSES: Record<string, string> = {
  '프로젝트 내용 요약해줘': '프로젝트의 주요 기록을 한눈에 정리해드릴게요. 현재 그래프에는 기획, 운영, 예산과 관련된 논의가 연결되어 있습니다.',
  '최근 결정사항 알려줘': '최근에는 행사 운영 범위와 홍보 방향을 우선 확정했고, 세부 일정과 담당자 배정은 다음 논의에서 이어가기로 했습니다.',
  '해야 할 일 알려줘': '현재 확인할 일은 세 가지예요. 행사 일정 정리, 담당자별 준비 항목 확인, 홍보 자료 검토입니다.',
  '미해결 질문 찾아줘': '아직 결정되지 않은 항목으로는 최종 일정, 예산 배분, 외부 협업 범위가 보입니다.',
};

export async function getMockChatReply(question: string): Promise<ChatMessage> {
  await new Promise((resolve) => setTimeout(resolve, 850));
  return {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: MOCK_RESPONSES[question] ?? '현재는 UI 검증용 목업 답변을 보여드리고 있어요. API 연동 후에는 그래프에 쌓인 프로젝트 기록을 바탕으로 답변할게요.',
  };
}
