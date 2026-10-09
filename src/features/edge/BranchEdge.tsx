import type { EdgeProps } from "@xyflow/react";
import { BaseEdge } from "@xyflow/react";

export function BranchEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, data, markerEnd } = props;
  const hubX: number = (data?.hubX as number) ?? (sourceX + targetX) / 2;
  const hubY: number = sourceY;

  const trunkPath = `M ${sourceX},${sourceY} L ${hubX},${hubY}`;

  const deltaX = targetX - hubX;
  const deltaY = targetY - hubY;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  const radius = Math.min(12, absX / 2, absY / 2);
  const signX = deltaX >= 0 ? 1 : -1;
  const signY = deltaY >= 0 ? 1 : -1;

  const verticalEndY = hubY + signY * Math.max(absY - radius, 0);
  const cornerX = hubX + signX * radius;
  const cornerY = targetY;

  const branchPath =
    radius > 0
      ? `L ${hubX},${verticalEndY} Q ${hubX},${targetY} ${cornerX},${cornerY} L ${targetX},${targetY}`
      : `L ${hubX},${targetY} L ${targetX},${targetY}`;

  const mergedPath = `${trunkPath} ${branchPath.replace(/^M[^CQLA]*\s/, "")}`;

  return (
    <>
      {/*
       * CONTEXT
       * - Problem      : 평평한 엣지선에 참고 이미지의 아래쪽 그늘이 없다.
       * - Why          : 실제 선에 작은 하단 drop-shadow를 적용해 경로를 그대로 따라간다.
       * - Alternatives : 복제 path는 클릭 영역과 선 관리가 중복된다.
       * - Trade-offs   : SVG 필터 렌더링 비용이 추가된다.
       * - Edge Case    : 수평·수직 엣지와 곡선에 동일하게 적용하고 기존 스타일 재정의는 유지한다.
       */}
      {/* Figma 08 실측: 엣지선 #727272(진회색) 2px — 포트 링과 동일 색 */}
      <BaseEdge
        id={id}
        path={mergedPath}
        markerEnd={markerEnd}
        style={{ stroke: "#727272", strokeWidth: 2, filter: "drop-shadow(0 2px 1.5px rgba(0, 0, 0, 0.22))", ...props.style }}
      />
    </>
  );
}
