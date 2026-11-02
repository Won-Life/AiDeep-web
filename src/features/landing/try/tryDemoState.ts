/*
 * 직접 체험의 상태 규칙(서버와 통신하지 않는 순수 함수). 화면은 이 값을 그리기만 한다.
 * 단계는 순서대로 열린다: 프로젝트 → 타이틀 → 콘텐츠. 회의 녹음 체험은 타이틀만 있으면 열 수 있다
 * (콘텐츠를 건너뛰어도 된다).
 */
import { SAMPLE_LINES, type RecordPhase } from './tryRecording';

export type StepId = 'project' | 'title' | 'content' | 'record';

export const STEP_ORDER: readonly StepId[] = ['project', 'title', 'content', 'record'];

/** 입력으로 노드를 만드는 단계 수(그 뒤는 회의 녹음 체험) */
export const INTERACTIVE_STEPS = 3;

const CONTENT_INDEX = 2;
const RECORD_INDEX = 3;

/** 직접 만들 수 있는 콘텐츠 노드 수. 샘플 노드와 합쳐 캔버스 칸 수가 정해진다 */
export const MAX_CONTENTS = 2;

/** 캔버스에 놓을 수 있는 콘텐츠 칸 수(직접 만든 것 + 샘플 재생) */
export const CONTENT_SLOTS = MAX_CONTENTS + SAMPLE_LINES.length;

/** 노드 안에 한 줄로 들어가는 글자 수 */
export const MAX_LABEL = { project: 10, title: 16, content: 18 } as const;

export type DemoData = {
  project: string;
  title: string;
  contents: readonly string[];
};

export const EMPTY_DEMO: DemoData = { project: '', title: '', contents: [] };

/** 앞뒤 공백을 지우고 연속 공백을 하나로 줄인다. 공백뿐이면 빈 문자열 */
export function normalizeLabel(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/** 끝낸 단계 수(0~3). 앞 단계가 비어 있으면 뒤 단계 값은 세지 않는다 */
export function completedSteps(data: DemoData): number {
  if (!data.project) return 0;
  if (!data.title) return 1;
  if (data.contents.length === 0) return 2;
  return 3;
}

/** 단계를 열 수 있는가: 바로 앞 단계까지 끝내야 한다. 회의 녹음 체험은 타이틀만 있으면 된다 */
export function isStepUnlocked(data: DemoData, index: number): boolean {
  if (index === RECORD_INDEX) return completedSteps(data) >= CONTENT_INDEX;
  return index < INTERACTIVE_STEPS && index <= completedSteps(data);
}

export type StepStatus = 'locked' | 'todo' | 'done' | 'skipped';

/** 단계 표시: 잠김 / 할 차례 / 끝남 / 건너뜀(콘텐츠 없이 녹음을 시작한 경우) */
export function stepStatus(data: DemoData, phase: RecordPhase, index: number): StepStatus {
  if (!isStepUnlocked(data, index)) return 'locked';
  if (index === RECORD_INDEX) return phase === 'done' ? 'done' : 'todo';
  if (index < completedSteps(data)) return 'done';
  return index === CONTENT_INDEX && phase !== 'idle' ? 'skipped' : 'todo';
}

/**
 * 단계에 입력을 반영한다. 반영할 수 없으면(빈 입력, 앞 단계 미완료, 자리 없음) 같은 객체를 돌려준다.
 * 프로젝트·타이틀은 다시 입력하면 이름이 바뀌고, 콘텐츠는 한 개씩 더해진다.
 */
export function applyStepInput(data: DemoData, step: StepId, raw: string): DemoData {
  const label = normalizeLabel(raw);
  if (!label) return data;

  switch (step) {
    case 'project':
      return { ...data, project: label.slice(0, MAX_LABEL.project) };
    case 'title':
      return data.project ? { ...data, title: label.slice(0, MAX_LABEL.title) } : data;
    case 'content':
      if (!data.title || data.contents.length >= MAX_CONTENTS) return data;
      return { ...data, contents: [...data.contents, label.slice(0, MAX_LABEL.content)] };
    default:
      return data;
  }
}

/**
 * 입력 뒤 열어 둘 단계: 새로 끝낸 단계가 있고 다음이 입력 단계면 다음으로,
 * 콘텐츠를 직접 만들 수 있는 만큼 다 만들었으면 회의 녹음 체험으로, 아니면 그대로
 */
export function nextOpenStep(before: DemoData, after: DemoData, index: number): number {
  const filled = after.contents.length >= MAX_CONTENTS && after.contents.length > before.contents.length;
  if (index === CONTENT_INDEX && filled) return RECORD_INDEX;
  const advanced = completedSteps(after) > completedSteps(before);
  const next = index + 1;
  return advanced && next < INTERACTIVE_STEPS ? next : index;
}
