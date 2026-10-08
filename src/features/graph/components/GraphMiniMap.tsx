'use client';

import { useEdges, useNodes, useReactFlow, useStore, useViewport, getNodesBounds } from '@xyflow/react';

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
  const parents = new Map(edges.map((edge) => [edge.target, edge.source]));
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
          const sw = source.measured?.width ?? 200;
          const tw = target.measured?.width ?? 200;
          const toRight = target.position.x > source.position.x;
          return <line key={edge.id} x1={source.position.x + (toRight ? sw : 0)} y1={source.position.y + (source.measured?.height ?? 40) / 2} x2={target.position.x + (toRight ? 0 : tw)} y2={target.position.y + (target.measured?.height ?? 40) / 2} stroke={accent} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />;
        })}
        {nodes.map((node) => {
          const w = node.measured?.width ?? 200;
          const h = node.measured?.height ?? 40;
          const main = !!node.data.isMain;
          const parent = byId.get(parents.get(node.id) ?? '');
          const content = !main && parent && !parent.data.isMain;
          return (
            <g key={node.id} transform={`translate(${node.position.x} ${node.position.y})`} fill="rgb(var(--background))" stroke={accent} strokeWidth={1.5}>
              {content ? <path d={node.data.handleSide === 'left' ? `M 14 0 H ${w} V ${h} H 14 L 0 ${h / 2} Z` : `M 0 0 H ${w - 14} L ${w} ${h / 2} L ${w - 14} ${h} H 0 Z`} vectorEffect="non-scaling-stroke" /> : <rect width={w} height={h} rx={main ? 14 : h / 2} vectorEffect="non-scaling-stroke" />}
              {main && <path d="M 0 16 V -8 Q 0 -14 8 -14 H 46 Q 54 -14 54 -6 H 70 V 16 Z" fill={accent} stroke="none" />}
            </g>
          );
        })}
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
