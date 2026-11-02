/*
 * 회의 녹음 체험의 샘플 재생(서버와 통신하지 않는 순수 함수).
 * 경과 시간(ms)만 알면 그 순간 자막과 노드 상태가 정해진다. 화면은 이 값을 그리기만 한다.
 */
export type SampleLine = { speaker: string; text: string; label: string };

/** 특정 수업·회의에 묶이지 않는 일반 회의 메모. 사용자가 만든 프로젝트·타이틀 아래에서 재생된다 */
export const SAMPLE_LINES: readonly SampleLine[] = [
  { speaker: '참석자 1', text: '이번 주 안에 첫 화면을 마무리하기로 했어요.', label: '결정 사항' },
  { speaker: '참석자 2', text: '버튼 위치가 헷갈린다는 의견이 있어서 다시 이야기했어요.', label: '논의 내용' },
  { speaker: '참석자 1', text: '자료는 금요일까지 각자 맡은 부분을 정리해 와요.', label: '할 일' },
];

const FIRST_LINE_MS = 500;
const LINE_GAP_MS = 3200;
/** 대사가 나온 뒤 점선 노드가 생기기까지 / 노드가 확정되기까지 */
const GENERATING_AFTER_MS = 1200;
const CONFIRMED_AFTER_MS = 2600;
/** 자막이 떠 있는 시간(다음 대사 전에 잠깐 비운다) */
const CAPTION_MS = 2800;
const TAIL_MS = 700;

export const RECORDING_MS = FIRST_LINE_MS + (SAMPLE_LINES.length - 1) * LINE_GAP_MS + CONFIRMED_AFTER_MS + TAIL_MS;

export type RecordPhase = 'idle' | 'playing' | 'done';

export type FrameNode = { label: string; state: 'generating' | 'confirmed' };

export type RecordingFrame = {
  /** 지금 떠 있는 자막. 없으면 null */
  caption: SampleLine | null;
  /** 지금까지 나온 대사 수 */
  spoken: number;
  /** 만들어졌거나 만드는 중인 노드(대사 순서) */
  nodes: readonly FrameNode[];
  /** 녹음 경과 초 */
  seconds: number;
};

const startOf = (index: number) => FIRST_LINE_MS + index * LINE_GAP_MS;

export function recordingFrame(elapsedMs: number): RecordingFrame {
  const elapsed = Math.min(Math.max(elapsedMs, 0), RECORDING_MS);
  const nodes: FrameNode[] = [];
  let caption: SampleLine | null = null;
  let spoken = 0;

  SAMPLE_LINES.forEach((line, index) => {
    const since = elapsed - startOf(index);
    if (since < 0) return;
    spoken = index + 1;
    if (since < CAPTION_MS) caption = line;
    if (since >= CONFIRMED_AFTER_MS) nodes.push({ label: line.label, state: 'confirmed' });
    else if (since >= GENERATING_AFTER_MS) nodes.push({ label: line.label, state: 'generating' });
  });

  return { caption, spoken, nodes, seconds: Math.floor(elapsed / 1000) };
}

/** 00:03 꼴 */
export function formatClock(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** 왼쪽 패널에 보여 줄 진행 문구 */
export function progressLabel(frame: RecordingFrame): string {
  if (frame.spoken === 0) return '녹음을 시작했어요';
  const confirmed = frame.nodes.filter((node) => node.state === 'confirmed').length;
  if (confirmed === SAMPLE_LINES.length) return '노드 정리를 마쳤어요';
  return `대사 ${frame.spoken}/${SAMPLE_LINES.length} · 노드 만드는 중`;
}
