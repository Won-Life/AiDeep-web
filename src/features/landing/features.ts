export type Feature = {
  id: string;
  title: string;
  /** 활성일 때만 보이는 설명. 시안에는 첫 항목만 있다. */
  description?: string;
  /** 오른쪽에 보여줄 기능 화면. 시안에 이미지가 아직 없어 비어 있다. */
  image?: { src: string; alt: string };
};

export const FEATURES: readonly Feature[] = [
  {
    id: 'realtime-graph',
    title: '실시간 그래프 구조화',
    description: '회의 음성이 노드로 만들어져 마인드맵에 쌓이고, 정리가 끝나면 알려드려요.',
  },
  { id: 'meeting-bot', title: 'Zoom · Google Meet 봇' },
  { id: 'hierarchy', title: '프로젝트 → 타이틀 → 콘텐츠' },
];
