'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeEditorPanel } from '@/features/editor/NodeEditorPanel';
import { useYjsProvider } from '@/hooks/useYjsProvider';
import { useWorkspaceLayout } from '@/app/workspace/context';
import {
  COLOR_PALETTE,
  MAIN_NODE_COLOR,
  figmaNodeColorOf,
  titleTextOnDeep,
} from '@/features/graph/constants/colors';
import NodeContextMenu from '@/components/ui/NodeContextMenu';
import type {
  CollapseButtonView,
  CollapseSide,
} from '@/features/graph/logic/traversal';

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
  isContentNode?: boolean; // 콘텐츠 노드(부모가 프로젝트가 아님) — GraphCanvas에서 계산해 주입
  handleSide?: 'left' | 'right';
  hasParent?: boolean; // 부모 노드 존재 여부
  showInputBox?: boolean; // 입력박스 표시 여부
  panelZIndex?: number; // 패널 z-index (포커스된 패널이 위)
  isHovered?: boolean; // 드래그 중 hover 상태
  workspaceId?: string; // 전체화면 이동 시 query param으로 사용
  viewers?: NodeViewer[]; // 이 노드를 보고 있는 다른 유저들
  isContextMenuOpen?: boolean; // 컨텍스트 메뉴 표시 여부
  isRenaming?: boolean; // 인라인 이름 편집 중(G5·G7 "이름 바꾸기")
  onStartRename?: (nodeId: string) => void; // 인라인 이름 편집 시작
  onFinishRename?: (nodeId: string) => void; // 인라인 이름 편집 종료
  onAddChild?: (nodeId: string) => void; // G4·C1 hover "+" 자식 노드 추가
  collapseButtons?: CollapseButtonView[]; // 접기 버튼 표시 정보 (방향별)
  onToggleNodeType?: (nodeId: string) => void; // 프로젝트 ↔ 일반 노드 타입 토글
  onDeleteNode?: (nodeId: string) => void; // 노드 삭제 (확인 모달 경유)
  onClosePanel?: (nodeId: string) => void; // 패널 닫기
  onForwardPanel?: (nodeId: string) => void; // 패널 포커스
  onChange?: (nodeId: string, value: string) => void;
  onToggleCollapse?: (nodeId: string, side: CollapseSide) => void;
};

