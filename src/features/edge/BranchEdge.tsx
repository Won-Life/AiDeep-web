import type { EdgeProps } from "@xyflow/react";
import { BaseEdge } from "@xyflow/react";

export function BranchEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, data, markerEnd } = props;
  const hubX: number = (data?.hubX as number) ?? (sourceX + targetX) / 2;
  const hubY: number = sourceY;

  /*
   * CONTEXT
   * - Problem      : 기존 경로는 세로 줄기의 시작은 직각, 끝만 곡선으로 그린다.
   * - Why          : 양쪽 접합을 같은 반경의 이차 곡선으로 연결해 시안의 부드러운 꺾임을 맞춘다.
   * - Alternatives : 선 join만 round로 해서는 경로 자체의 직각을 곡선으로 만들 수 없다.
   * - Trade-offs   : 짧은 연결에서는 반경을 공간에 맞춰 줄인다.
   * - Edge Case    : 좌우·상하 반전과 수평 연결에서도 경로가 되돌아가지 않는다.
   */
  const deltaY = targetY - hubY;
  const incoming = Math.sign(hubX - sourceX);
  const outgoing = Math.sign(targetX - hubX);
  const vertical = Math.sign(deltaY);
  const radius = Math.min(10, Math.abs(hubX - sourceX), Math.abs(targetX - hubX), Math.abs(deltaY) / 2);
  const mergedPath = radius > 0
    ? `M ${sourceX},${sourceY} L ${hubX - incoming * radius},${hubY} Q ${hubX},${hubY} ${hubX},${hubY + vertical * radius} L ${hubX},${targetY - vertical * radius} Q ${hubX},${targetY} ${hubX + outgoing * radius},${targetY} L ${targetX},${targetY}`
    : `M ${sourceX},${sourceY} L ${hubX},${hubY} L ${hubX},${targetY} L ${targetX},${targetY}`;

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
      {/* Figma 08 실측: 엣지선 #666666(진회색) 2px — 포트 링과 동일 색 */}
      <BaseEdge
        id={id}
        path={mergedPath}
        markerEnd={markerEnd}
        style={{ stroke: "#666666", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", filter: "drop-shadow(0 2px 1.5px rgba(0, 0, 0, 0.22))", ...props.style }}
      />
    </>
  );
}
