/** 시안 폭(designWidth)으로 짠 화면을 실제 폭에 맞출 배율. 시안보다 커지지는 않는다. */
export function fitScale(actualWidth: number, designWidth: number): number {
  if (!(actualWidth > 0) || !(designWidth > 0)) return 1;
  return Math.min(1, actualWidth / designWidth);
}
