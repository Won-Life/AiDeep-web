import type { EdgeProps } from "@xyflow/react";
import { BaseEdge, getSmoothStepPath } from "@xyflow/react";

export function BranchEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, data, markerEnd } = props;
  const hubX: number = data.hubX; // (sourceX + targetX) / 2;
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
      <BaseEdge id={id} path={mergedPath} markerEnd={markerEnd} />
    </>
  );
}
