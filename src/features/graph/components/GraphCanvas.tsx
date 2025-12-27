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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from '@/types/nodeTypes';
import { edgeTypes } from '@/types/edgeTypes';

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

// 마인드맵 데이터: React Flow 형식
// 각 레벨마다 세로로 한 줄 정렬
const initialNodes: Node[] = [
  // ===== Level 0: 메인 노드들 (y: 0) =====
  {
    id: 'school',
    type: 'textUpdater',
    position: { x: -700, y: -200 },
    data: { text: '✏️ 학교 공부', isMain: true, color: COLOR_SCHOOL_MAIN },
  },
  {
    id: 'design',
    type: 'textUpdater',
    position: { x: -300, y: 500 },
    data: { text: '🎨 디자인', isMain: true, color: COLOR_DESIGN_MAIN },
  },
  {
    id: 'aideep',
    type: 'textUpdater',
    position: { x: 200, y: 100 },
    data: { text: '🤔 AiDeep', isMain: true, color: COLOR_AIDEEP_MAIN },
  },

  // ===== Level 1: 1차 하위 노드들 =====
  // school 하위 (school: x: -600, y: -200) → 하위 노드들을 school 오른쪽에 세로로 배치
  {
    id: 'visual-essay',
    type: 'textUpdater',
    position: { x: -400, y: -250 },
    data: { text: '비주얼에세이', isMain: false, color: COLOR_SCHOOL_SUB },
  },
  {
    id: 'interactive-design',
    type: 'textUpdater',
    position: { x: -400, y: -150 },
    data: { text: '인터랙티브디자인', isMain: false, color: COLOR_SCHOOL_SUB },
  },
  {
    id: 'typography',
    type: 'textUpdater',
    position: { x: -400, y: -50 },
    data: { text: '타이포그래피심화연구', isMain: false, color: COLOR_SCHOOL_SUB },
  },
  {
    id: 'motion-graphics',
    type: 'textUpdater',
    position: { x: -400, y: 50 },
    data: { text: '모션그래픽스', isMain: false, color: COLOR_SCHOOL_SUB },
  },
  // design 하위 (design: x: 300, y: 0) → 하위 노드들을 design 오른쪽에 세로로 배치
  {
    id: 'design-publish',
    type: 'textUpdater',
    position: { x: 100, y: 400 },
    data: { text: '출판', isMain: false, color: COLOR_DESIGN_SUB },
  },
  {
    id: 'design-visual',
    type: 'textUpdater',
    position: { x: 100, y: 500 },
    data: { text: '시각디자인', isMain: false, color: COLOR_DESIGN_SUB },
  },
  {
    id: 'design-uiux',
    type: 'textUpdater',
    position: { x: 100, y: 600 },
    data: { text: 'UI/UX', isMain: false, color: COLOR_DESIGN_SUB },
  },
  // aideep 하위 (aideep: x: 0, y: 100) → 하위 노드들을 aideep 오른쪽에 세로로 배치
  {
    id: 'aideep-plan',
    type: 'textUpdater',
    position: { x: 500, y: 0 },
    data: { text: '기획', isMain: false, color: COLOR_AIDEEP_SUB },
  },
  {
    id: 'aideep-discuss',
    type: 'textUpdater',
    position: { x: 500, y: 100 },
    data: { text: '의논사항', isMain: false, color: COLOR_AIDEEP_SUB },
  },
  {
    id: 'aideep-branding',
    type: 'textUpdater',
    position: { x: 500, y: 200 },
    data: { text: '브랜딩', isMain: false, color: COLOR_AIDEEP_SUB },
  },
  {
    id: 'aideep-design',
    type: 'textUpdater',
    position: { x: 500, y: 300 },
    data: { text: '디자인', isMain: false, color: COLOR_AIDEEP_SUB },
  },

  // ===== Level 2: 2차 하위 노드들 =====
  // typography 하위 (typography: x: -400, y: -50) → 하위 노드들을 typography 오른쪽에 세로로 배치
  {
    id: 'typography-mid',
    type: 'textUpdater',
    position: { x: -100, y: -100 },
    data: { text: '중간과제', isMain: false, color: COLOR_SCHOOL_SUB2 },
  },
  {
    id: 'typography-final',
    type: 'textUpdater',
    position: { x: -100, y: 0 },
    data: { text: '기말과제', isMain: false, color: COLOR_SCHOOL_SUB2 },
  },
  // motion-graphics 하위 (motion-graphics: x: -400, y: 50) → 하위 노드들을 motion-graphics 오른쪽에 세로로 배치
  {
    id: 'motion-mid-poster',
    type: 'textUpdater',
    position: { x: -100, y: 50 },
    data: { text: '중간_모션포스터', isMain: false, color: COLOR_SCHOOL_SUB2 },
  },
  {
    id: 'motion-quiz',
    type: 'textUpdater',
    position: { x: -100, y: 100 },
    data: { text: '퀴즈 준비', isMain: false, color: COLOR_SCHOOL_SUB2 },
  },
  {
    id: 'motion-final-team',
    type: 'textUpdater',
    position: { x: -100, y: 200 },
    data: { text: '기말·팀플', isMain: false, color: COLOR_SCHOOL_SUB2 },
  },
  // aideep-design 하위 (aideep-design: x: 200, y: 300) → 하위 노드들을 aideep-design 오른쪽에 세로로 배치
  {
    id: 'aideep-wireframe',
    type: 'textUpdater',
    position: { x: 800, y: 250 },
    data: { text: '와이어프레임', isMain: false, color: COLOR_AIDEEP_SUB2 },
  },
  {
    id: 'aideep-prototype',
    type: 'textUpdater',
    position: { x: 800, y: 350 },
    data: { text: '프로토타입', isMain: false, color: COLOR_AIDEEP_SUB2 },
  },
];

