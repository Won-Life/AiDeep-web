const pad = (value: number) => String(value).padStart(2, '0');

/**
 * 내보내기 PNG 파일명. 같은 대화에서 여러 장을 저장해도 분 단위로 구분된다.
 * 예) 2026-08-29 14:32 → `aideep-답변-20260829-1432.png`
 */
export function buildExportFilename(date: Date): string {
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `aideep-답변-${stamp}-${time}.png`;
}
