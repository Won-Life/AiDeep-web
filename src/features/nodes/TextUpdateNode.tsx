'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Handle,
  Position,
  type NodeProps,
  useUpdateNodeInternals,
} from '@xyflow/react';
import { NodeEditorPanel } from '@/features/editor/NodeEditorPanel';
import { useYjsProvider } from '@/hooks/useYjsProvider';
import { useGraphLayout } from '@/app/graph/context';
import { COLOR_PALETTE } from '@/features/graph/constants/colors';

// 같은 userId는 항상 같은 커서 색상을 갖도록 보장 (협업 시 사용자 식별용)
function getUserCursorColor(userId: string): string {
  if (!userId) return COLOR_PALETTE[0].text;
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length].text;
}

export type NodeView = {
  title?: string;
  color?: string;
  textColor?: string; // 텍스트 색상
  isMain?: boolean; // 중심 노드인지 서브 노드인지 구분
  sideRelativeToParent?: 'left' | 'right';
  handleSide?: 'left' | 'right'; // Canvas가 위치 변경마다 재계산하는 핸들 방향
  hasParent?: boolean; // 부모 노드 존재 여부
  showInputBox?: boolean; // 입력박스 표시 여부
  isHovered?: boolean; // 드래그 중 hover 상태
  workspaceId?: string; // 전체화면 이동 시 query param으로 사용
  onChange?: (nodeId: string, value: string) => void;
};

export function TextUpdaterNode({ data, id }: NodeProps) {
  const router = useRouter();
  const updateNodeInternals = useUpdateNodeInternals();
  const nodeData = data as NodeView;
  const isMain = nodeData.isMain ?? false;
  const hasParent = nodeData.hasParent ?? true; // 기본값은 부모가 있다고 가정
  const showInputBox = nodeData.showInputBox ?? false;

  const { userMe } = useGraphLayout();
  const userName = userMe?.username ?? 'Anonymous';
  const cursorColor = getUserCursorColor(userMe?.userId ?? '');

  const { provider: collabProvider } = useYjsProvider({
    nodeId: showInputBox ? id : null,
    userName,
    userColor: cursorColor,
  });

  // sideRelativeToParent는 최초 생성 시점에만 설정되므로 handleSide를 사용
  const sideRelativeToParent = (nodeData.handleSide ??
    nodeData.sideRelativeToParent ??
    'right') as 'left' | 'right';
  const sourceHandlePosition =
    sideRelativeToParent === 'left' ? Position.Left : Position.Right;
  const isHovered = nodeData.isHovered ?? false;
  const [isNodeHovered, setIsNodeHovered] = useState(false);

  // 부모가 없는 서브 노드는 양쪽에 핸들 표시
  const PLACEHOLDER = isMain ? '중심 노드' : '서브 노드';

  const label = nodeData.title || '';
  const isEmpty = label === '';

  // 핸들 구성이 바뀌면 React Flow 내부 핸들 bounds를 즉시 갱신
  useEffect(() => {
    if (id) {
      updateNodeInternals(id);
    }
  }, [id, sideRelativeToParent, hasParent, updateNodeInternals]);

  // 중심 노드: 네모난 형태, 큰 패딩, 배경 없이 테두리만
  // 서브 노드: 동그란 형태, 작은 패딩, 배경색 채움
  const containerClasses = isMain
    ? 'text-updater-node rounded-lg border'
    : 'text-updater-node rounded-full';

  // React Flow 기본 엣지 색상과 동일한 회색 (#b1b1b7)
  const EDGE_COLOR = '#D9D9D9';

  const containerStyle = isMain
    ? {
        backgroundColor: nodeData.color || '#ffffff',
        borderColor: isHovered ? '#93C5FD' : EDGE_COLOR,
        borderWidth: isHovered ? '3px' : '1px',
      }
    : {
        backgroundColor: nodeData.color || '#ffffff',
        border: isHovered ? '3px solid #93C5FD' : 'none', // hover 시 연한 파란색 테두리
      };

  return (
    <div className="relative">
      {/* 노션 에디터 패널 - 노드 뒤에 배치 */}
      {showInputBox && (
        <NodeEditorPanel
          nodeId={id}
          borderColor={EDGE_COLOR}
          handleSide={sideRelativeToParent}
          onExpandClick={() =>
            router.push(
              `/graph/node/${id}?workspaceId=${nodeData.workspaceId ?? ''}`,
            )
          }
          collabProvider={collabProvider}
          username={userName}
          cursorColor={cursorColor}
          onFirstLineChange={(text) => nodeData.onChange?.(id, text)}
        />
      )}

      {/* 노드 - 입력박스보다 앞에 배치 */}
      <div
        className={containerClasses}
        style={{
          ...containerStyle,
          position: 'relative',
          zIndex: 10,
          maxWidth: '200px',
          minWidth: `${PLACEHOLDER.length}em`,
          padding: isMain ? '26px 36px' : '6px 12px',
        }}
        onMouseEnter={() => setIsNodeHovered(true)}
        onMouseLeave={() => setIsNodeHovered(false)}
      >
        <div
          className="text-center select-none"
          style={{
            color: isEmpty
              ? 'rgb(var(--ds-gray-500))'
              : nodeData.textColor || 'rgb(var(--foreground))',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
            lineHeight: '1.4em',
            maxHeight: '2.8em',
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
                sideRelativeToParent === 'right'
                  ? Position.Left
                  : Position.Right
              }
              id={
                sideRelativeToParent === 'right'
                  ? 'target-left'
                  : 'target-right'
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
