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

// gray는 DEFAULT_NODE_COLOR(그래프 미소속 상태)와 같은 값이라 랜덤 풀에서 제외 —
// 그래프에 실제로 랜덤 배정되면 "소속 없음"처럼 보인다. COLOR_PALETTE 자체는
// 유지(사용자 아바타/커서 색 해시에는 gray도 계속 후보로 쓰인다).
const RANDOM_COLOR_POOL = COLOR_PALETTE.filter((c) => c.name !== "gray");

export function getRandomColorPair() {
  const randomIndex = Math.floor(Math.random() * RANDOM_COLOR_POOL.length);
  return RANDOM_COLOR_POOL[randomIndex];
}