// 엣지 정의: 노드 간 연결 관계
// sourceHandle: 오른쪽 handle에서 나감, targetHandle: 왼쪽 handle로 들어옴
const initialEdges: Edge[] = [
  // 학교 공부 트리
  { id: 'e-school-visual', source: 'school', target: 'visual-essay', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },
  { id: 'e-school-interactive', source: 'school', target: 'interactive-design', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },
  { id: 'e-school-typography', source: 'school', target: 'typography', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },
  { id: 'e-typography-mid', source: 'typography', target: 'typography-mid', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },
  { id: 'e-typography-final', source: 'typography', target: 'typography-final', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },
  { id: 'e-school-motion', source: 'school', target: 'motion-graphics', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },
  { id: 'e-motion-mid', source: 'motion-graphics', target: 'motion-mid-poster', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },
  { id: 'e-motion-quiz', source: 'motion-graphics', target: 'motion-quiz', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },
  { id: 'e-motion-final', source: 'motion-graphics', target: 'motion-final-team', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },

  // AiDeep 트리
  { id: 'e-aideep-plan', source: 'aideep', target: 'aideep-plan', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },
  { id: 'e-aideep-discuss', source: 'aideep', target: 'aideep-discuss', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },
  { id: 'e-aideep-branding', source: 'aideep', target: 'aideep-branding', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },
  { id: 'e-aideep-design', source: 'aideep', target: 'aideep-design', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },
  { id: 'e-aideep-wireframe', source: 'aideep-design', target: 'aideep-wireframe', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },
  { id: 'e-aideep-prototype', source: 'aideep-design', target: 'aideep-prototype', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },

  // 디자인 큰 카테고리 트리
  { id: 'e-design-publish', source: 'design', target: 'design-publish', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },
  { id: 'e-design-visual', source: 'design', target: 'design-visual', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },
  { id: 'e-design-uiux', source: 'design', target: 'design-uiux', sourceHandle: 'source-right', targetHandle: 'target-left', type: 'smoothstep' },
];

export default function GraphCanvas() {
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
    <div className="w-full h-full bg-white">
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        connectionMode={ConnectionMode.Loose}
      />
    </div>
  );
}

