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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from '@/types/nodeTypes';

// DB 저장 함수 (예시 - 실제 API로 교체)
async function saveNodesToDB(nodes: Node[], edges: Edge[]) {
  // 실제로는 API 호출
  // await fetch('/api/nodes', { method: 'POST', body: JSON.stringify({ nodes, edges }) });
  console.log('Saving to DB:', { nodes, edges });
}

const initialNodes = [
  { id: 'n1', type: 'textUpdater', position: { x: 0, y: 0 }, data: { label: 'Node 1', color: '#ff6b6b' } },
  { id: 'n2', type: 'textUpdater', position: { x: 0, y: 100 }, data: { label: 'Node 2', color: '#4ecdc4' } },
  // { id: 'n3', type: 'textUpdater', position: { x: 0, y: 200 }, data: { label: 'Node 3' } },
  // { id: 'n4', type: 'textUpdater', position: { x: 0, y: 300 }, data: { label: 'Node 4' } },
  // { id: 'n5', type: 'textUpdater', position: { x: 0, y: 400 }, data: { label: 'Node 5' } },
  // { id: 'n6', type: 'textUpdater', position: { x: 0, y: 500 }, data: { label: 'Node 6' } },
  // { id: 'n7', type: 'textUpdater', position: { x: 0, y: 600 }, data: { label: 'Node 7' } },
  // { id: 'n8', type: 'textUpdater', position: { x: 0, y: 700 }, data: { label: 'Node 8' } },
  // { id: 'n9', type: 'textUpdater', position: { x: 0, y: 800 }, data: { label: 'Node 9' } },
  // { id: 'n10', type: 'textUpdater', position: { x: 0, y: 900 }, data: { label: 'Node 10' } },
  // { id: 'n11', type: 'textUpdater', position: { x: 0, y: 1000 }, data: { label: 'Node 11' } },
  // { id: 'n12', type: 'textUpdater', position: { x: 0, y: 1100 }, data: { label: 'Node 12' } },
  // { id: 'n13', type: 'textUpdater', position: { x: 0, y: 1200 }, data: { label: 'Node 13' } },
  // { id: 'n14', type: 'textUpdater', position: { x: 0, y: 1300 }, data: { label: 'Node 14' } },
  // { id: 'n15', type: 'textUpdater', position: { x: 0, y: 1400 }, data: { label: 'Node 15' } },
  // { id: 'n16', type: 'textUpdater', position: { x: 0, y: 1500 }, data: { label: 'Node 16' } },
  // { id: 'n17', type: 'textUpdater', position: { x: 0, y: 1600 }, data: { label: 'Node 17' } },
  // { id: 'n18', type: 'textUpdater', position: { x: 0, y: 1700 }, data: { label: 'Node 18' } },
  // { id: 'n19', type: 'textUpdater', position: { x: 0, y: 1800 }, data: { label: 'Node 19' } },
  // { id: 'n20', type: 'textUpdater', position: { x: 0, y: 1900 }, data: { label: 'Node 20' } },
];
const initialEdges = [
  { id: 'n1-n2', source: 'n1', target: 'n2' },
  { id: 'n1-n3', source: 'n1', target: 'n3' },
  { id: 'n1-n4', source: 'n1', target: 'n4' },
  { id: 'n1-n5', source: 'n1', target: 'n5' },
  { id: 'n1-n6', source: 'n1', target: 'n6' },
  { id: 'n1-n7', source: 'n1', target: 'n7' },
  { id: 'n1-n8', source: 'n1', target: 'n8' },
];

export default function App() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

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

  // DB 저장 로직: nodes나 edges가 변경될 때마다 저장
  useEffect(() => {
    saveNodesToDB(nodes, edges);
  }, [nodes, edges]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      />
    </div>
  );
}