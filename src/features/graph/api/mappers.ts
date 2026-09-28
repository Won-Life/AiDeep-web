import type { Node, Edge } from "@xyflow/react";
import type { NodeDto, EdgeDto } from "../types";
import { DEFAULT_NODE_COLOR } from "../constants/colors";
import {
  initializeHandleSides,
  buildEdgePresentation,
} from "../logic/placement";

/** NodeDto → ReactFlow Node */
export function toFlowNode(dto: NodeDto): Node {
  return {
    id: dto.node_id,
    type: "textUpdater",
    position: { x: dto.position_x, y: dto.position_y },
    data: {
      title: dto.title,
      color: dto.content?.color ?? DEFAULT_NODE_COLOR.bg,
      textColor: dto.content?.textColor ?? DEFAULT_NODE_COLOR.text,
      isMain: dto.node_type === "PROJECT",
      nodeType: dto.node_type,
      depth: dto.depth ?? 0,
    },
  };
}

/** EdgeDto → ReactFlow Edge */
export function toFlowEdge(dto: EdgeDto): Edge {
  return {
    id: dto.edge_id,
    source: dto.source_id,
    target: dto.target_id,
    type: "branch",
    sourceHandle: dto.source_handle,
    targetHandle: dto.target_handle,
    data: {},
  };
}

/**
 * /workspace/sync 응답 전체를 화면 모델로 변환한다.
 * 개별 매핑(toFlowNode/toFlowEdge) 후 핸들 방향 초기화(initializeHandleSides)와
 * 엣지 표현 계산(buildEdgePresentation)까지 마친 완성 상태를 돌려준다.
 */
export function convertToReactFlow(
  graphNodes: NodeDto[],
  graphEdges: EdgeDto[],
): { nodes: Node[]; edges: Edge[] } {
  const nodes = graphNodes.map(toFlowNode);
  const rawEdges = graphEdges.map(toFlowEdge);

  const nodesWithHandleSide = initializeHandleSides(nodes, rawEdges);

  const edges = rawEdges.map((edge) =>
    buildEdgePresentation(edge, nodesWithHandleSide, rawEdges),
  );

  return { nodes: nodesWithHandleSide, edges };
}
