import { describe, expect, it } from 'vitest';
import {
  CONTENT_SLOTS,
  EMPTY_DEMO,
  MAX_CONTENTS,
  MAX_LABEL,
  applyStepInput,
  completedSteps,
  isStepUnlocked,
  nextOpenStep,
  normalizeLabel,
  stepStatus,
  type DemoData,
} from './tryDemoState';

const withProject: DemoData = { ...EMPTY_DEMO, project: '운영체제' };
const withTitle: DemoData = { ...withProject, title: '260923 오늘 강의' };

describe('normalizeLabel', () => {
  it.each([
    ['  운영체제  ', '운영체제'],
    ['운영   체제', '운영 체제'],
    ['\n\t ', ''],
  ])('%j → %j', (raw, expected) => {
    expect(normalizeLabel(raw)).toBe(expected);
  });
});

describe('단계는 앞에서부터 열린다', () => {
  it('끝낸 단계 수를 센다', () => {
    expect(completedSteps(EMPTY_DEMO)).toBe(0);
    expect(completedSteps(withProject)).toBe(1);
    expect(completedSteps(withTitle)).toBe(2);
    expect(completedSteps({ ...withTitle, contents: ['슬라이드'] })).toBe(3);
  });

  it('타이틀만 있고 프로젝트가 없는 값은 끝낸 단계로 세지 않는다', () => {
    expect(completedSteps({ ...EMPTY_DEMO, title: '제목' })).toBe(0);
  });

  it('바로 앞 단계까지 끝낸 단계만 열 수 있고, 회의 녹음 체험(4번째)은 타이틀만 있으면 열린다', () => {
    expect([0, 1, 2, 3].map((i) => isStepUnlocked(EMPTY_DEMO, i))).toEqual([true, false, false, false]);
    expect([0, 1, 2, 3].map((i) => isStepUnlocked(withProject, i))).toEqual([true, true, false, false]);
    expect([0, 1, 2, 3].map((i) => isStepUnlocked(withTitle, i))).toEqual([true, true, true, true]);
  });
});

describe('stepStatus', () => {
  const withContent = { ...withTitle, contents: ['슬라이드'] };

  it('열 수 없으면 잠김, 끝낸 단계는 끝남, 나머지는 할 차례', () => {
    expect([0, 1, 2, 3].map((i) => stepStatus(withProject, 'idle', i))).toEqual(['done', 'todo', 'locked', 'locked']);
    expect([0, 1, 2, 3].map((i) => stepStatus(withContent, 'idle', i))).toEqual(['done', 'done', 'done', 'todo']);
  });

  it('콘텐츠 없이 녹음을 시작하면 3단계는 건너뜀이고, 콘텐츠가 있으면 끝남 그대로다', () => {
    expect(stepStatus(withTitle, 'playing', 2)).toBe('skipped');
    expect(stepStatus(withContent, 'playing', 2)).toBe('done');
  });

  it('재생이 끝나야 4단계가 끝남이 된다', () => {
    expect(stepStatus(withTitle, 'playing', 3)).toBe('todo');
    expect(stepStatus(withTitle, 'done', 3)).toBe('done');
  });
});

describe('applyStepInput', () => {
  it('프로젝트 이름을 정리해 넣고, 다시 입력하면 이름이 바뀐다', () => {
    const first = applyStepInput(EMPTY_DEMO, 'project', '  운영   체제 ');
    expect(first.project).toBe('운영 체제');
    expect(applyStepInput(first, 'project', '개발팀').project).toBe('개발팀');
  });

  it('빈 입력은 같은 객체를 돌려준다', () => {
    expect(applyStepInput(EMPTY_DEMO, 'project', '   ')).toBe(EMPTY_DEMO);
  });

  it('앞 단계가 없으면 타이틀·콘텐츠를 반영하지 않는다', () => {
    expect(applyStepInput(EMPTY_DEMO, 'title', '제목')).toBe(EMPTY_DEMO);
    expect(applyStepInput(withProject, 'content', '내용')).toBe(withProject);
  });

  it('노드에 들어가는 글자 수로 자른다', () => {
    const long = 'ㄱ'.repeat(50);
    expect(applyStepInput(EMPTY_DEMO, 'project', long).project).toHaveLength(MAX_LABEL.project);
    expect(applyStepInput(withProject, 'title', long).title).toHaveLength(MAX_LABEL.title);
    expect(applyStepInput(withTitle, 'content', long).contents[0]).toHaveLength(MAX_LABEL.content);
  });

  it('콘텐츠는 하나씩 더해지고 직접 만들 수 있는 수가 차면 더 늘지 않는다', () => {
    let data = withTitle;
    for (let i = 0; i < MAX_CONTENTS + 2; i += 1) data = applyStepInput(data, 'content', `내용${i}`);
    expect(data.contents).toHaveLength(MAX_CONTENTS);
    expect(data.contents[0]).toBe('내용0');
  });

  it('직접 해 볼 수 없는 단계는 값을 바꾸지 않는다', () => {
    expect(applyStepInput(withTitle, 'record', '샘플')).toBe(withTitle);
  });
});

describe('캔버스 칸', () => {
  it('직접 만든 콘텐츠를 다 채워도 샘플 노드 3개가 들어갈 칸이 남는다', () => {
    expect(CONTENT_SLOTS).toBe(MAX_CONTENTS + 3);
  });
});

describe('nextOpenStep', () => {
  it('새로 끝낸 단계가 있으면 다음 단계를 연다', () => {
    const after = applyStepInput(EMPTY_DEMO, 'project', '운영체제');
    expect(nextOpenStep(EMPTY_DEMO, after, 0)).toBe(1);
  });

  it('이름만 바꾼 경우에는 열어 둔 단계를 그대로 둔다', () => {
    const renamed = applyStepInput(withTitle, 'project', '개발팀');
    expect(nextOpenStep(withTitle, renamed, 0)).toBe(0);
  });

  it('콘텐츠를 끝내도 다음(잠긴 단계)으로 넘어가지 않고 그대로 둔다', () => {
    const after = applyStepInput(withTitle, 'content', '슬라이드');
    expect(nextOpenStep(withTitle, after, 2)).toBe(2);
  });
});
