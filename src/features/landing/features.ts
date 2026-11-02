type Asset = { src: string; width: number; height: number };

export type Feature = {
  id: string;
  title: string;
  /** 활성일 때 제목 아래에 보이는 설명 */
  description: string;
  /** 제목 위 아이콘. 그림 자체에 여백이 있어 시안 크기 그대로 쓴다 */
  icon: Asset;
  /** 활성일 때 오른쪽에 보여 주는 기능 화면 */
  image: Asset & { alt: string };
};

const BASE = '/onnode/landing/features';

export const FEATURES: readonly Feature[] = [
  {
    id: 'realtime-graph',
    title: '실시간 그래프 구조화',
    description: '회의 음성이 노드로 만들어져 마인드맵에 쌓이고, 정리가 끝나면 알려드려요.',
    icon: { src: `${BASE}/icon-graph.svg`, width: 29.93, height: 31 },
    image: {
      src: `${BASE}/graph.webp`,
      width: 812,
      height: 508,
      alt: '녹음 중인 회의가 타이틀 아래 콘텐츠 노드로 실시간으로 쌓이는 On:Node 그래프 화면',
    },
  },
  {
    id: 'meeting-bot',
    title: 'Zoom · Google Meet 봇',
    description: '회의 링크만 붙여넣으면 봇이 회의에 참여해 음성을 받아 적고, 별도 설치 없이 바로 구조화를 시작해요.',
    icon: { src: `${BASE}/icon-bot.svg`, width: 30, height: 31.15 },
    image: {
      src: `${BASE}/bot.webp`,
      width: 816,
      height: 508,
      alt: 'Zoom 또는 Google Meet을 고르고 회의 링크를 붙여넣어 회의 봇을 추가하는 화면',
    },
  },
  {
    id: 'hierarchy',
    title: '프로젝트 → 타이틀 → 콘텐츠',
    description: '회의 내용이 프로젝트별로 모이고, 안건 타이틀 아래 세부 콘텐츠로 자동 정리되어 한눈에 찾아볼 수 있어요.',
    icon: { src: `${BASE}/icon-content.svg`, width: 30.75, height: 35 },
    image: {
      src: `${BASE}/content.webp`,
      width: 813,
      height: 508,
      alt: '프로젝트와 타이틀 아래 콘텐츠 노드를 열어 핵심 개념과 자세한 설명을 확인하는 화면',
    },
  },
];
