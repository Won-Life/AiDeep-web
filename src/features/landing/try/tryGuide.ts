export type GuideStep = { id: string; title: string; description: string };

/** 체험 화면 왼쪽 안내: 첫 단계는 펼쳐 두고(입력칸·버튼 포함), 나머지는 제목과 설명만 둔다. */
export const GUIDE_INTRO = '순서대로 해 보면 On:Node가 어떻게 돌아가는지 바로 알 수 있어요.';

export const ACTIVE_STEP: GuideStep & { placeholder: string; actionLabel: string } = {
  id: 'project',
  title: '프로젝트 노드 만들기',
  description: '과목이나 파트 이름으로 시작하면 좋아요.',
  placeholder: '예) 운영체제, 개발팀',
  actionLabel: '+ 프로젝트 노드 만들기',
};

export const NEXT_STEPS: readonly GuideStep[] = [
  { id: 'title', title: '타이틀 추가', description: '날짜별 수업·회의 단위로 노드를 이어 붙여요.' },
  { id: 'content', title: '콘텐츠 노드 추가', description: '바로 쓰기 또는 템플릿(강의 필기, 회의 메모 등)으로 시작해요.' },
  { id: 'record', title: '회의 녹음 체험', description: '샘플 회의를 재생하면 노드가 자동으로 만들어져요.' },
];
