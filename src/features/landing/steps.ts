export type Step = { id: string; title: string; description: string };

export const STEPS: readonly Step[] = [
  {
    id: 'create',
    title: '프로젝트와 타이틀 만들기',
    description: '과목이나 파트별로 프로젝트 노드를 만들고, 그 아래 수업·회의 날짜별로 타이틀을 추가해요.',
  },
  {
    id: 'invite-bot',
    title: '회의 링크로 봇 추가',
    description: 'Zoom 또는 Google Meet 링크를 붙여넣으면 봇이 입장해 녹음해요.',
  },
  {
    id: 'review',
    title: '노드로 정리된 결과 확인',
    description: '종료 후 자동 생성된 노드를 열어 내용을 확인하고, 자료도 붙일 수 있어요.',
  },
];