export function TextUpdaterNode({ data, id, selected }: NodeProps) {
  const router = useRouter();
  const nodeData = data as NodeView;
  const isMain = nodeData.isMain ?? false;
  // 프로젝트 → 타이틀 → 콘텐츠. 타이틀=프로젝트 직계(pill), 콘텐츠=그 이하(연한 사각형) (Figma 08 G1).
  // depth는 서버 미전파로 stale할 수 있어 GraphCanvas가 부모-main 여부로 계산해 넘긴 값을 쓴다.
  const isContent = !isMain && (nodeData.isContentNode ?? false);
  const isTitle = !isMain && !isContent; // 타이틀/단독 노드
  // 저장된 색(rgb(var(--ds-sub-blue)) 등)에서 Figma 08 팔레트 매칭 — 기존 그래프도 자동 적용
  const fig = figmaNodeColorOf(nodeData.color as string | undefined);
  const hasParent = nodeData.hasParent ?? true; // 기본값은 부모가 있다고 가정
  const showInputBox = nodeData.showInputBox ?? false;
  const isContextMenuOpen = nodeData.isContextMenuOpen ?? false;

  const { userMe } = useWorkspaceLayout();
  const userName = userMe?.username ?? 'Anonymous';
  const cursorColor = getUserCursorColor(userMe?.userId ?? '');

  const [isNodeHovered, setIsNodeHovered] = useState(false);
  const collapseButtons = nodeData.collapseButtons ?? [];
  const { provider: collabProvider } = useYjsProvider({
    nodeId: isNodeHovered || showInputBox ? id : null,
    userName,
    userColor: cursorColor,
  });
  const sideRelativeToParent = (nodeData.handleSide ?? 'right') as
    | 'left'
    | 'right';
  const sourceHandlePosition =
    sideRelativeToParent === 'left' ? Position.Left : Position.Right;
  const viewers = (nodeData.viewers ?? []) as NodeViewer[];
  const isHovered = nodeData.isHovered ?? false;

  // 플레이스홀더는 온보딩·사용법과 동일한 "주제" 어휘로 통일 (#204 용어 정리)
  const PLACEHOLDER = isMain ? '중심 주제' : '서브 주제';

  const label = nodeData.title || '';
  const isEmpty = label === '';
  const isRenaming = nodeData.isRenaming ?? false;
  // 채워진 글자색(인라인 input·비어있지 않은 라벨 공용): 타이틀은 Deep 대비색, 그 외는 계열색
  const filledTextColor = isTitle
    ? (titleTextOnDeep(fig?.deep) ??
      nodeData.textColor ??
      'rgb(var(--foreground))')
    : nodeData.textColor || 'rgb(var(--foreground))';

  // 중심 노드: 네모난 형태, 큰 패딩, 배경 없이 테두리만
  // 서브 노드: 동그란 형태, 작은 패딩, 배경색 채움
  const containerClasses = isMain
    ? 'text-updater-node rounded-[16px]'
    : isContent
      ? 'text-updater-node' // 모양은 아래 clip-path 배경 레이어가 그린다(오른쪽 뾰족 배너)
      : 'text-updater-node rounded-full';

  // React Flow 기본 엣지 색상과 동일한 회색 (#b1b1b7)
  const EDGE_COLOR = '#D9D9D9';

  /*
   * CONTEXT
   * - Problem      : Figma 08(C3 등)은 엣지가 노드에 닿는 지점마다 흰 채움+회색 링의 원형
   *                  포트 점을 "항상" 표시하는데, 현재 핸들은 hover 시에만(opacity 토글)
   *                  보이고 기본 React Flow 다크닷 스타일이라 시안과 다르다.
   * - Why          : 핸들은 이미 연결 접점이므로, 실제 엣지가 있는 접점(부모 쪽 target /
   *                  자식 있는 쪽 source)만 상시 점으로 노출한다. 자식·부모 유무는 기존
   *                  collapseButtons(방향별 자식 유무)·hasParent로 판정 — 엣지 배열 조회
   *                  없이 노드 data만으로 결정되어 드래그 중에도 일관.
   * - Alternatives : 모든 핸들 상시 노출 — 자식 없는 변에도 점이 떠 시안과 다름, 기각.
   *                  엣지 배열을 노드에 주입해 접점 집계 — data 계약 확장·리렌더 비용, 기각.
   * - Trade-offs   : 자식 없는 변의 source 핸들은 여전히 hover 시에만(새 연결 드래그용)
   *                  노출 → 상시 점과 hover 점이 공존하지만 둘 다 동일 PORT_DOT_STYLE이라
   *                  시각 일관. 포트 치수·색은 C3 육안 근사치(실측 후 조정 예정).
   * - Edge Case    : root(부모 없음)의 target 핸들은 엣지가 없으므로 계속 숨김(opacity 0).
   */
  const childSides = new Set(collapseButtons.map((b) => b.side));
  // Figma 08 실측: 포트 점 지름 14px, 흰 fill + 2px #727272 링(엣지선과 동일 색)
  const PORT_DOT_STYLE = {
    width: 14,
    height: 14,
    minWidth: 14,
    minHeight: 14,
    background: '#ffffff',
    border: '2px solid #727272',
    borderRadius: '50%',
  } as const;

  const viewerBorderColor = viewers.length > 0 ? viewers[0].color : null;

  // 콘텐츠 노드 = 자식(엣지가 나가는) 방향으로 뾰족한 배너. clip-path를 컨테이너에 걸면
  // 자식인 Handle이 잘려 렌더가 멈추므로(React Flow #008), 핸들의 '형제'인 배경 레이어에만 건다.
  const pointRight = sideRelativeToParent === 'right';
  const CONTENT_CLIP = pointRight
    ? 'polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%)'
    : 'polygon(16px 0, 100% 0, 100% 100%, 16px 100%, 0 50%)';
  const contentFill = fig?.light ?? nodeData.color ?? 'rgb(var(--ds-sub-gray))';
  const contentRing = isHovered
    ? '#93C5FD'
    : selected
      ? 'rgb(var(--ds-main))'
      : (viewerBorderColor ?? '#ffffff');

  // main 노드 기본 테두리는 자기 그래프 색 — 흰 배경 유지 규칙 안에서 소속 그래프를 드러낸다.
  // 파스텔 톤(--ds-sub-*)은 1px로는 식별이 어려워 색이 있으면 2px로 표시.
  // 색 미저장 legacy main은 회색(EDGE_COLOR) 폴백.
  const mainOwnBorderColor = nodeData.color || null;

  const containerStyle = isMain
    ? {
        // 프로젝트(main) 노드는 그래프 색을 데이터로 보유해도 항상 흰 배경 (도메인 규칙).
        // Figma 08(G1): 흰 카드 + 소프트 섀도 + 좌상단 폴더 탭(탭 색 = 그래프 색)으로
        // 소속 그래프를 드러낸다 → 기존 '색 테두리'를 폴더 탭(mainOwnBorderColor)으로 대체,
        // 기본 테두리 없음. hover/selected/viewer만 테두리로 표시.
        backgroundColor: MAIN_NODE_COLOR.bg,
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
        border: isHovered
          ? '2px solid #93C5FD'
          : selected
            ? '2px solid rgb(var(--ds-main))'
            : viewerBorderColor
              ? `2px solid ${viewerBorderColor}`
              : 'none',
      }
    : isContent
      ? {
          // 콘텐츠 노드: 모양(뾰족 배너 + 흰 테두리 + 섀도)은 아래 clip-path 레이어가 그린다.
          // 컨테이너는 투명·사각형 유지해야 핸들이 안 잘린다.
          backgroundColor: 'transparent',
          border: 'none',
        }
      : {
          // 타이틀 노드(main 직계 자손): Node Deep fill + 흰 테두리 4px + 소프트 섀도 + 흰 꽁다리(아래).
          // 글자는 어두운 Deep(파랑)만 흰색, 밝은 Deep은 계열 어두운색. (Figma 08 실측)
          backgroundColor:
            fig?.deep ??
            `color-mix(in srgb, ${nodeData.color || 'rgb(var(--ds-sub-gray))'} 45%, ${nodeData.textColor || 'rgb(var(--ds-text-gray))'} 55%)`,
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.10)',
          border: isHovered
            ? '4px solid #93C5FD'
            : selected
              ? '4px solid rgb(var(--ds-main))'
              : viewerBorderColor
                ? `4px solid ${viewerBorderColor}`
                : '4px solid #ffffff',
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
              className="flex items-center justify-center rounded-full text-white text-[10px] font-bold leading-none select-none"
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
              className="flex items-center justify-center rounded-full bg-gray-400 text-white text-[9px] font-bold leading-none select-none"
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

      {/* 컨텍스트 메뉴 - 노드 아래 배치. 루트 기준 왼쪽 노드는 오른쪽 테두리 정렬(왼쪽으로 펼침), 오른쪽 노드는 왼쪽 테두리 정렬(오른쪽으로 펼침) */}
      {isContextMenuOpen && (
        <div
          className="absolute"
          style={{
            top: '100%',
            marginTop: 8,
            zIndex: 50,
            ...(sideRelativeToParent === 'left' ? { right: 0 } : { left: 0 }),
          }}
        >
          <NodeContextMenu
            isProjectNode={isMain}
            onToggleNodeType={() => nodeData.onToggleNodeType?.(id)}
            onRename={() => nodeData.onStartRename?.(id)}
            onDeleteNode={() => nodeData.onDeleteNode?.(id)}
          />
        </div>
      )}

      {/* 노션 에디터 패널 - 노드 뒤에 배치 */}
      {showInputBox && (
        <NodeEditorPanel
          nodeId={id}
          handleSide={sideRelativeToParent}
          panelZIndex={nodeData.panelZIndex}
          onExpandClick={() =>
            router.push(
              `/workspace/node/${id}?workspaceId=${nodeData.workspaceId ?? ''}`,
            )
          }
          onClose={() => nodeData.onClosePanel?.(id)}
          onFocus={() => nodeData.onForwardPanel?.(id)}
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
          zIndex: 40,
          // 타이틀(main 직계 자손)은 사진처럼 넓은 pill — 짧은 제목도 넓게, 더 길면 확장(최대 300)
          maxWidth: isTitle ? '300px' : '200px',
          minWidth: isTitle ? '200px' : `${PLACEHOLDER.length}em`,
          // 콘텐츠는 뾰족한 쪽에 여유 패딩(글자가 점에 안 겹치게)
          padding: isMain
            ? '26px 36px'
            : isContent
              ? pointRight
                ? '6px 24px 6px 14px'
                : '6px 14px 6px 24px'
              : '6px 12px',
        }}
        onMouseEnter={() => setIsNodeHovered(true)}
        onMouseLeave={() => setIsNodeHovered(false)}
      >
        {/* 콘텐츠 노드 뾰족 배너 — clip-path는 핸들의 '형제' 레이어에만(컨테이너 X).
            ring(흰 테두리 3px, 섀도) 뒤 + fill 앞. 핸들은 컨테이너 직속이라 안 잘린다. */}
        {isContent && (
          <>
            <div
              aria-hidden
              className="absolute"
              style={{
                inset: -3,
                backgroundColor: contentRing,
                clipPath: CONTENT_CLIP,
                filter: 'drop-shadow(0 2px 5px rgba(0, 0, 0, 0.12))',
                zIndex: -2,
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundColor: contentFill,
                clipPath: CONTENT_CLIP,
                zIndex: -1,
              }}
            />
          </>
        )}
        {/* 좌상단 폴더 탭(꽁다리) — 프로젝트는 Deep색, 타이틀은 흰색(흰 테두리와 연결). (Figma 08) */}
        {(isMain || isTitle) && (
          <div
            aria-hidden
            className="absolute"
            style={{
              // 꽁다리는 노드 길이와 무관한 고정 크기. 타이틀은 프로젝트보다 작게.
              top: isMain ? -22 : -14,
              left: isMain ? 20 : 22,
              width: isMain ? 56 : 38,
              height: isMain ? 22 : 14,
              backgroundColor: isMain
                ? (fig?.deep ?? mainOwnBorderColor ?? EDGE_COLOR)
                : '#ffffff',
              borderRadius: '8px 8px 0 0',
            }}
          />
        )}
        {isRenaming ? (
          // 인라인 이름 편집(G5·G7) — input onChange가 handleTitleChange로 즉시+디바운스 저장,
          // Enter/blur로 종료, Esc로 종료(저장은 이미 반영됨). nodrag·stopPropagation로 드래그/에디터 오픈 차단.
          <input
            autoFocus
            defaultValue={label}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => nodeData.onChange?.(id, e.currentTarget.value)}
            onBlur={() => nodeData.onFinishRename?.(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              else if (e.key === 'Escape') nodeData.onFinishRename?.(id);
            }}
            onClick={(e) => e.stopPropagation()}
            className={`nodrag w-full bg-transparent outline-none ${
              isContent ? 'text-left' : 'text-center'
            }`}
            style={{
              color: filledTextColor,
              fontWeight: isMain ? 700 : isTitle ? 600 : undefined,
              fontSize: isMain ? '20px' : undefined,
              lineHeight: '1.4em',
            }}
          />
        ) : (
          <div
            className={`${isContent ? 'text-left' : 'text-center'} select-none`}
            style={{
              // 타이틀: 어두운 Deep(파랑)만 흰 글자, 밝은 Deep은 계열 어두운색.
              // 콘텐츠/프로젝트: 계열 어두운색(--ds-text-*). (Figma 08 실측)
              color: isEmpty ? 'rgb(var(--ds-gray-500))' : filledTextColor,
              fontWeight: isMain ? 700 : isTitle ? 600 : undefined,
              fontSize: isMain ? '20px' : undefined,
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
        )}
        {/* G4·C1: hover "+" 자식 추가 버튼 — source(자식) 방향. 프로젝트→타이틀, 타이틀→콘텐츠. */}
        {(isMain || isTitle) && isNodeHovered && !isRenaming && (
          <div
            className="nodrag absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5"
            style={{
              ...(sideRelativeToParent === 'left'
                ? {
                    right: '100%',
                    paddingRight: 10,
                    flexDirection: 'row-reverse',
                  }
                : { left: '100%', paddingLeft: 10 }),
              zIndex: 10,
            }}
          >
            <button
              type="button"
              aria-label="자식 노드 추가"
              onClick={(event) => {
                event.stopPropagation();
                nodeData.onAddChild?.(id);
              }}
              className="flex items-center justify-center rounded-full text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ width: 22, height: 22, backgroundColor: '#748DFD' }}
            >
              {/* SVG 십자로 배경원 정중앙 정렬 (텍스트 "+"의 베이스라인 쏠림 제거) */}
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M6 1.5V10.5M1.5 6H10.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <span
              className="whitespace-nowrap rounded-full text-white select-none"
              style={{
                backgroundColor: '#748DFD',
                fontSize: 12,
                padding: '4px 10px',
              }}
            >
              {isMain ? '새 타이틀 노드 추가' : '콘텐츠 노드 추가'}
            </span>
          </div>
        )}
        {!hasParent ? (
          <>
            <Handle
              type="source"
              position={Position.Left}
              id="source-left"
              style={{
                ...PORT_DOT_STYLE,
                opacity: childSides.has('left') || isNodeHovered ? 1 : 0,
              }}
            />
            <Handle
              type="target"
              position={Position.Left}
              id="target-left"
              isConnectableStart={false}
              style={{ opacity: 0 }}
            />
            <Handle
              type="source"
              position={Position.Right}
              id="source-right"
              style={{
                ...PORT_DOT_STYLE,
                opacity: childSides.has('right') || isNodeHovered ? 1 : 0,
              }}
            />
            <Handle
              type="target"
              position={Position.Right}
              id="target-right"
              isConnectableStart={false}
              style={{ opacity: 0 }}
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
              isConnectableStart={false}
              style={{ ...PORT_DOT_STYLE, opacity: 1 }}
            />
            <Handle
              type="source"
              position={sourceHandlePosition}
              id={`source-${sideRelativeToParent}`}
              style={{
                ...PORT_DOT_STYLE,
                opacity:
                  childSides.has(sideRelativeToParent) || isNodeHovered ? 1 : 0,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
