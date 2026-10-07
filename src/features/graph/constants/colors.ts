export const DEFAULT_NODE_COLOR = {
  bg: "rgb(var(--ds-sub-gray))",
  text: "rgb(var(--ds-text-gray))",
};

export const MAIN_NODE_COLOR = {
  name: "white",
  bg: "rgb(var(--ds-sub-white))",
  text: "rgb(var(--ds-text-white))",
};

export const COLOR_PALETTE = [
  {
    name: "gray",
    bg: "rgb(var(--ds-sub-gray))",
    text: "rgb(var(--ds-text-gray))",
  },
  {
    name: "red",
    bg: "rgb(var(--ds-sub-red))",
    text: "rgb(var(--ds-text-red))",
  },
  {
    name: "orange",
    bg: "rgb(var(--ds-sub-orange))",
    text: "rgb(var(--ds-text-orange))",
  },
  {
    name: "yellow",
    bg: "rgb(var(--ds-sub-yellow))",
    text: "rgb(var(--ds-text-yellow))",
  },
  {
    name: "green",
    bg: "rgb(var(--ds-sub-green))",
    text: "rgb(var(--ds-text-green))",
  },
  {
    name: "mint",
    bg: "rgb(var(--ds-sub-mint))",
    text: "rgb(var(--ds-text-mint))",
  },
  {
    name: "blue",
    bg: "rgb(var(--ds-sub-blue))",
    text: "rgb(var(--ds-text-blue))",
  },
  {
    name: "purple",
    bg: "rgb(var(--ds-sub-purple))",
    text: "rgb(var(--ds-text-purple))",
  },
  {
    name: "pink",
    bg: "rgb(var(--ds-sub-pink))",
    text: "rgb(var(--ds-text-pink))",
  },
];

// Figma 디자인시스템 "Etc" 노드 색 그룹 실측값 (디자이너 래경 확정 스펙).
// 각 계열은 Node(base)/Node Light/Node Deep 3톤. 노드 적용 규칙:
//   - 콘텐츠 노드 = Node Light (light)
//   - 타이틀 노드 + 프로젝트 노드 꽁다리(폴더탭) = Node Deep (deep)
// base(최연한)는 노드에 쓰지 않아 저장하지 않는다. 글자색은 계열별 --ds-text-* (어두운 톤)을
// 그대로 쓴다(Light/Deep 모두 밝은 파스텔이라 흰 글씨는 대비 부족).
// 값 출처: 디자이너가 공유한 Etc 스와치 이미지에서 픽셀 실측(scripts 없이 1회 추출).
// red/pink/gray는 Etc 그룹에 없어 합리적 폴백(deep=기존 톤, light=연한 틴트)으로 둔다.
export const FIGMA_NODE_COLORS: Record<
  string,
  { light: string; deep: string }
> = {
  orange: { light: "#FFCD93", deep: "#FDAD50" },
  yellow: { light: "#FFEB9B", deep: "#FEE066" },
  green: { light: "#AAF09A", deep: "#85E56E" },
  mint: { light: "#B4F7F3", deep: "#77DED8" },
  blue: { light: "#97AAFE", deep: "#748DFD" }, // 08 예시 Main Blue(solid=deep, 0.75≈light)
  purple: { light: "#D1BFFE", deep: "#B59AFA" },
  // 아래 3계열은 Etc 그룹 미정의 — 폴백(공식 아님)
  red: { light: "#FCA5A8", deep: "#F2777A" },
  pink: { light: "#FDC9DF", deep: "#FEAECE" },
  gray: { light: "#D9D9D9", deep: "#B8B8B8" },
};

/** data.color("rgb(var(--ds-sub-blue))" 등)에서 색 family("blue")를 추출 */
export function figmaNodeColorOf(
  storedColor: string | undefined,
): { light: string; deep: string } | undefined {
  const family = storedColor?.match(/--ds-(?:sub|deep)-(\w+)/)?.[1];
  return family ? FIGMA_NODE_COLORS[family] : undefined;
}

/**
 * Deep 배경 위 글자색 결정 — 어두운 Deep(파랑 등)은 흰 글자, 밝은 Deep(오렌지·노랑 등)은
 * null 반환(호출부가 계열 어두운색 --ds-text-*로 폴백). 상대 휘도 0.6 임계.
 */
export function titleTextOnDeep(deepHex: string | undefined): string | null {
  const m = deepHex?.match(/^#?([0-9a-fA-F]{6})$/)?.[1];
  if (!m) return null;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.6 ? "#FFFFFF" : null;
}

// gray는 DEFAULT_NODE_COLOR(그래프 미소속 상태)와 같은 값이라 랜덤 풀에서 제외 —
// 그래프에 실제로 랜덤 배정되면 "소속 없음"처럼 보인다. COLOR_PALETTE 자체는
// 유지(사용자 아바타/커서 색 해시에는 gray도 계속 후보로 쓰인다).
const RANDOM_COLOR_POOL = COLOR_PALETTE.filter((c) => c.name !== "gray");

export function getRandomColorPair() {
  const randomIndex = Math.floor(Math.random() * RANDOM_COLOR_POOL.length);
  return RANDOM_COLOR_POOL[randomIndex];
}
