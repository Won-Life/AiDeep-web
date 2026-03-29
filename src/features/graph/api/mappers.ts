import type { Node, Edge } from "@xyflow/react";
import type { NodeDto, EdgeDto } from "../types";
import { DEFAULT_NODE_COLOR } from "../constants/colors";

/** NodeDto → ReactFlow Node */
export function toFlowNode(dto: NodeDto): Node {
  return {
    id: dto.node_id,
    type: "textUpdater",
    position: { x: dto.position_x, y: dto.position_y },
    data: {
      text: dto.title,
      content: dto.content?.jsonBody ?? undefined,
      body: dto.content?.markdownBody ?? "",
      isMain: dto.node_type === "PROJECT",
      color: dto.content?.color ?? DEFAULT_NODE_COLOR.bg,
      textColor: dto.content?.textColor ?? DEFAULT_NODE_COLOR.text,
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
  };
}
