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

// Figma 08 'Spectral' 팔레트 실측값 — 각 색은 light(콘텐츠 노드 배경)와 deep(타이틀 노드
// 배경)의 2단으로 쓴다. deepText는 deep 배경 위 타이틀 글자색(blue/red만 흰색, 나머지는
// 해당 색의 진한 텍스트 — Node 색이 밝아 흰 글씨는 대비 부족).
// 노드에 저장된 data.color("rgb(var(--ds-sub-blue))" 형태)에서 family를 추출해 매칭한다.
export const FIGMA_NODE_COLORS: Record<
  string,
  { light: string; deep: string; deepText: string }
> = {
  blue: { light: "#E8F5FF", deep: "#748DFD", deepText: "#FFFFFF" },
  pink: { light: "#FFF8FB", deep: "#FEAECE", deepText: "#683B52" },
  orange: { light: "#FFF0DF", deep: "#FDAC50", deepText: "#59432C" },
  yellow: { light: "#FFFCF0", deep: "#FEE066", deepText: "#5D5428" },
  green: { light: "#F4FDF2", deep: "#88E58E", deepText: "#40512A" },
  mint: { light: "#EAFDFB", deep: "#77DED9", deepText: "#1F4C3A" },
  purple: { light: "#FFE9FF", deep: "#B59AFA", deepText: "#563B68" },
  red: { light: "#FFF0F0", deep: "#F2777A", deepText: "#FFFFFF" },
  gray: { light: "#EFEFEF", deep: "#B8B8B8", deepText: "#2C2C2C" },
};

/** data.color("rgb(var(--ds-sub-blue))" 등)에서 색 family("blue")를 추출 */
export function figmaNodeColorOf(
  storedColor: string | undefined,
): { light: string; deep: string; deepText: string } | undefined {
  const family = storedColor?.match(/--ds-(?:sub|deep)-(\w+)/)?.[1];
  return family ? FIGMA_NODE_COLORS[family] : undefined;
}

// gray는 DEFAULT_NODE_COLOR(그래프 미소속 상태)와 같은 값이라 랜덤 풀에서 제외 —
// 그래프에 실제로 랜덤 배정되면 "소속 없음"처럼 보인다. COLOR_PALETTE 자체는
// 유지(사용자 아바타/커서 색 해시에는 gray도 계속 후보로 쓰인다).
const RANDOM_COLOR_POOL = COLOR_PALETTE.filter((c) => c.name !== "gray");

export function getRandomColorPair() {
  const randomIndex = Math.floor(Math.random() * RANDOM_COLOR_POOL.length);
  return RANDOM_COLOR_POOL[randomIndex];
}
