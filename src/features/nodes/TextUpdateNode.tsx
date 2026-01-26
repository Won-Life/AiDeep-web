import { useState, useCallback, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

type TextUpdaterNodeData = {
  text?: string;
  label?: string;
  color?: string;
  isMain?: boolean; // 중심 노드인지 서브 노드인지 구분
  handleSide?: "left" | "right";
  onChange?: (nodeId: string, value: string) => void;
};

export function TextUpdaterNode({ data, id }: NodeProps) {
  const nodeData = data as TextUpdaterNodeData;
  const isMain = nodeData.isMain ?? false;
  const handleSide = nodeData.handleSide ?? "right";
  const handlePosition = handleSide === "left" ? Position.Left : Position.Right;
  
  // 로컬 state로 입력값 관리 (타이핑할 때마다 업데이트)
  const [localValue, setLocalValue] = useState(nodeData.text || '');

  // data.text가 외부에서 변경되면 로컬 state도 동기화
  useEffect(() => {
    setLocalValue(nodeData.text || '');
  }, [nodeData.text]);

  // 타이핑할 때는 로컬 state만 업데이트 (DB 저장 안 함)
  const handleChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(evt.target.value);
  }, []);

  // 엔터 키를 누를 때만 부모에게 알림 (DB 저장)
  const handleKeyDown = useCallback(
    (evt: React.KeyboardEvent<HTMLInputElement>) => {
      if (evt.key === 'Enter' && nodeData.onChange && id) {
        nodeData.onChange(id, localValue);
        evt.currentTarget.blur(); // 포커스 해제 (선택사항)
      }
    },
    [id, localValue, nodeData],
  );

  // 중심 노드: 네모난 형태, 큰 패딩, 배경 없이 테두리만
  // 서브 노드: 동그란 형태, 작은 패딩, 배경색 채움
  const containerClasses = isMain
    ? 'text-updater-node px-4 py-3 rounded-lg border-2' // 중심 노드: 네모난 형태, 테두리
    : 'text-updater-node px-3 py-2 rounded-full'; // 서브 노드: 동그란 형태

  // React Flow 기본 엣지 색상과 동일한 회색 (#b1b1b7)
  const EDGE_COLOR = '#b1b1b7';

  const containerStyle = isMain
    ? {
        backgroundColor: 'transparent',
        borderColor: EDGE_COLOR, // 엣지와 같은 회색으로 고정
      }
    : {
        backgroundColor: nodeData.color || '#ffffff',
      };

  return (
    <div className={containerClasses} style={containerStyle}>
      <div>
        <input
          id="text"
          name="text"
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="nodrag bg-transparent border-none outline-none w-full text-black placeholder-gray-400 text-center"
          placeholder={isMain ? "중심 노드 입력" : "서브 노드 입력"}
        />
      </div>
      {isMain ? (
        <>
          <Handle type="target" position={Position.Left} id="target-left" />
          <Handle type="target" position={Position.Right} id="target-right" />
          <Handle type="source" position={Position.Left} id="source-left" />
          <Handle type="source" position={Position.Right} id="source-right" />
        </>
      ) : (
        <>
          <Handle type="target" position={handlePosition} id="target-side" />
          <Handle type="source" position={handlePosition} id="source-side" />
        </>
      )}
    </div>
  );
}
