'use client';

import { useEdges, useNodes, useReactFlow, useStore, useViewport, getNodesBounds } from '@xyflow/react';
import type { Node } from '@xyflow/react';

/*
 * CONTEXT
 * - Problem      : 미니맵의 사각형·캡슐만으로는 실제 노드의 폴더·탭·배너를 구분하기 어렵다.
 * - Why          : 캔버스가 주입한 isMain/isContentNode와 실제 크기로 같은 실루엣을 그린다.
 * - Alternatives : 부모 엣지로 유형을 다시 추론하면 숨김 여부에 따라 캔버스와 모양이 달라진다.
 * - Trade-offs   : 축소 상태에서 식별하기 위해 글자와 장식은 생략하고 단색 윤곽을 사용한다.
 * - Edge Case    : 측정 전에도 유형별 기본 크기를 사용하고 왼쪽 텍스트 노드는 배너를 반전한다.
 */
function MiniMapNode({ node, accent }: { node: Node; accent: string }) {
  const main = !!node.data.isMain;
  const content = !main && !!node.data.isContentNode;
  const w = node.measured?.width ?? node.width ?? 200;
  const h = node.measured?.height ?? node.height ?? (main ? 140 : 40);
  const r = Math.min(10, h / 2);
  const p = Math.min(14, w / 4);
  const banner = node.data.handleSide === 'left'
    ? `M ${w - r} 0 H ${p} L 0 ${h / 2} L ${p} ${h} H ${w - r} Q ${w} ${h} ${w} ${h - r} V ${r} Q ${w} 0 ${w - r} 0 Z`
    : `M ${r} 0 H ${w - p} L ${w} ${h / 2} L ${w - p} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;
  const radius = Math.min(h / 2, w / 2);
  const tabLeft = Math.min(22, w / 4);
  const tabRight = Math.min(60, w / 2);
  const title = `M ${radius} 0 H ${tabLeft} V -6 Q ${tabLeft} -14 ${tabLeft + 8} -14 H ${tabRight - 8} Q ${tabRight} -14 ${tabRight} -6 V 0 H ${w - radius} A ${radius} ${radius} 0 0 1 ${w - radius} ${h} H ${radius} A ${radius} ${radius} 0 0 1 ${radius} 0 Z`;

  return (
    <g transform={`translate(${node.position.x} ${node.position.y})`} fill={main ? accent : 'rgb(var(--background))'} stroke={accent} strokeWidth={1.5} strokeLinejoin="round">
      {main ? (
        <path d={`M 0 8 V -4 Q 0 -12 8 -12 H 58 Q 66 -12 66 -4 V 0 H ${w - 14} Q ${w} 0 ${w} 14 V ${h - 14} Q ${w} ${h} ${w - 14} ${h} H 14 Q 0 ${h} 0 ${h - 14} Z`} vectorEffect="non-scaling-stroke" />
      ) : (
        <path d={content ? banner : title} vectorEffect="non-scaling-stroke" />
      )}
    </g>
  );
}

/*
 * CONTEXT
 * - Problem      : 기본 미니맵은 연결선·노드 형태가 생략되고 배율 조작이 카드 밖에 있다.
 * - Why          : React Flow의 현재 데이터로 SVG를 그려 실제 구조와 화면 영역을 함께 표시한다.
 * - Alternatives : 기본 MiniMap의 nodeComponent만 교체하면 연결선을 표현할 수 없다.
 * - Trade-offs   : 별도 SVG 렌더링 비용이 생기지만 데이터와 뷰포트는 기존 store를 따른다.
 * - Edge Case    : 숨긴 노드·엣지는 제외하고 빈 그래프와 화면 밖 뷰포트도 bounds에 포함한다.
 */
export default function GraphMiniMap() {
  const nodes = useNodes().filter((node) => !node.hidden);
  const edges = useEdges().filter((edge) => !edge.hidden);
  const { x, y, zoom } = useViewport();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const { setCenter, zoomIn, zoomOut, fitView } = useReactFlow();
  const viewport = { x: -x / zoom, y: -y / zoom, width: width / zoom, height: height / zoom };
  const bounds = nodes.length ? getNodesBounds(nodes) : viewport;
  const left = Math.min(bounds.x, viewport.x) - 60;
  const top = Math.min(bounds.y, viewport.y) - 60;
  const mapWidth = Math.max(bounds.x + bounds.width, viewport.x + viewport.width) - left + 60;
  const mapHeight = Math.max(bounds.y + bounds.height, viewport.y + viewport.height) - top + 60;
  const scale = Math.max(mapWidth / 260, mapHeight / 156, 1);
  const viewWidth = scale * 260;
  const viewHeight = scale * 156;
  const viewLeft = left - (viewWidth - mapWidth) / 2;
  const viewTop = top - (viewHeight - mapHeight) / 2;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const accent = '#7B87FF';

  return (
    <div className="nodrag nopan absolute bottom-4 right-4 z-40 w-[260px] max-w-[calc(100%-32px)] overflow-hidden rounded-[32px] border-2 bg-background" style={{ borderColor: accent }}>
      <svg
        aria-label="그래프 미니맵: 클릭하거나 드래그하여 화면 이동"
        role="img"
        viewBox={`${viewLeft} ${viewTop} ${viewWidth} ${viewHeight}`}
        className="block h-[156px] w-full touch-none cursor-crosshair"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const rect = event.currentTarget.getBoundingClientRect();
          void setCenter(viewLeft + (event.clientX - rect.left) / rect.width * viewWidth, viewTop + (event.clientY - rect.top) / rect.height * viewHeight, { zoom });
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const rect = event.currentTarget.getBoundingClientRect();
          void setCenter(viewLeft + (event.clientX - rect.left) / rect.width * viewWidth, viewTop + (event.clientY - rect.top) / rect.height * viewHeight, { zoom });
        }}
        onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
      >
        {edges.map((edge) => {
          const source = byId.get(edge.source);
          const target = byId.get(edge.target);
          if (!source || !target) return null;
          const sw = source.measured?.width ?? source.width ?? 200;
          const tw = target.measured?.width ?? target.width ?? 200;
          const sh = source.measured?.height ?? source.height ?? (source.data.isMain ? 140 : 40);
          const th = target.measured?.height ?? target.height ?? (target.data.isMain ? 140 : 40);
          const toRight = target.position.x > source.position.x;
          return <line key={edge.id} x1={source.position.x + (toRight ? sw : 0)} y1={source.position.y + sh / 2} x2={target.position.x + (toRight ? 0 : tw)} y2={target.position.y + th / 2} stroke={accent} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />;
        })}
        {nodes.map((node) => <MiniMapNode key={node.id} node={node} accent={accent} />)}
        <rect x={viewport.x} y={viewport.y} width={viewport.width} height={viewport.height} rx={18 * scale} fill={accent} fillOpacity={0.14} stroke="#626FFF" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex h-8 items-center justify-between border-t-2 px-5 text-foreground" style={{ borderColor: accent, backgroundColor: 'color-mix(in srgb, #7B87FF 14%, rgb(var(--background)))' }}>
        <button type="button" aria-label="축소" className="h-full px-2 text-lg" onClick={() => void zoomOut()}>−</button>
        <button type="button" aria-label="그래프 전체 보기" className="h-full px-3 text-sm" onClick={() => void fitView({ padding: 0.2 })}>{Math.round(zoom * 100)}%</button>
        <button type="button" aria-label="확대" className="h-full px-2 text-lg" onClick={() => void zoomIn()}>+</button>
      </div>
    </div>
  );
}
