export type SubColorKey =
  | "gray"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "mint"
  | "blue"
  | "purple"
  | "pink";

export const SUB_BG_CLASS: Record<SubColorKey, string> = {
  gray: "bg-sub-gray",
  red: "bg-sub-red",
  orange: "bg-sub-orange",
  yellow: "bg-sub-yellow",
  green: "bg-sub-green",
  mint: "bg-sub-mint",
  blue: "bg-sub-blue",
  purple: "bg-sub-purple",
  pink: "bg-sub-pink",
};

export const SUB_TEXT_CLASS: Record<SubColorKey, string> = {
  gray: "text-text-gray",
  red: "text-text-red",
  orange: "text-text-orange",
  yellow: "text-text-yellow",
  green: "text-text-green",
  mint: "text-text-mint",
  blue: "text-text-blue",
  purple: "text-text-purple",
  pink: "text-text-pink",
};

/** 배경/텍스트 pair를 한 번에 얻고 싶을 때 */
export function getSubColorPair(key: SubColorKey) {
  return {
    bg: SUB_BG_CLASS[key],
    text: SUB_TEXT_CLASS[key],
  };
}

/** UI 라벨 */
export const SUB_LABEL: Record<SubColorKey, string> = {
  gray: "Sub Gray",
  red: "Sub Red",
  orange: "Sub Orange",
  yellow: "Sub Yellow",
  green: "Sub Green",
  mint: "Sub Mint",
  blue: "Sub Blue",
  purple: "Sub Purple",
  pink: "Sub Pink",
};
