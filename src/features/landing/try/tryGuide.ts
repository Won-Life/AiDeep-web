import { MAX_LABEL, type StepId } from './tryDemoState';

export type GuideStep = {
  id: StepId;
  title: string;
  description: string;
  /** 입력이 있는 단계에만 있다 */
  input?: { placeholder: string; actionLabel: string; maxLength: number };
};

export const GUIDE_INTRO = '순서대로 해 보면 On:Node가 어떻게 돌아가는지 바로 알 수 있어요.';

export const GUIDE_STEPS: readonly GuideStep[] = [
  {
    id: 'project',
    title: '프로젝트 노드 만들기',
    description: '과목이나 파트 이름으로 시작하면 좋아요.',
    input: { placeholder: '예) 운영체제, 개발팀', actionLabel: '+ 프로젝트 노드 만들기', maxLength: MAX_LABEL.project },
  },
  {
    id: 'title',
    title: '타이틀 추가',
    description: '날짜별 수업·회의 단위로 노드를 이어 붙여요.',
    input: { placeholder: '예) 260923 오늘 강의', actionLabel: '+ 타이틀 추가', maxLength: MAX_LABEL.title },
  },
  {
    id: 'content',
    title: '콘텐츠 노드 추가',
    description: '바로 쓰기 또는 템플릿(강의 필기, 회의 메모 등)으로 시작해요.',
    input: { placeholder: '예) 프로세스 스케줄링', actionLabel: '+ 콘텐츠 노드 추가', maxLength: MAX_LABEL.content },
  },
  { id: 'record', title: '회의 녹음 체험', description: '샘플 회의를 재생하면 노드가 자동으로 만들어져요.' },
];
