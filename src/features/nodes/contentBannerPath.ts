/** 콘텐츠 노드의 뾰족 배너 외곽선(SVG path). pointRight면 오른쪽이 뾰족하다. */
/*
 * CONTEXT
 * - Problem      : 콘텐츠 배너 끝이 직선 두 개로 만나 참고 이미지보다 날카롭다.
 * - Why          : 높이에 비례한 사선 끝을 quadratic 곡선으로 연결해 둥근 끝을 만든다.
 * - Alternatives : strokeLinejoin만으로는 내부 배경의 뾰족한 끝을 둥글게 만들 수 없다.
 * - Trade-offs   : 사선 깊이가 높이에 따라 늘어나므로 텍스트 쪽 여백도 확보한다.
 * - Edge Case    : 좌우 방향을 대칭으로 그리고 작은 노드에서는 반경을 제한한다.
 */

export function contentBannerPath(w: number, h: number, pointRight: boolean): string {
  const p = Math.min(28, h / 2, w / 3);
  const r = Math.max(2, Math.min(10, h / 2 - 1));
  const tip = Math.min(6, p / 2, h / 4);
  const mid = h / 2;
  const inset = tip * p / mid;
  return pointRight
    ? `M ${r},0 H ${w - p} L ${w - inset},${mid - tip} Q ${w},${mid} ${w - inset},${mid + tip} L ${w - p},${h} H ${r} Q 0,${h} 0,${h - r} V ${r} Q 0,0 ${r},0 Z`
    : `M ${w - r},0 H ${p} L ${inset},${mid - tip} Q 0,${mid} ${inset},${mid + tip} L ${p},${h} H ${w - r} Q ${w},${h} ${w},${h - r} V ${r} Q ${w},0 ${w - r},0 Z`;
}
