'use client';

import { useRef } from 'react';
import { useEdges, useNodes, useReactFlow, useStore, useViewport } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { getMiniMapBounds } from '../logic/minimap';
import { branchPath } from '@/features/edge/BranchEdge';

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
 * - Problem      : 화면 기준 미니맵 범위에서는 멀리 떨어진 노드가 잘린다.
 * - Why          : 표시 노드 전체 크기 + 사방 100px을 담는 정사각형에 실제 뷰포트를 겹친다.
 * - Alternatives : 뷰포트 중심 이동·최소 사각형 보정은 그래프 전체 크기와 현재 화면 비율을 왜곡한다.
 * - Trade-offs   : 캔버스 이동은 제한하지 않으므로 뷰포트가 미니맵 밖으로 나가면 잘릴 수 있다.
 * - Edge Case    : 측정 전 크기는 실루엣과 같은 폴백을 사용하고 드래그 시작 좌표계 전체를 고정한다.
 */
export default function GraphMiniMap() {
  const nodes = useNodes().filter((node) => !node.hidden);
  const edges = useEdges().filter((edge) => !edge.hidden);
  const { x, y, zoom } = useViewport();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const nodeLookup = useStore((state) => state.nodeLookup);
  const { setCenter, zoomIn, zoomOut, fitView } = useReactFlow();
  const viewport = { x: -x / zoom, y: -y / zoom, width: width / zoom, height: height / zoom };
  const bounds = getMiniMapBounds(nodes.map((node) => ({
    ...node.position,
    width: node.measured?.width ?? node.width ?? 200,
    height: node.measured?.height ?? node.height ?? (node.data.isMain ? 140 : 40),
  })));
  const scale = bounds.width / 260;
  const dragOrigin = useRef(bounds);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const accent = '#7B87FF';

  // ponytail: 화면 너비 비례(vw) — 1280px 기준 154px. 모바일에선 그만큼 작아지므로 최소 크기가 필요하면 clamp()로.
  return (
    <div className="nodrag nopan absolute bottom-[2.6vw] right-[2.6vw] z-40 w-[12vw] overflow-hidden rounded-[1.4vw] border bg-background" style={{ borderColor: accent }}>
      <svg
        aria-label="그래프 미니맵: 클릭하거나 드래그하여 화면 이동"
        role="img"
        viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
        className="block aspect-square w-full touch-none cursor-crosshair"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragOrigin.current = bounds;
          const rect = event.currentTarget.getBoundingClientRect();
          void setCenter(dragOrigin.current.x + (event.clientX - rect.left) / rect.width * dragOrigin.current.width, dragOrigin.current.y + (event.clientY - rect.top) / rect.height * dragOrigin.current.height, { zoom });
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const rect = event.currentTarget.getBoundingClientRect();
          void setCenter(dragOrigin.current.x + (event.clientX - rect.left) / rect.width * dragOrigin.current.width, dragOrigin.current.y + (event.clientY - rect.top) / rect.height * dragOrigin.current.height, { zoom });
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
          /*
           * CONTEXT
           * - Problem      : 직선은 실제 그래프의 분기 위치와 좌우 방향을 반영하지 못한다.
           * - Why          : 실측 핸들 중심과 hubX로 BranchEdge와 같은 경로를 그린다.
           * - Alternatives : 위치만으로 좌우를 추정하면 드래그 중 고정된 핸들과 어긋난다.
           * - Trade-offs   : 축소 표시에서는 그림자를 생략하고 선 두께를 화면 기준으로 고정한다.
           * - Edge Case    : 실측 전에는 핸들 방향과 노드 중앙 좌표를 대신 사용한다.
           */
          const sourceInternal = nodeLookup.get(source.id);
          const targetInternal = nodeLookup.get(target.id);
          const sourceHandle = sourceInternal?.internals.handleBounds?.source?.find((handle) => handle.id === edge.sourceHandle);
          const targetHandle = targetInternal?.internals.handleBounds?.target?.find((handle) => handle.id === edge.targetHandle);
          const toRight = edge.sourceHandle ? edge.sourceHandle.endsWith('right') : target.position.x > source.position.x;
          const targetOnLeft = edge.targetHandle ? edge.targetHandle.endsWith('left') : toRight;
          const sp = sourceInternal?.internals.positionAbsolute ?? source.position;
          const tp = targetInternal?.internals.positionAbsolute ?? target.position;
          const sx = sp.x + (sourceHandle ? sourceHandle.x + sourceHandle.width / 2 : toRight ? sw : 0);
          const sy = sp.y + (sourceHandle ? sourceHandle.y + sourceHandle.height / 2 : sh / 2);
          const tx = tp.x + (targetHandle ? targetHandle.x + targetHandle.width / 2 : targetOnLeft ? 0 : tw);
          const ty = tp.y + (targetHandle ? targetHandle.y + targetHandle.height / 2 : th / 2);
          const hubX = typeof edge.data?.hubX === 'number' ? edge.data.hubX : (sx + tx) / 2;
          return <path key={edge.id} d={branchPath(sx, sy, hubX, tx, ty)} fill="none" stroke={edge.style?.stroke ?? accent} strokeDasharray={edge.style?.strokeDasharray} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />;
        })}
        {nodes.map((node) => <MiniMapNode key={node.id} node={node} accent={accent} />)}
        <rect x={viewport.x} y={viewport.y} width={viewport.width} height={viewport.height} rx={Math.min(8 * scale, viewport.width / 2, viewport.height / 2)} fill={accent} fillOpacity={0.14} stroke="#626FFF" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex h-[1.5vw] items-center justify-between border-t px-[0.8vw] text-[0.7vw] text-foreground" style={{ borderColor: accent, backgroundColor: 'color-mix(in srgb, #7B87FF 14%, rgb(var(--background)))' }}>
        <button type="button" aria-label="축소" className="h-full px-[0.4vw]" onClick={() => void zoomOut()}>−</button>
        <button type="button" aria-label="그래프 전체 보기" className="h-full px-[0.6vw]" onClick={() => void fitView({ padding: 0.2 })}>{Math.round(zoom * 100)}%</button>
        <button type="button" aria-label="확대" className="h-full px-[0.4vw]" onClick={() => void zoomIn()}>+</button>
      </div>
    </div>
  );
}
