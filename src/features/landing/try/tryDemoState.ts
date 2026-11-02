/*
 * 직접 체험의 상태 규칙(서버와 통신하지 않는 순수 함수). 화면은 이 값을 그리기만 한다.
 * 단계는 순서대로 열린다: 프로젝트 → 타이틀 → 콘텐츠.
 */
export type StepId = 'project' | 'title' | 'content' | 'record';

export const STEP_ORDER: readonly StepId[] = ['project', 'title', 'content', 'record'];

/** 지금 직접 해 볼 수 있는 단계 수(회의 녹음 체험은 아직 잠금) */
export const INTERACTIVE_STEPS = 3;

/** 콘텐츠 노드를 붙일 수 있는 자리 수(캔버스에 놓을 칸) */
export const MAX_CONTENTS = 4;

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

/** 단계를 열 수 있는가: 바로 앞 단계까지 끝냈고, 직접 해 볼 수 있는 단계여야 한다 */
export function isStepUnlocked(data: DemoData, index: number): boolean {
  return index < INTERACTIVE_STEPS && index <= completedSteps(data);
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

/** 입력 뒤 열어 둘 단계: 새로 끝낸 단계가 있고 다음이 해 볼 수 있는 단계면 다음으로, 아니면 그대로 */
export function nextOpenStep(before: DemoData, after: DemoData, index: number): number {
  const advanced = completedSteps(after) > completedSteps(before);
  const next = index + 1;
  return advanced && next < INTERACTIVE_STEPS ? next : index;
}
