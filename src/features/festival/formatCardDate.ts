/** 카드 머리말에 찍히는 날짜. 예) `2026년 8월 29일` */
export function formatCardDate(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}
