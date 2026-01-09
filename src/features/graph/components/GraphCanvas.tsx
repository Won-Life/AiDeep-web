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

// DB 저장 함수 (예시 - 실제 API로 교체)
async function saveNodesToDB(nodes: Node[], edges: Edge[]) {
  // 실제로는 API 호출
  // await fetch('/api/nodes', { method: 'POST', body: JSON.stringify({ nodes, edges }) });
  console.log('Saving to DB:', { nodes, edges });
}

// 색상 정의
const COLOR_SCHOOL_MAIN = '#ffffff'; // 메인 노드 테두리 색상 (학교 공부)
const COLOR_SCHOOL_SUB = '#e3f2fd'; // 서브 노드 배경 (학교 공부)
const COLOR_SCHOOL_SUB2 = '#bbdefb'; // 하위 서브 노드 배경 (학교 공부)

const COLOR_AIDEEP_MAIN = '#ffffff'; // 메인 노드 테두리 색상 (AiDeep)
const COLOR_AIDEEP_SUB = '#e8f5e9'; // 서브 노드 배경 (AiDeep)
const COLOR_AIDEEP_SUB2 = '#c8e6c9'; // 하위 서브 노드 배경 (AiDeep)

const COLOR_DESIGN_MAIN = '#ffe6e6'; // 메인 노드 테두리 색상 (디자인)
const COLOR_DESIGN_SUB = '#ffebee'; // 서브 노드 배경 (디자인)

// TODO: uuid로 변경
function makeNodeId() { 
  return `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function GraphCanvasInner() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const { screenToFlowPosition } = useReactFlow();


  // 노드 데이터 업데이트 핸들러 (TextUpdaterNode에서 호출)
  const handleNodeDataChange = useCallback((nodeId: string, newData: Record<string, unknown>) => {
    setNodes((nodesSnapshot) =>
      nodesSnapshot.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node,
      ),
    );
  }, []);

  // nodes를 업데이트하여 각 노드에 onChange 콜백 추가
  const nodesWithCallbacks = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onChange: (nodeId: string, value: string) => {
        handleNodeDataChange(nodeId, { text: value });
      },
    },
  }));

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot));
    },
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params: Connection) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );

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
        type: "textUpdater", // 기존 노드 타입 그대로
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
    [screenToFlowPosition]
  );

  // DB 저장 로직: nodes나 edges가 변경될 때마다 저장
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
  )
}
