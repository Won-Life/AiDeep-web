import type { EdgeProps } from "@xyflow/react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";

export function BranchEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, data, markerEnd } = props;

  // 전처리에서 넣어준 hub 좌표
  const hubX: number = data?.hubX ?? (sourceX + targetX) / 2;
  const hubY: number = data?.hubY ?? (sourceY + targetY) / 2;

  // 1) source -> hub (트렁크)
  const [trunkPath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX: hubX,
    targetY: hubY,
    borderRadius: 12,
  });

  // 2) hub -> target (브랜치)
  const [branchPath] = getSmoothStepPath({
    sourceX: hubX,
    sourceY: hubY,
    targetX,
    targetY,
    borderRadius: 12,
  });

  // 두 path를 "한 edge처럼" 이어붙이기
  // getSmoothStepPath는 `M ...`로 시작하므로, 두 번째의 시작 M을 제거하고 이어붙입니다.
  const mergedPath = `${trunkPath} ${branchPath.replace(/^M[^CQLA]*\s/, "")}`;

  return (
    <>
      <BaseEdge id={id} path={mergedPath} markerEnd={markerEnd} />
    </>
  );
}
