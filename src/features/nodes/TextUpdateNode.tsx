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
import NodeContextMenu from '@/components/ui/NodeContextMenu';

// 같은 userId는 항상 같은 커서 색상을 갖도록 보장 (협업 시 사용자 식별용)
function getUserCursorColor(userId: string): string {
  if (!userId) return COLOR_PALETTE[0].text;
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length].text;
}

export interface NodeViewer {
  clientId: number;
  name: string;
  color: string;
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
  panelZIndex?: number; // 패널 z-index (포커스된 패널이 위)
  isHovered?: boolean; // 드래그 중 hover 상태
  workspaceId?: string; // 전체화면 이동 시 query param으로 사용
  viewers?: NodeViewer[]; // 이 노드를 보고 있는 다른 유저들
  isContextMenuOpen?: boolean; // 컨텍스트 메뉴 표시 여부
  onClosePanel?: (nodeId: string) => void; // 패널 닫기
  onFocusPanel?: (nodeId: string) => void; // 패널 포커스
  onChange?: (nodeId: string, value: string) => void;
};

export function TextUpdaterNode({ data, id }: NodeProps) {
  const router = useRouter();
  const updateNodeInternals = useUpdateNodeInternals();
  const nodeData = data as NodeView;
  const isMain = nodeData.isMain ?? false;
  const hasParent = nodeData.hasParent ?? true; // 기본값은 부모가 있다고 가정
  const showInputBox = nodeData.showInputBox ?? false;
  const isContextMenuOpen = nodeData.isContextMenuOpen ?? false;

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
  const viewers = (nodeData.viewers ?? []) as NodeViewer[];
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

  const viewerBorderColor = viewers.length > 0 ? viewers[0].color : null;

  const containerStyle = isMain
    ? {
        backgroundColor: nodeData.color || '#ffffff',
        borderColor: isHovered
          ? '#93C5FD'
          : viewerBorderColor ?? EDGE_COLOR,
        borderWidth: isHovered || viewerBorderColor ? '2px' : '1px',
      }
    : {
        backgroundColor: nodeData.color || '#ffffff',
        border: isHovered
          ? '3px solid #93C5FD'
          : viewerBorderColor
            ? `2px solid ${viewerBorderColor}`
            : 'none',
      };

  // 최대 3명 표시, 이후 +N
  const visibleViewers = viewers.slice(0, 3);
  const overflowCount = viewers.length - visibleViewers.length;

  return (
    <div className="relative">
      {/* 다른 유저 뷰어 표시 — 노드 위에 배치 */}
      {viewers.length > 0 && (
        <div
          className="absolute flex items-center gap-0.5"
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 4,
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          {visibleViewers.map((v) => (
            <div
              key={v.clientId}
              title={v.name}
              className="flex items-center justify-center rounded-full text-white text-[9px] font-bold leading-none select-none"
              style={{
                width: 20,
                height: 20,
                backgroundColor: v.color,
                border: '2px solid white',
                marginLeft: visibleViewers.indexOf(v) > 0 ? -4 : 0,
              }}
            >
              {v.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {overflowCount > 0 && (
            <div
              className="flex items-center justify-center rounded-full bg-gray-400 text-white text-[8px] font-bold leading-none select-none"
              style={{
                width: 20,
                height: 20,
                border: '2px solid white',
                marginLeft: -4,
              }}
            >
              +{overflowCount}
            </div>
          )}
        </div>
      )}

      {/* 컨텍스트 메뉴 - 노드 위에 배치 */}
      {isContextMenuOpen && (
        <div
          className="absolute"
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 8,
            zIndex: 50,
          }}
        >
          <NodeContextMenu />
        </div>
      )}

      {/* 노션 에디터 패널 - 노드 뒤에 배치 */}
      {showInputBox && (
        <NodeEditorPanel
          nodeId={id}
          borderColor={EDGE_COLOR}
          handleSide={sideRelativeToParent}
          panelZIndex={nodeData.panelZIndex}
          onExpandClick={() =>
            router.push(
              `/graph/node/${id}?workspaceId=${nodeData.workspaceId ?? ''}`,
            )
          }
          onClose={() => nodeData.onClosePanel?.(id)}
          onFocus={() => nodeData.onFocusPanel?.(id)}
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
