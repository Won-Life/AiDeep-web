export type Target = {
  id: string;
  title: string;
  description: string;
  image: {
    src: string;
    /** 원본 픽셀(2배 그림). 화면에는 카드 폭에 대한 비율로 놓는다 */
    width: number;
    height: number;
    /** 카드 폭(548px)에 대한 왼쪽 위치·폭의 %, 카드 위쪽에서의 px */
    leftPct: number;
    widthPct: number;
    top: number;
  };
};

/* 일러스트가 카드 위로 살짝 삐져나오는 시안이라 카드(548×472) 기준 위치를 값으로 둔다. */
export const TARGETS: readonly Target[] = [
  {
    id: 'students',
    title: '팀플 · 프로젝트를 하는 대학생',
    description: '수업·팀 회의 내용과 자료를 프로젝트별 마인드맵 한곳에서 확인해요.',
    image: { src: '/onnode/landing/target-students.webp', width: 774, height: 722, leftPct: 14.6, widthPct: 70.6, top: -9 },
  },
  {
    id: 'worker',
    title: '사이드 프로젝트를 하는 직장인',
    description: '퇴근 후 짧은 회의도 녹음 한 번이면 노드로 정리돼요.',
    image: { src: '/onnode/landing/target-worker.webp', width: 862, height: 748, leftPct: 10.6, widthPct: 78.6, top: -22 },
  },
];
