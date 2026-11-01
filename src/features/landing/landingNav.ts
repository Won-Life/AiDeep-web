/** 상단 메뉴: 라벨과 스크롤할 섹션 id. 섹션 id는 각 섹션 컴포넌트가 가진다. */
export const NAV_ITEMS = [
  { label: '서비스 소개', targetId: 'intro' },
  { label: '주요 기능', targetId: 'features' },
  { label: '사용 방법', targetId: 'how' },
  { label: '추천 대상', targetId: 'target' },
] as const;

/** 푸터 '서비스' 열: 상단 메뉴에서 '추천 대상'만 뺀 세 개(시안 기준) */
export const FOOTER_SERVICE_LINKS = NAV_ITEMS.filter((item) => item.targetId !== 'target');

export const INSTAGRAM_URL = 'https://www.instagram.com/onnode.official';

export const LOGIN_PATH = '/login';
export const INTRO_ID = 'intro';
