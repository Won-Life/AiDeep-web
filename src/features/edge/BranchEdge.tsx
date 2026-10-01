import type { EdgeProps } from "@xyflow/react";
import { BaseEdge, Position } from "@xyflow/react";

/*
 * CONTEXT
 * - Problem      : 기존 엣지는 고정 hub 지점을 경유하는 직각 꺾임이라 Figma 08 시안(G1)의
 *                  곡선 부챗살(한 노드의 엣지들이 서로 다른 지점에서 출발)과 다르다.
 * - Why          : path 계산만 교체한다. React Flow는 커스텀 엣지의 path 문자열에 제약이
 *                  없고, 시작점 분산은 타겟 방향에 비례한 Y 오프셋으로 엣지마다 독립
 *                  계산되므로 형제 엣지 정보가 필요 없다 (드래그 중에도 매 프레임 일관).
 * - Alternatives : 핸들을 자식 수만큼 렌더링 — 핸들 id가 서버 저장·방향 판정·재부모화
 *                  갱신에 걸쳐 있고, 자식 수 변화마다 재배정하지 않으면 존재하지 않는
 *                  핸들 참조(React Flow #008)로 엣지가 사라진다, 기각.
 *                  getBezierPath 그대로 사용 — 시작점이 핸들 한 점으로 고정돼 부챗살이
 *                  아닌 한 점 발산이 된다, 기각.
 * - Trade-offs   : 새 연결을 드래그하는 동안 React Flow가 그리는 임시 연결선은 실제
 *                  핸들(변 중앙)에서 시작해 확정 후 곡선과 순간적으로 다르다 — 수용.
 * - Edge Case    : 시작점을 노드 안쪽(INSET)에서 출발시켜, pill 모서리 근처로 Y 오프셋될
 *                  때 선이 허공에서 시작해 보이는 문제를 막는다 (노드가 엣지 위에 그려짐).
 *                  타겟이 소스와 X가 가까운 경우도 컨트롤 오프셋 하한으로 완만한 곡선 유지.
 */

// 부챗살 시작점 분산: 노드 높이 48px 기준, 변 중앙에서 최대 ±10px
const FAN_MAX_OFFSET = 10;
const FAN_SLOPE = 0.12;
const START_INSET = 8; // 시작점을 노드 안쪽으로 넣어 선이 노드 밑에서 나오게 한다
const MIN_CONTROL = 20; // 베지어 컨트롤 수평 오프셋 하한

export function BranchEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, markerEnd } =
    props;

  const sign = sourcePosition === Position.Left ? -1 : 1;
  const fan = Math.max(
    -FAN_MAX_OFFSET,
    Math.min(FAN_MAX_OFFSET, (targetY - sourceY) * FAN_SLOPE),
  );
  const startX = sourceX - sign * START_INSET;
  const startY = sourceY + fan;

  const control = Math.max(Math.abs(targetX - startX) * 0.5, MIN_CONTROL);
  const path = `M ${startX},${startY} C ${startX + sign * control},${startY} ${
    targetX - sign * control
  },${targetY} ${targetX},${targetY}`;

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={{ stroke: "rgb(var(--ds-gray-700))", strokeWidth: 1 }}
    />
  );
}
