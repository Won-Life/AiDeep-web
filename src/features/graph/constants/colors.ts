export const DEFAULT_NODE_COLOR = {
  bg: "rgb(var(--ds-sub-gray))",
  text: "rgb(var(--ds-text-gray))",
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

export function getRandomColorPair() {
  const randomIndex = Math.floor(Math.random() * COLOR_PALETTE.length);
  return COLOR_PALETTE[randomIndex];
}
