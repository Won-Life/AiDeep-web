export type MiniMapRect = { x: number; y: number; width: number; height: number };

/*
 * CONTEXT
 * - Problem      : 화면 기준 배율은 멀리 떨어진 노드를 미니맵에서 잘라낸다.
 * - Why          : 노드 실측 영역에 사방 100px을 더하고 긴 변 기준 정사각형으로 맞춘다.
 * - Alternatives : 뷰포트까지 합치면 화면 이동만으로 미니맵 배율이 변해 위치 파악이 어렵다.
 * - Trade-offs   : 전체 노드를 담는 대신 큰 그래프에서는 현재 화면 사각형이 작아질 수 있다.
 * - Edge Case    : 빈 그래프는 원점 중심 200px 정사각형, 음수 좌표도 같은 방식으로 처리한다.
 */
export function getMiniMapBounds(rects: MiniMapRect[]): MiniMapRect {
  if (rects.length === 0) return { x: -100, y: -100, width: 200, height: 200 };

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const rect of rects) {
    left = Math.min(left, rect.x);
    top = Math.min(top, rect.y);
    right = Math.max(right, rect.x + rect.width);
    bottom = Math.max(bottom, rect.y + rect.height);
  }
  const side = Math.max(right - left, bottom - top) + 200;
  return {
    x: (left + right - side) / 2,
    y: (top + bottom - side) / 2,
    width: side,
    height: side,
  };
}
