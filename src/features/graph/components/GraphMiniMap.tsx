'use client';

import { useRef } from 'react';
import { useEdges, useNodes, useReactFlow, useStore, useViewport } from '@xyflow/react';
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
 * - Problem      : 미니맵이 화면 중심을 따라가면 사각형이 항상 정가운데·같은 크기라 전체 그래프 중 현재 위치를 알 수 없다.
 * - Why          : 미니맵 범위를 그래프 중심에 고정하고 배율은 화면 크기(zoom 100%에서 사각형이 미니맵 절반)로 정한다.
 *                  화면을 이동하면 사각형이 움직이고, 줌 인하면 작아지고 줌 아웃하면 커진다.
 * - Alternatives : 전체 노드 bounds 맞춤은 노드 추가·이동마다 배율이 바뀌고 그래프가 넓으면 사각형이 점이 된다.
 * - Trade-offs   : 그래프가 미니맵보다 넓으면 일부만 보인다 — 화면이 범위를 벗어나면 그만큼 범위를 밀어 사각형을 항상 안에 둔다.
 * - Edge Case    : 사각형은 최소 크기(미니맵의 12%)를 유지하고, 줌 아웃으로 80%를 넘으면 미니맵 배율을 키워 전체를 채우지 않게 한다.
 *                  드래그 중엔 시작 좌표계를 유지해 범위 이동으로 이동량이 누적되지 않게 한다.
 */
export default function GraphMiniMap() {
  const nodes = useNodes().filter((node) => !node.hidden);
  const edges = useEdges().filter((edge) => !edge.hidden);
  const { x, y, zoom } = useViewport();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const { setCenter, zoomIn, zoomOut, fitView, getNodesBounds } = useReactFlow();
  const viewport = { x: -x / zoom, y: -y / zoom, width: width / zoom, height: height / zoom };
  const scale = Math.max(Math.max(width / 260, height / 156) * 2, viewport.width / 260 / 0.8, viewport.height / 156 / 0.8);
  const viewWidth = scale * 260;
  const viewHeight = scale * 156;
  const bounds = nodes.length > 0 ? getNodesBounds(nodes) : viewport;
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
  const viewLeft = clamp(bounds.x + bounds.width / 2 - viewWidth / 2, viewport.x + viewport.width - viewWidth, viewport.x);
  const viewTop = clamp(bounds.y + bounds.height / 2 - viewHeight / 2, viewport.y + viewport.height - viewHeight, viewport.y);
  const boxWidth = Math.max(viewport.width, viewWidth * 0.12);
  const boxHeight = Math.max(viewport.height, viewHeight * 0.12);
  const dragOrigin = useRef({ x: viewLeft, y: viewTop });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const accent = '#7B87FF';

  // ponytail: 화면 너비 비례(vw) — 1280px 기준 154px. 모바일에선 그만큼 작아지므로 최소 크기가 필요하면 clamp()로.
  return (
    <div className="nodrag nopan absolute bottom-[2.6vw] right-[2.6vw] z-40 w-[12vw] overflow-hidden rounded-[1.4vw] border bg-background" style={{ borderColor: accent }}>
      <svg
        aria-label="그래프 미니맵: 클릭하거나 드래그하여 화면 이동"
        role="img"
        viewBox={`${viewLeft} ${viewTop} ${viewWidth} ${viewHeight}`}
        className="block aspect-[5/3] w-full touch-none cursor-crosshair"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragOrigin.current = { x: viewLeft, y: viewTop };
          const rect = event.currentTarget.getBoundingClientRect();
          void setCenter(dragOrigin.current.x + (event.clientX - rect.left) / rect.width * viewWidth, dragOrigin.current.y + (event.clientY - rect.top) / rect.height * viewHeight, { zoom });
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const rect = event.currentTarget.getBoundingClientRect();
          void setCenter(dragOrigin.current.x + (event.clientX - rect.left) / rect.width * viewWidth, dragOrigin.current.y + (event.clientY - rect.top) / rect.height * viewHeight, { zoom });
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
        <rect x={viewport.x + (viewport.width - boxWidth) / 2} y={viewport.y + (viewport.height - boxHeight) / 2} width={boxWidth} height={boxHeight} rx={Math.min(18 * scale, boxHeight / 3)} fill={accent} fillOpacity={0.14} stroke="#626FFF" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex h-[1.5vw] items-center justify-between border-t px-[0.8vw] text-[0.7vw] text-foreground" style={{ borderColor: accent, backgroundColor: 'color-mix(in srgb, #7B87FF 14%, rgb(var(--background)))' }}>
        <button type="button" aria-label="축소" className="h-full px-[0.4vw]" onClick={() => void zoomOut()}>−</button>
        <button type="button" aria-label="그래프 전체 보기" className="h-full px-[0.6vw]" onClick={() => void fitView({ padding: 0.2 })}>{Math.round(zoom * 100)}%</button>
        <button type="button" aria-label="확대" className="h-full px-[0.4vw]" onClick={() => void zoomIn()}>+</button>
      </div>
    </div>
  );
}
