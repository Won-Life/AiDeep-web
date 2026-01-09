'use client';
import { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
  type Edge,
  ConnectionMode,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from '@/types/nodeTypes';
import { edgeTypes } from '@/types/edgeTypes';
import { initialEdges, initialNodes } from '@/mock/mindmap';

// DB 저장 함수 (예시)
async function saveNodesToDB(nodes: Node[], edges: Edge[]) {
  console.log('Saving to DB:', { nodes, edges });
}

// TODO: uuid로 변경
function makeNodeId() {
  return `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

/* =========================
   Snap / Auto-connect utils
   ========================= */

const SNAP_RADIUS = 120;

function getDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function findSnapTarget(dragged: Node, nodes: Node[]): Node | null {
  let closest: Node | null = null;
  let min = Infinity;

  for (const node of nodes) {
    if (node.id === dragged.id) continue;

    const dist = getDistance(dragged.position, node.position);
    if (dist < SNAP_RADIUS && dist < min) {
      min = dist;
      closest = node;
    }
  }

  return closest;
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
          node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node,
        ),
      );
    },
    [],
  );

  const nodesWithCallbacks = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onChange: (nodeId: string, value: string) =>
        handleNodeDataChange(nodeId, { text: value }),
    },
  }));

  /* =========================
     React Flow handlers
     ========================= */
  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((snapshot) => applyNodeChanges(changes, snapshot)),
    [],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((snapshot) => applyEdgeChanges(changes, snapshot)),
    [],
  );

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((snapshot) => addEdge(params, snapshot)),
    [],
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
        type: 'textUpdater',
        position,
        data: {
          text: '새 노드',
          isMain: false,
          // color는 DS 토큰으로 가는 게 좋지만 일단 기존 패턴 유지
          color: "#EFEFEF",
        },
      };

      setNodes((prev) => [...prev, newNode]);
    },
    [screenToFlowPosition]
  );

  function getParentId(nodeId: string, edges: Edge[]): string | null {
    // 첫 번째 incoming edge의 source를 부모로 본다.
    // (나중에 다중 부모를 허용하면 여기 로직을 바꿔야 함)
    const incoming = edges.find((e) => e.target === nodeId);
    return incoming?.source ?? null;
  }

  /* =========================
     Drag stop → auto connect
     ========================= */
  const onNodeDragStop = useCallback(
  (_: React.MouseEvent, draggedNode: Node) => {
    const target = findSnapTarget(draggedNode, nodes);
    if (!target) return;

    // TODO: 모든 자식 노드 연결 금지
    // 형제 노드면 연결 금지
    const draggedParentId = getParentId(draggedNode.id, edges);
    const targetParentId = getParentId(target.id, edges);

    const areSiblings =
      draggedParentId !== null &&
      targetParentId !== null &&
      draggedParentId === targetParentId;

    if (areSiblings) return;

    // 이미 연결돼 있으면 무시 (양방향 포함)
    const alreadyConnected = edges.some(
      (e) =>
        (e.source === target.id && e.target === draggedNode.id) ||
        (e.source === draggedNode.id && e.target === target.id),
    );
    if (alreadyConnected) return;

    const newEdge: Edge = {
      id: `e-${target.id}-${draggedNode.id}-${Date.now()}`,
      source: target.id,
      target: draggedNode.id,
      type: "smoothstep",
      sourceHandle: "source-right",
      targetHandle: "target-left",
    };

    setEdges((prev) => [...prev, newEdge]);
  },
  [nodes, edges],
);


  /* =========================
     Persist
     ========================= */
  useEffect(() => {
    saveNodesToDB(nodes, edges);
  }, [nodes, edges]);

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
