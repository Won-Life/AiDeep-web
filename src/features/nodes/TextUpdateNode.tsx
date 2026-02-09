import { useState, useCallback, useEffect } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  useUpdateNodeInternals,
} from "@xyflow/react";

export type NodeData = {
  text?: string;
  label?: string;
  color?: string;
  textColor?: string; // 텍스트 색상
  isMain?: boolean; // 중심 노드인지 서브 노드인지 구분
  handleSide?: "left" | "right";
  hasParent?: boolean; // 부모 노드 존재 여부
  showInputBox?: boolean; // 입력박스 표시 여부
  isHovered?: boolean; // 드래그 중 hover 상태
  onChange?: (nodeId: string, value: string) => void;
};

export function TextUpdaterNode({ data, id }: NodeProps) {
  const updateNodeInternals = useUpdateNodeInternals();
  const nodeData = data as NodeData;
  const isMain = nodeData.isMain ?? false;
  const hasParent = nodeData.hasParent ?? true; // 기본값은 부모가 있다고 가정
  const handleSide = nodeData.handleSide ?? "right";
  const handlePosition = handleSide === "left" ? Position.Left : Position.Right;
  const showInputBox = nodeData.showInputBox ?? false;
  const isHovered = nodeData.isHovered ?? false;

  // 부모가 없는 서브 노드는 양쪽에 핸들 표시
  const showBothHandles = isMain || !hasParent;

  // 로컬 state로 입력값 관리 (타이핑할 때마다 업데이트)
  const [localValue, setLocalValue] = useState(nodeData.text || "");

  // data.text가 외부에서 변경되면 로컬 state도 동기화
  useEffect(() => {
    setLocalValue(nodeData.text || "");
  }, [nodeData.text]);

  // 핸들 구성이 바뀌면 React Flow 내부 핸들 bounds를 즉시 갱신
  useEffect(() => {
    if (id) {
      updateNodeInternals(id);
    }
  }, [id, handleSide, showBothHandles, updateNodeInternals]);

  // 타이핑할 때는 로컬 state만 업데이트 (DB 저장 안 함)
  const handleChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(evt.target.value);
    },
    [],
  );

  // 엔터 키를 누를 때만 부모에게 알림 (DB 저장)
  const handleKeyDown = useCallback(
    (evt: React.KeyboardEvent<HTMLInputElement>) => {
      if (evt.key === "Enter" && nodeData.onChange && id) {
        nodeData.onChange(id, localValue);
        evt.currentTarget.blur(); // 포커스 해제 (선택사항)
      }
    },
    [id, localValue, nodeData],
  );

  // 중심 노드: 네모난 형태, 큰 패딩, 배경 없이 테두리만
  // 서브 노드: 동그란 형태, 작은 패딩, 배경색 채움
  const containerClasses = isMain
    ? "text-updater-node px-4 py-3 rounded-lg border-2" // 중심 노드: 네모난 형태, 테두리
    : "text-updater-node px-3 py-2 rounded-full"; // 서브 노드: 동그란 형태

  // React Flow 기본 엣지 색상과 동일한 회색 (#b1b1b7)
  const EDGE_COLOR = "#D9D9D9";

  const containerStyle = isMain
    ? {
        backgroundColor: nodeData.color || "#ffffff",
        borderColor: isHovered ? "#93C5FD" : EDGE_COLOR, // hover 시 연한 파란색
        borderWidth: isHovered ? "3px" : "2px", // hover 시 두께 증가
      }
    : {
        backgroundColor: nodeData.color || "#ffffff",
        border: isHovered ? "3px solid #93C5FD" : "none", // hover 시 연한 파란색 테두리
      };

  return (
    <div className="relative">
      {/* 입력박스 - 노드 뒤에 배치 */}
      {/* TODO: 새 노드 생성될 때 숨김 처리 / 입력 박스 클릭 시 숨김 처리 X -> 숨김 처리 조건: 입력 박스 외부 클릭 시로 설정*/}
      {showInputBox && (
        <div
          className="absolute bg-white border rounded-lg shadow-md p-4"
          style={{
            width: "300px",
            height: "200px",
            top: "50%", // 노드 높이의 중간부터 시작
            borderColor: EDGE_COLOR, // 엣지와 같은 색상
            ...(handleSide === "left"
              ? {
                  // 좌측 노드: 입력박스의 우측이 노드의 우측 끝과 맞닿음
                  right: 0,
                }
              : {
                  // 우측 노드: 입력박스의 좌측이 노드의 좌측 끝과 맞닿음
                  left: 0,
                }),
            zIndex: 0, // 노드보다 뒤, 다른 노드들보다는 위
          }}
        >
          <p className="text-sm text-muted">입력칸 (임시)</p>
          <p className="text-xs text-muted mt-2">
            Node ID: {id}
            <br />
            Side: {handleSide}
          </p>
        </div>
      )}

      {/* 노드 - 입력박스보다 앞에 배치 */}
      <div
        className={containerClasses}
        style={{ ...containerStyle, position: "relative", zIndex: 10 }}
      >
        <div>
          <input
            id="text"
            name="text"
            value={localValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="nodrag bg-transparent border-none outline-none w-full placeholder-muted text-center"
            style={{ color: nodeData.textColor || "rgb(var(--foreground))" }}
            placeholder={isMain ? "중심 노드 입력" : "서브 노드 입력"}
          />
        </div>
        {showBothHandles ? (
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
    </div>
  );
}
