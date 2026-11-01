type Box = { left: number; top: number };

export type PainPoint = {
  id: string;
  title: string;
  /** 시안에서 줄바꿈한 위치 그대로 */
  lines: readonly string[];
  image: { src: string; width: number; height: number } & Box;
  titlePos: Box;
  bodyPos: Box;
};

/* 일러스트마다 손으로 배치된 시안이라, 카드(304×234) 안의 위치를 값으로 둔다. */
export const PAIN_POINTS: readonly PainPoint[] = [
  {
    id: 'memory',
    title: '회의가 끝나면 기억이 안 나요',
    lines: ['무슨 얘기가 오갔는지,', '결론이 뭐였는지 금세 흐릿해져요.'],
    image: { src: '/onnode/landing/pain-memory.png', width: 113, height: 95, left: 94, top: 21 },
    titlePos: { left: 43, top: 127 },
    bodyPos: { left: 43, top: 164 },
  },
  {
    id: 'recording',
    title: '녹음 파일은 다시 안 들어요',
    lines: ['긴 녹음을 처음부터 다시 듣는 건', '너무 비효율적이에요.'],
    image: { src: '/onnode/landing/pain-recording.png', width: 105, height: 87, left: 99, top: 30 },
    titlePos: { left: 52, top: 132 },
    bodyPos: { left: 39, top: 165 },
  },
  {
    id: 'organize',
    title: '정리는 결국 내 몫이에요',
    lines: ['회의가 끝나고 나서 노트를 다시', '정리하느라 시간이 두 배로 들어요.'],
    image: { src: '/onnode/landing/pain-organize.png', width: 125, height: 101, left: 89, top: 21 },
    titlePos: { left: 49, top: 132 },
    bodyPos: { left: 49, top: 165 },
  },
  {
    id: 'scatter',
    title: '자료가 여기저기 흩어져요',
    lines: ['슬라이드, 판서 사진, 링크가', '각자 다른 곳에 있어요.'],
    image: { src: '/onnode/landing/pain-scatter.png', width: 125, height: 119, left: 90, top: 7 },
    titlePos: { left: 53, top: 132 },
    bodyPos: { left: 53, top: 159 },
  },
];
