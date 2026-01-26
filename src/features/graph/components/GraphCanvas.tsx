"use client";
import { useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
  type Edge,
  ConnectionMode,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "@/types/nodeTypes";
import { edgeTypes } from "@/types/edgeTypes";
import { initialEdges, initialNodes } from "@/mock/mindmap";
import { getNodes } from "../api/getNodes";
import type { EdgeDto, NodeDto } from "../types";

// DB 저장 함수 (예시)
async function saveNodesToDB(nodes: Node[], edges: Edge[]) {
  console.log("Saving to DB:", { nodes, edges });
}

// TODO: uuid로 변경
function makeNodeId() {
  return `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// TODO: 실제 노드 너비로 변경
const NODE_WIDTH = 160;
const NODE_HEIGHT = 48;
const NODE_PADDING = 8;
const HUB_OFFSET = 50;

function getParentId(nodeId: string, edges: Edge[]): string | null {
  const incoming = edges.find((edge) => edge.target === nodeId);
  return incoming?.source ?? null;
}

function getAncestorIds(nodeId: string, edges: Edge[]): Set<string> {
  const ancestors = new Set<string>();
  let current = getParentId(nodeId, edges);
  while (current) {
    ancestors.add(current);
    current = getParentId(current, edges);
  }
  return ancestors;
}

function getDescendantIds(nodeId: string, edges: Edge[]): Set<string> {
  const descendants = new Set<string>();
  const queue: string[] = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    for (const edge of edges) {
      if (edge.source === current && !descendants.has(edge.target)) {
        descendants.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  return descendants;
}

function areSiblings(aId: string, bId: string, edges: Edge[]): boolean {
  const parentA = getParentId(aId, edges);
  const parentB = getParentId(bId, edges);
  return parentA !== null && parentA === parentB;
}

function isInvalidConnection(
  sourceId: string,
  targetId: string,
  edges: Edge[],
): boolean {
  if (sourceId === targetId) return true;
  if (areSiblings(sourceId, targetId, edges)) return true;
  if (getAncestorIds(targetId, edges).has(sourceId)) return true;
  if (getAncestorIds(sourceId, edges).has(targetId)) return true;
  const alreadyConnected = edges.some(
    (edge) =>
      (edge.source === sourceId && edge.target === targetId) ||
      (edge.source === targetId && edge.target === sourceId),
  );
  return alreadyConnected;
}

function rectForNode(node: Node) {
  return {
    left: node.position.x,
    right: node.position.x + NODE_WIDTH,
    top: node.position.y,
    bottom: node.position.y + NODE_HEIGHT,
  };
}

function isOverlapping(a: Node, b: Node): boolean {
  const rectA = rectForNode(a);
  const rectB = rectForNode(b);

  return !(
    rectA.right + NODE_PADDING < rectB.left ||
    rectA.left > rectB.right + NODE_PADDING ||
    rectA.bottom + NODE_PADDING < rectB.top ||
    rectA.top > rectB.bottom + NODE_PADDING
  );
}

function canApplyMove(
  nodes: Node[],
  movingIds: Set<string>,
  delta: { x: number; y: number },
): boolean {
  const movingNodes = nodes.filter((node) => movingIds.has(node.id));
  const staticNodes = nodes.filter((node) => !movingIds.has(node.id));

  return movingNodes.every((node) => {
    const movedNode = {
      ...node,
      position: {
        x: node.position.x + delta.x,
        y: node.position.y + delta.y,
      },
    };

    return staticNodes.every((other) => !isOverlapping(movedNode, other));
  });
}

function findOverlapTarget(dragged: Node, nodes: Node[]): Node | null {
  for (const node of nodes) {
    if (node.id === dragged.id) continue;
    if (isOverlapping(dragged, node)) return node;
  }
  return null;
}

function getHandleSide(node: Node, referenceX: number): "left" | "right" {
  return node.position.x < referenceX ? "left" : "right";
}

function getEdgeSide(source: Node, target: Node): "left" | "right" {
  return target.position.x < source.position.x ? "left" : "right";
}

function buildEdgePresentation(edge: Edge, nodes: Node[]): Edge {
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  if (!source || !target) return edge;

  const side = getEdgeSide(source, target);
  const sourceHandle = source.data?.isMain
    ? side === "left"
      ? "source-left"
      : "source-right"
    : "source-side";
  const targetHandle = target.data?.isMain
    ? side === "left"
      ? "target-left"
      : "target-right"
    : "target-side";
  const sourceHandleX =
    source.position.x + (side === "right" ? source.measured?.width : 0);

  return {
    ...edge,
    type: "branch",
    sourceHandle,
    targetHandle,
    data: {
      ...edge.data,
      hubX: sourceHandleX + (side === "right" ? HUB_OFFSET : -HUB_OFFSET),
      hubY: source.position.y + NODE_HEIGHT / 2,
    },
  };
}

function mirrorSubtree(
  nodes: Node[],
  rootId: string,
  edges: Edge[],
  parentAxisX: number,
  movedTo: "left" | "right",
): Node[] {
  const subtreeIds = new Set<string>([
    rootId,
    ...getDescendantIds(rootId, edges),
  ]);

  return nodes.map((node) =>
    subtreeIds.has(node.id)
      ? {
          ...node,
          position: {
            x:
              parentAxisX * 2 -
              node.position.x +
              (movedTo === "right"
                ? (node.width ?? NODE_WIDTH)
                : -(node.width ?? NODE_WIDTH)),
            y: node.position.y,
          },
        }
      : node,
  );
}

function GraphCanvasInner() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const { screenToFlowPosition } = useReactFlow();

  /* =========================
     Node data update
     ========================= */
  const handleNodeDataChange = useCallback(
    (nodeId: string, newData: Record<string, unknown>) => {
      setNodes((snapshot) =>
        snapshot.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...newData } }
            : node,
        ),
      );
    },
    [],
  );

  const mainNode = nodes.find((node) => node.data?.isMain);

  const nodesWithCallbacks = nodes.map((node) => {
    const parentId = getParentId(node.id, edges);
    const parentNode = parentId
      ? nodes.find((item) => item.id === parentId)
      : undefined;
    const referenceX = parentNode?.position.x ?? mainNode?.position.x ?? 0;

    return {
      ...node,
      data: {
        ...node.data,
        handleSide: node.data?.isMain
          ? undefined
          : getHandleSide(node, referenceX),
        onChange: (nodeId: string, value: string) =>
          handleNodeDataChange(nodeId, { text: value }),
      },
    };
  });

  /* =========================
     React Flow handlers
     ========================= */
  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((snapshot) => {
        const positionChanges = changes.filter(
          (change) => change.type === "position" && change.position,
        );
        const otherChanges = changes.filter(
          (change) => change.type !== "position",
        );

        let next = applyNodeChanges(otherChanges, snapshot);

        for (const change of positionChanges) {
          const node = next.find((item) => item.id === change.id);
          if (!node || !change.position) continue;

          const delta = {
            x: change.position.x - node.position.x,
            y: change.position.y - node.position.y,
          };

          const parentId = getParentId(node.id, edges);
          const parentNode = parentId
            ? next.find((item) => item.id === parentId)
            : undefined;
          if (parentNode) {
            const side = getEdgeSide(parentNode, node);
            // const sourceHandleX =
            //   parentNode.position.x + (side === "right" ? NODE_WIDTH : 0);

            const parentAxisX = parentNode.position.x + NODE_WIDTH / 2;
            const beforeSide = node.position.x < parentAxisX ? "left" : "right";
            const afterSide =
              change.position.x < parentAxisX ? "left" : "right";

            if (beforeSide !== afterSide) {
              return mirrorSubtree(
                next,
                node.id,
                edges,
                parentAxisX,
                afterSide,
              );
            }
          }

          const subtreeIds = new Set<string>([
            change.id,
            ...getDescendantIds(change.id, edges),
          ]);

          if (!canApplyMove(next, subtreeIds, delta)) continue;

          next = next.map((item) =>
            subtreeIds.has(item.id)
              ? {
                  ...item,
                  position: {
                    x: item.position.x + delta.x,
                    y: item.position.y + delta.y,
                  },
                }
              : item,
          );
        }

        return next;
      }),
    [edges],
  );

  useEffect(() => {
    setEdges((snapshot) => {
      const updated = snapshot.map((edge) =>
        buildEdgePresentation(edge, nodes),
      );
      const isSame =
        updated.length === snapshot.length &&
        updated.every((edge, index) => {
          const prev = snapshot[index];
          return (
            edge.type === prev.type &&
            edge.sourceHandle === prev.sourceHandle &&
            edge.targetHandle === prev.targetHandle &&
            edge.data?.hubX === prev.data?.hubX &&
            edge.data?.hubY === prev.data?.hubY
          );
        });
      return isSame ? snapshot : updated;
    });
  }, [nodes]);

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((snapshot) => applyEdgeChanges(changes, snapshot)),
    [],
  );

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((snapshot) => {
        if (!params.source || !params.target) return snapshot;
        if (isInvalidConnection(params.source, params.target, snapshot)) {
          return snapshot;
        }
        const nextEdge = buildEdgePresentation(
          {
            id: `e-${params.source}-${params.target}-${Date.now()}`,
            source: params.source,
            target: params.target,
          },
          nodes,
        );

        return [...snapshot, nextEdge];
      }),
    [nodes],
  );

  /* =========================
     Empty pane click → create node
     ========================= */
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      // (선택) 우클릭은 제외
      if (event.button !== 0) return;

      // (선택) Shift 눌렀을 때만 생성하고 싶으면:
      // if (!event.shiftKey) return;

      // wrapper 기준 좌표로 변환 (screenToFlowPosition은 clientX/Y 기반으로 처리)
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: makeNodeId(),
        type: "textUpdater",
        position,
        data: {
          text: "새 노드",
          isMain: false,
          // color는 DS 토큰으로 가는 게 좋지만 일단 기존 패턴 유지
          color: "#EFEFEF",
        },
      };

      setNodes((prev) => [...prev, newNode]);
    },
    [screenToFlowPosition],
  );

  const onNodeDragStart = useCallback((event: React.MouseEvent, node: Node) => {
    if (!event.altKey) return;

    setEdges((snapshot) => {
      const incoming = snapshot.find((edge) => edge.target === node.id);
      if (!incoming) return snapshot;
      return snapshot.filter((edge) => edge.id !== incoming.id);
    });
  }, []);

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, draggedNode: Node) => {
      const target = findOverlapTarget(draggedNode, nodes);
      if (!target) return;

      if (isInvalidConnection(target.id, draggedNode.id, edges)) return;
      const newEdge = buildEdgePresentation(
        {
          id: `e-${target.id}-${draggedNode.id}-${Date.now()}`,
          source: target.id,
          target: draggedNode.id,
        },
        nodes,
      );

      setEdges((prev) => [...prev, newEdge]);
    },
    [nodes, edges],
  );

  /* =========================
     Persist
     ========================= */

  function convertToReactFlow(
    graphNodes: NodeDto[],
    graphEdges: EdgeDto[],
  ): {
    nodes: Node[];
    edges: Edge[];
  } {
    const nodes: Node[] = graphNodes.map((n) => ({
      id: n.nodeId,
      type: "textUpdater",
      position: n.position,
      data: {
        text: n.title,
        color: n.color,
        isMain: n.nodeType === "PROJECT",
        nodeType: n.nodeType,
      },
    }));

    const edges: Edge[] = graphEdges.map((e) =>
      buildEdgePresentation(
        {
          id: e.edgeId,
          source: e.source,
          target: e.target,
          type: e.type ?? "branch",
          sourceHandle: e.sourceHandle ?? "source-side",
          targetHandle: e.targetHandle ?? "target-side",
          data: {},
        },
        nodes,
      ),
    );

    return { nodes, edges };
  }

  // useEffect(() => {
  //   async function load() {
  //     const res = await getNodes();

  //     if (res.error) {
  //       console.error(res.error.message);
  //       return;
  //     }
  //     console.log("res: ", res);
  //     const graph = res.success.graphs[0];
  //     if (!graph) return;
  //     const graphNodes: NodeDto[] = graph.nodes;
  //     const { nodes, edges } = convertToReactFlow(graphNodes, graph.edges);
  //     console.log("nodes: ", nodes);
  //     console.log("edges: ", edges);
  //     setNodes(nodes);
  //     setEdges(edges);
  //   }

  //   load();
  // }, []);

  // useEffect(() => {
  //   saveNodesToDB(nodes, edges);
  // }, [nodes, edges]);

  return (
    <div className="w-full h-full bg-white">
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        fitView
        connectionMode={ConnectionMode.Loose}
      />
    </div>
  );
}

export default function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
}
