"use client";
import { useState, useCallback, useEffect, useRef } from "react";
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
import * as d3 from "d3";
import { nodeTypes } from "@/types/nodeTypes";
import { edgeTypes } from "@/types/edgeTypes";
import { initialEdges, initialNodes } from "@/mock/mindmap";
import { getNodes } from "../api/getNodes";
import type { EdgeDto, NodeDto } from "../types";
import { rectCollide } from "../layout/rectCollide";

// DB 저장 함수 (예시)
async function saveNodesToDB(nodes: Node[], edges: Edge[]) {
  console.log("Saving to DB:", { nodes, edges });
}

// TODO: uuid로 변경
function makeNodeId() {
  return `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// TODO: 실제 노드 너비로 변경
const NODE_WIDTH = 200;
const NODE_HEIGHT = 48;
const NODE_PADDING = 0; // 완전히 부딪힐 때만 충돌
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

function getMainNodeForSubtree(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
): Node | undefined {
  const currentNode = nodes.find((n) => n.id === nodeId);
  if (currentNode?.data?.isMain) return currentNode;

  const ancestors = getAncestorIds(nodeId, edges);
  for (const ancestorId of ancestors) {
    const ancestor = nodes.find((n) => n.id === ancestorId);
    if (ancestor?.data?.isMain) return ancestor;
  }

  return undefined;
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

  // 둘이 서로 연결되어 있는지 확인
  const targetParent = getParentId(targetId, edges);
  const sourceParent = getParentId(sourceId, edges);
  if (targetParent === sourceId || sourceParent === targetId) return true;

  return false;
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

// AABB 테두리 간 최단 거리 기반으로 가장 가까운 유효한 노드 찾기
function findClosestNodeInRange(
  draggedNode: Node,
  nodes: Node[],
  edges: Edge[],
  threshold: number = 50, // 픽셀 단위 임계값
): Node | null {
  let closestNode: Node | null = null;
  let minDistance = threshold;

  // 드래그 중인 노드의 실제 크기
  const draggedWidth = draggedNode.width ?? NODE_WIDTH;
  const draggedHeight = draggedNode.height ?? NODE_HEIGHT;

  // 드래그 중인 노드의 AABB 경계 계산 (중심점 기준)
  const draggedCenterX = draggedNode.position.x + draggedWidth / 2;
  const draggedCenterY = draggedNode.position.y + draggedHeight / 2;
  const ax1 = draggedCenterX - draggedWidth / 2;
  const ay1 = draggedCenterY - draggedHeight / 2;
  const ax2 = draggedCenterX + draggedWidth / 2;
  const ay2 = draggedCenterY + draggedHeight / 2;

  for (const node of nodes) {
    if (node.id === draggedNode.id) continue;

    // 연결 유효성 체크
    if (isInvalidConnection(node.id, draggedNode.id, edges)) continue;

    // 대상 노드의 실제 크기
    const nodeWidth = node.width ?? NODE_WIDTH;
    const nodeHeight = node.height ?? NODE_HEIGHT;

    // 대상 노드의 AABB 경계 계산 (중심점 기준)
    const nodeCenterX = node.position.x + nodeWidth / 2;
    const nodeCenterY = node.position.y + nodeHeight / 2;
    const bx1 = nodeCenterX - nodeWidth / 2;
    const by1 = nodeCenterY - nodeHeight / 2;
    const bx2 = nodeCenterX + nodeWidth / 2;
    const by2 = nodeCenterY + nodeHeight / 2;

    // y축 범위가 겹치지 않으면 제외 (위아래로는 감지 안 함)
    if (ay2 < by1 || ay1 > by2) continue;

    // x축 방향 거리만 계산 (좌우 방향으로만 감지)
    const dx = Math.max(0, Math.max(ax1, bx1) - Math.min(ax2, bx2));
    const distance = dx;

    if (distance < minDistance) {
      minDistance = distance;
      closestNode = node;
    }
  }

  return closestNode;
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
  const subtreeIds = getDescendantIds(rootId, edges); // rootId 제외, 자식들만
  const beforePositions = new Map(
    nodes
      .filter((node) => subtreeIds.has(node.id))
      .map((node) => [node.id, { x: node.position.x, y: node.position.y }]),
  );

  const next = nodes.map((node) =>
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

  if (subtreeIds.size > 0) {
    const diffs = next
      .filter((node) => subtreeIds.has(node.id))
      .map((node) => {
        const before = beforePositions.get(node.id);
        return {
          id: node.id,
          beforeX: before?.x,
          beforeY: before?.y,
          afterX: node.position.x,
          afterY: node.position.y,
        };
      });
    console.log("[mirrorSubtree] before/after", diffs);
  }

  return next;
}

// D3 force simulation용 노드 타입
interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphCanvasInnerProps {
  focusedNodeId: string | null;
  onFocusComplete?: () => void;
}

function GraphCanvasInner({
  focusedNodeId,
  onFocusComplete,
}: GraphCanvasInnerProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const { screenToFlowPosition, setCenter } = useReactFlow();

  // D3 force simulation 관리
  const simulationRef = useRef<d3.Simulation<D3Node, undefined> | null>(null);
  const d3NodesRef = useRef<D3Node[]>([]);
  const isDraggingRef = useRef(false);
  const previousDragPositionRef = useRef<{ x: number; y: number } | null>(null);

  /* =========================
     D3 Force Simulation 초기화
     ========================= */
  useEffect(() => {
    const simulation = d3
      .forceSimulation<D3Node>()
      .force("collide", rectCollide<D3Node>(NODE_PADDING))
      .alphaDecay(0.02) // 더 빠른 안정화
      .velocityDecay(0.4); // 움직임의 감쇠

    // tick 이벤트: d3의 계산 결과를 React Flow nodes에 반영
    simulation.on("tick", () => {
      if (!isDraggingRef.current) return;

      const d3Nodes = d3NodesRef.current;
      if (d3Nodes.length === 0) return;

      setNodes((currentNodes) => {
        return currentNodes.map((node) => {
          const d3Node = d3Nodes.find((d) => d.id === node.id);
          if (!d3Node) return node;

          // D3는 중심점 기준, React Flow는 왼쪽 상단 기준이므로 변환
          const nodeWidth = node.width ?? NODE_WIDTH;
          const nodeHeight = node.height ?? NODE_HEIGHT;

          return {
            ...node,
            position: {
              x: (d3Node.x ?? node.position.x + nodeWidth / 2) - nodeWidth / 2,
              y:
                (d3Node.y ?? node.position.y + nodeHeight / 2) - nodeHeight / 2,
            },
          };
        });
      });
    });

    // alpha가 충분히 작아지면 시뮬레이션 멈춤
    simulation.on("end", () => {
      console.log("Simulation ended");
    });

    simulationRef.current = simulation;

    // cleanup
    return () => {
      simulation.stop();
    };
  }, []);

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
  const nodesWithCallbacks = nodes.map((node) => {
    const parentId = getParentId(node.id, edges);
    const parentNode = parentId
      ? nodes.find((item) => item.id === parentId)
      : undefined;

    const mainNode = getMainNodeForSubtree(node.id, nodes, edges);
    // 자신이 속한 그래프의 main 노드 찾기
    const referenceX = parentNode?.position.x ?? mainNode?.position.x ?? 0;

    return {
      ...node,
      data: {
        ...node.data,
        handleSide: node.data?.isMain
          ? undefined
          : getHandleSide(node, referenceX),
        showInputBox: selectedNodeId === node.id, // 선택된 노드에만 입력박스 표시
        isHovered: hoveredNodeId === node.id, // 드래그 중 hover된 노드 표시
        onChange: (nodeId: string, value: string) =>
          handleNodeDataChange(nodeId, { text: value }),
      },
    };
  });

  /* =========================
     React Flow handlers
     ========================= */
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    return setNodes((snapshot) => {
      return applyNodeChanges(changes, snapshot);
    });
  }, []);

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
     Node click → toggle input box
     ========================= */
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // 같은 노드를 다시 클릭하면 닫기 (토글)
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

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

  const onNodeDragStart = useCallback(
    (event: React.MouseEvent, draggedNode: Node) => {
      // hover 상태 초기화
      setHoveredNodeId(null);

      // D3 force simulation 시작
      isDraggingRef.current = true;

      // 드래그 노드와 자식들을 함께 고정
      const childrenIds = getDescendantIds(draggedNode.id, edges);
      const fixedNodeIds = new Set([draggedNode.id, ...childrenIds]);

      // React Flow nodes에서 d3 노드 데이터 추출
      const d3Nodes: D3Node[] = nodes.map((n) => ({
        id: n.id,
        x: n.position.x + (n.width ?? NODE_WIDTH) / 2, // 중심점으로 변환
        y: n.position.y + (n.height ?? NODE_HEIGHT) / 2,
        width: n.width ?? NODE_WIDTH,
        height: n.height ?? NODE_HEIGHT,
        // 드래그 노드와 그 자식들은 모두 고정
        fx: fixedNodeIds.has(n.id)
          ? n.position.x + (n.width ?? NODE_WIDTH) / 2
          : null,
        fy: fixedNodeIds.has(n.id)
          ? n.position.y + (n.height ?? NODE_HEIGHT) / 2
          : null,
      }));

      d3NodesRef.current = d3Nodes;

      // 시뮬레이션에 노드 데이터 주입 및 reheat
      const simulation = simulationRef.current;
      if (simulation) {
        simulation.nodes(d3Nodes);
        simulation.alpha(1).alphaTarget(0.3).restart();
      }

      // 드래그 시작 시 현재 위치 저장 (delta 계산용)
      previousDragPositionRef.current = {
        x: draggedNode.position.x,
        y: draggedNode.position.y,
      };
    },
    [nodes, edges],
  );

  const onNodeDrag = useCallback(
    (event: React.MouseEvent, draggedNode: Node) => {
      // 드래그 중에 가까운 노드 찾기
      const closestNode = findClosestNodeInRange(draggedNode, nodes, edges);
      // 이미 연결된 노드는 hover 효과 제외
      const isInvalid =
        closestNode &&
        isInvalidConnection(closestNode.id, draggedNode.id, edges);
      setHoveredNodeId(isInvalid ? null : (closestNode?.id ?? null));

      // 좌우 전환 시 서브트리 대칭 이동 (드래그 노드 기준, 반대편 핸들 방향)
      let didMirrorSubtree = false;
      const previousPosition = previousDragPositionRef.current; //드래그 노드
      if (previousPosition && !draggedNode.data?.isMain) {
        const mainNode = getMainNodeForSubtree(draggedNode.id, nodes, edges);
        if (mainNode) {
          const mainAxisX = mainNode.position.x + NODE_WIDTH / 2;
          const nodeWidth = draggedNode.width ?? NODE_WIDTH;
          const nodeHeight = draggedNode.height ?? NODE_HEIGHT;
          const beforeCenterX = previousPosition.x + nodeWidth / 2; //드래그 노드의 중앙값
          const afterCenterX = draggedNode.position.x + nodeWidth / 2;
          const beforeSide = beforeCenterX < mainAxisX ? "left" : "right";
          const afterSide = afterCenterX < mainAxisX ? "left" : "right";

          if (beforeSide !== afterSide) {
            const subtreeIds = getDescendantIds(draggedNode.id, edges);

            // 이전 프레임 드래그 노드의 중심점 (D3 좌표)
            const beforeDraggedCenterX = beforeCenterX;
            const beforeDraggedCenterY = previousPosition.y + nodeHeight / 2;

            // 현재 프레임 드래그 노드의 중심점 (D3 좌표)
            const afterDraggedCenterX = afterCenterX;
            const afterDraggedCenterY = draggedNode.position.y + nodeHeight / 2;

            d3NodesRef.current.forEach((d3Node) => {
              if (!subtreeIds.has(d3Node.id)) return;

              // 이전 프레임에서 드래그 노드와 자식 노드 사이의 거리
              const distanceX = (d3Node.x ?? 0) - beforeDraggedCenterX;
              const distanceY = (d3Node.y ?? 0) - beforeDraggedCenterY;

              // 현재 프레임 드래그 노드 기준으로 거리 유지 (x는 대칭, y는 동일)
              const mirroredCenterX = afterDraggedCenterX - distanceX;
              const mirroredCenterY = afterDraggedCenterY + distanceY;

              d3Node.x = mirroredCenterX;
              d3Node.y = mirroredCenterY;
              if (d3Node.fx != null) {
                d3Node.fx = mirroredCenterX;
              }
              if (d3Node.fy != null) {
                d3Node.fy = mirroredCenterY;
              }
            });
            didMirrorSubtree = true;
          }
        }
      }

      // 부모가 움직인 거리(delta) 계산
      const delta = previousDragPositionRef.current
        ? {
            x: draggedNode.position.x - previousDragPositionRef.current.x,
            y: draggedNode.position.y - previousDragPositionRef.current.y,
          }
        : { x: 0, y: 0 };

      // 현재 위치를 다음 계산을 위해 저장
      previousDragPositionRef.current = {
        x: draggedNode.position.x,
        y: draggedNode.position.y,
      };

      // D3 시뮬레이션에서 드래그 중인 노드의 고정 위치 업데이트
      const d3Node = d3NodesRef.current.find((n) => n.id === draggedNode.id);
      if (d3Node) {
        d3Node.fx =
          draggedNode.position.x + (draggedNode.width ?? NODE_WIDTH) / 2;
        d3Node.fy =
          draggedNode.position.y + (draggedNode.height ?? NODE_HEIGHT) / 2;
      }

      // 자식 노드들도 delta만큼 이동 (대칭 이동한 프레임은 제외, Alt 키 누르면 단독 이동)
      if (!didMirrorSubtree && !event.altKey) {
        const childrenIds = getDescendantIds(draggedNode.id, edges);

        childrenIds.forEach((childId) => {
          const d3ChildNode = d3NodesRef.current.find((n) => n.id === childId);
          if (d3ChildNode && d3ChildNode.fx != null && d3ChildNode.fy != null) {
            // 기존 fx/fy에 delta를 더해서 부모와 함께 이동
            d3ChildNode.fx += delta.x;
            d3ChildNode.fy += delta.y;
          }
        });
      }
    },
    [nodes, edges],
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, draggedNode: Node) => {
      // hover된 노드가 있으면 연결 생성
      if (hoveredNodeId) {
        const newParent = nodes.find((n) => n.id === hoveredNodeId);
        if (
          newParent &&
          !isInvalidConnection(newParent.id, draggedNode.id, edges)
        ) {
          // 1. 기존 부모와의 연결 끊기
          const existingParentEdge = edges.find(
            (edge) => edge.target === draggedNode.id,
          );

          // 2. 드래그 중 대칭 이동을 사용하므로 드롭 시 대칭 이동은 스킵

          // 3. 엣지 업데이트 (기존 부모 연결 끊고, 새 부모 연결)
          setEdges((prev) => {
            // 기존 부모 연결 제거
            const filtered = existingParentEdge
              ? prev.filter((edge) => edge.id !== existingParentEdge.id)
              : prev;

            // 새 부모 연결 추가
            const newEdge = buildEdgePresentation(
              {
                id: `e-${newParent.id}-${draggedNode.id}-${Date.now()}`,
                source: newParent.id,
                target: draggedNode.id,
              },
              nodes,
            );

            return [...filtered, newEdge];
          });
        }
      }

      // D3 시뮬레이션 종료: fx, fy 해제 및 alphaTarget(0) 설정
      isDraggingRef.current = false;

      // 드래그 노드와 자식들의 fx, fy 모두 해제
      const childrenIds = getDescendantIds(draggedNode.id, edges);
      const allNodesToRelease = [draggedNode.id, ...childrenIds];

      allNodesToRelease.forEach((nodeId) => {
        const d3Node = d3NodesRef.current.find((n) => n.id === nodeId);
        if (d3Node) {
          d3Node.fx = null;
          d3Node.fy = null;
        }
      });

      const simulation = simulationRef.current;
      if (simulation) {
        simulation.alphaTarget(0);
      }

      // hover 상태 초기화
      setHoveredNodeId(null);

      // 드래그 위치 초기화
      previousDragPositionRef.current = null;
    },
    [nodes, edges, hoveredNodeId],
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

  useEffect(() => {
    if (focusedNodeId) {
      const node = nodes.find((n) => n.id === focusedNodeId);
      if (node) {
        const x = node.position.x + (node.width ?? NODE_WIDTH) / 2;
        const y = node.position.y + (node.height ?? NODE_HEIGHT) / 2;
        setCenter(x, y, { zoom: 1, duration: 800 });

        // 포커스 애니메이션이 끝나면 선택 해제
        setTimeout(() => {
          onFocusComplete?.();
        }, 800); // duration과 동일
      }
    }
  }, [focusedNodeId, nodes, setCenter, onFocusComplete]);

  return (
    <div className="w-full h-full bg-background">
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        fitView
        connectionMode={ConnectionMode.Loose}
      />
    </div>
  );
}

interface GraphCanvasProps {
  focusedNodeId?: string | null;
  onFocusComplete?: () => void;
}

export default function GraphCanvas({
  focusedNodeId = null,
  onFocusComplete,
}: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner
        focusedNodeId={focusedNodeId}
        onFocusComplete={onFocusComplete}
      />
    </ReactFlowProvider>
  );
}
