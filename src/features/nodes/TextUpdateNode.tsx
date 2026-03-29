import { useEffect, useState } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { NotionEditor } from "@/features/editor/NotionEditor";

function extractLabelFromContent(content: string | undefined): string | null {
  if (!content) return null;
  try {
    const state = JSON.parse(content);
    const children: Array<{
      type: string;
      tag?: string;
      children?: Array<{ text?: string }>;
    }> = state?.root?.children ?? [];
    for (const node of children) {
      const text = node.children
        ?.map((c) => c.text ?? "")
        .join("")
        .trim();
      if (text) return text;
    }
    return null;
  } catch {
    return null;
  }
}

export type NodeData = {
  text?: string;
  content?: string; // 에디터 JSON 내용
  label?: string;
  color?: string;
  textColor?: string; // 텍스트 색상
  isMain?: boolean; // 중심 노드인지 서브 노드인지 구분
  sideRelativeToParent?: "left" | "right";
  handleSide?: "left" | "right"; // Canvas가 위치 변경마다 재계산하는 핸들 방향
  hasParent?: boolean; // 부모 노드 존재 여부
  showInputBox?: boolean; // 입력박스 표시 여부
  isHovered?: boolean; // 드래그 중 hover 상태
  onChange?: (nodeId: string, value: string) => void;
  onContentChange?: (nodeId: string, content: string) => void; // 에디터 내용 저장 콜백
};

export function TextUpdaterNode({ data, id }: NodeProps) {
  const updateNodeInternals = useUpdateNodeInternals();
  const nodeData = data as NodeData;
  const isMain = nodeData.isMain ?? false;
  const hasParent = nodeData.hasParent ?? true; // 기본값은 부모가 있다고 가정
  // sideRelativeToParent는 최초 생성 시점에만 설정되므로 handleSide를 사용
  const sideRelativeToParent = (nodeData.handleSide ??
    nodeData.sideRelativeToParent ??
    "right") as "left" | "right";
  const sourceHandlePosition =
    sideRelativeToParent === "left" ? Position.Left : Position.Right;
  const showInputBox = nodeData.showInputBox ?? false;
  const isHovered = nodeData.isHovered ?? false;
  const [isNodeHovered, setIsNodeHovered] = useState(false);

  // 부모가 없는 서브 노드는 양쪽에 핸들 표시
  const PLACEHOLDER = isMain ? "중심 노드" : "서브 노드";

  // content에서 첫 텍스트를 추출, 없으면 text 필드로 fallback
  const label =
    extractLabelFromContent(nodeData.content) || nodeData.text || "";
  const isEmpty = label === "";

  // 핸들 구성이 바뀌면 React Flow 내부 핸들 bounds를 즉시 갱신
  useEffect(() => {
    if (id) {
      updateNodeInternals(id);
    }
  }, [id, sideRelativeToParent, hasParent, updateNodeInternals]);

  // 중심 노드: 네모난 형태, 큰 패딩, 배경 없이 테두리만
  // 서브 노드: 동그란 형태, 작은 패딩, 배경색 채움
  const containerClasses = isMain
    ? "text-updater-node rounded-lg border"
    : "text-updater-node rounded-full";

  // React Flow 기본 엣지 색상과 동일한 회색 (#b1b1b7)
  const EDGE_COLOR = "#D9D9D9";

  const containerStyle = isMain
    ? {
        backgroundColor: nodeData.color || "#ffffff",
        borderColor: isHovered ? "#93C5FD" : EDGE_COLOR,
        borderWidth: isHovered ? "3px" : "1px",
      }
    : {
        backgroundColor: nodeData.color || "#ffffff",
        border: isHovered ? "3px solid #93C5FD" : "none", // hover 시 연한 파란색 테두리
      };

  return (
    <div className="relative">
      {/* 노션 에디터 패널 - 노드 뒤에 배치 */}
      {showInputBox && (
        <div
          className="absolute bg-white border rounded-lg shadow-lg overflow-hidden flex flex-col"
          style={{
            width: "360px",
            minHeight: "220px",
            maxHeight: "480px",
            top: "100%",
            marginTop: "4px",
            borderColor: EDGE_COLOR,
            ...(sideRelativeToParent === "left" ? { right: 0 } : { left: 0 }),
            zIndex: 0,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <NotionEditor
            nodeId={id}
            initialContent={nodeData.content}
            onSave={nodeData.onContentChange}
          />
        </div>
      )}

      {/* 노드 - 입력박스보다 앞에 배치 */}
      <div
        className={containerClasses}
        style={{
          ...containerStyle,
          position: "relative",
          zIndex: 10,
          maxWidth: "200px",
          minWidth: `${PLACEHOLDER.length}em`,
          padding: isMain ? "26px 36px" : "6px 12px",
        }}
        onMouseEnter={() => setIsNodeHovered(true)}
        onMouseLeave={() => setIsNodeHovered(false)}
      >
        <div
          className="text-center select-none"
          style={{
            color: isEmpty
              ? "#aaaaaa"
              : nodeData.textColor || "rgb(var(--foreground))",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
            lineHeight: "1.4em",
            maxHeight: "2.8em",
          }}
        >
          {isEmpty ? PLACEHOLDER : label}
        </div>
        {!hasParent ? (
          <>
            <Handle
              type="source"
              position={Position.Left}
              id="source-left"
              style={{ opacity: isNodeHovered ? 1 : 0 }}
            />
            <Handle
              type="target"
              position={Position.Left}
              id="target-left"
              style={{ opacity: isNodeHovered ? 1 : 0 }}
            />
            <Handle
              type="source"
              position={Position.Right}
              id="source-right"
              style={{ opacity: isNodeHovered ? 1 : 0 }}
            />
            <Handle
              type="target"
              position={Position.Right}
              id="target-right"
              style={{ opacity: isNodeHovered ? 1 : 0 }}
            />
          </>
        ) : (
          <>
            <Handle
              type="target"
              position={
                sideRelativeToParent === "right"
                  ? Position.Left
                  : Position.Right
              }
              id={
                sideRelativeToParent === "right"
                  ? "target-left"
                  : "target-right"
              }
              style={{ opacity: isNodeHovered ? 1 : 0 }}
            />
            <Handle
              type="source"
              position={sourceHandlePosition}
              id={`source-${sideRelativeToParent}`}
              style={{ opacity: isNodeHovered ? 1 : 0 }}
            />
          </>
        )}
      </div>
    </div>
  );
}
