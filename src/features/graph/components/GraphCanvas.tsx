'use client';
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type Dispatch,
  type SetStateAction,
  type DragEvent,
} from 'react';
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
  type Edge,
  ConnectionMode,
  ConnectionLineType,
  useReactFlow,
  ReactFlowProvider,
  type FinalConnectionState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import * as d3 from 'd3';
import { nodeTypes } from '@/types/nodeTypes';
import { edgeTypes } from '@/types/edgeTypes';
import {
  createMdNode,
  moveNode,
  deleteNode,
  updateNodeContent,
  EMPTY_LEXICAL_JSON,
} from '../api/nodes';
import { emitLivePosition, emitCursorMove } from '@/api/ws';
import { createEdge, deleteEdge, updateEdge } from '../api/edges';
import type { EdgeDto, NodeDto } from '../types';
import { rectCollide } from '../layout/rectCollide';
import { getRandomColorPair, DEFAULT_NODE_COLOR } from '../constants/colors';
import {
  getDescendantIds,
  getSameColorDescendantIds,
  applyDepthOnEdgeCreate,
  applyDepthOnEdgeDelete,
  isRootNode,
} from '../utils/graphUtils';
import { useCursors } from '@/hooks/useCursors';
import { useWorkspaceAwareness } from '@/hooks/useWorkspaceAwareness';
import { getCursorColor } from '@/utils/cursorColor';
import CursorOverlay from './CursorOverlay';
import { MdBody, type WorkspaceRole } from '@/api/types';

// TODO: 실제 노드 너비로 변경
const NODE_WIDTH = 200;
const NODE_HEIGHT = 48;
const NODE_PADDING = 0; // 완전히 부딪힐 때만 충돌
const HUB_OFFSET = 25; // Figma 메인 화면 디자인 실측: 엣지 elbow 수평 거리 25px
const DEFAULT_NODE_DISTANCE = 64; // Figma 메인 화면 디자인 실측: 부모-자식 수평 빈 간격 64px

function getParentId(nodeId: string, edges: Edge[]): string | null {
  const incoming = edges.find((edge) => edge.target === nodeId);
  return incoming?.source ?? null;
}

function getAncestorIds(nodeId: string, edges: Edge[]): Set<string> {
  const ancestors = new Set<string>();
  let current = getParentId(nodeId, edges);
  while (current) {
    ancestors.add(current);
    current = getParentId(current, edges);
  }
  return ancestors;
}

function getMainNodeForSubtree(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
): Node | undefined {
  const currentNode = nodes.find((n) => n.id === nodeId);
  if (currentNode?.data?.isMain) return currentNode;

  const ancestors = getAncestorIds(nodeId, edges);
  for (const ancestorId of ancestors) {
    const ancestor = nodes.find((n) => n.id === ancestorId);
    if (ancestor?.data?.isMain) return ancestor;
  }

  return undefined;
}

function getGraphColor(
  parentNodeId: string,
  nodes: Node[],
  edges: Edge[],
): { bg: string; text: string } {
  const parentNode = nodes.find((n) => n.id === parentNodeId);

  if (parentNode?.data?.isMain) {
    // main 노드도 그래프 색을 data.color에 저장한다 (표시만 흰색) — 본인 색 우선
    if (isCustomColorNode(parentNodeId, nodes)) {
      return {
        bg: parentNode.data.color as string,
        text: (parentNode.data.textColor as string) || DEFAULT_NODE_COLOR.text,
      };
    }

    // ponytail: legacy 폴백 — 색 미저장 main은 첫 커스텀 색 자식의 색으로 추정.
    // 같은 그래프의 자식은 색이 같으므로 대부분 정답이지만, 크로스 그래프 엣지의
    // 자식이 먼저 잡히면 상대 그래프 색으로 오판할 수 있다. 색 없는 main이 왜
    // 존재하는지·언제 없어지는지는 backfillMainColor의 CONTEXT 참고.
    // 서버가 PROJECT 노드 color를 보장하면(Aideep_backend#52) 이 블록 삭제.
    const children = edges
      .filter((e) => e.source === parentNodeId)
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter((n): n is Node => n !== undefined);

    const coloredChild = children.find((child) =>
      isCustomColorNode(child.id, nodes),
    );
    if (coloredChild) {
      return {
        bg: coloredChild.data.color as string,
        text:
          (coloredChild.data.textColor as string) || DEFAULT_NODE_COLOR.text,
      };
    }

    return getRandomColorPair();
  }

  if (parentNode?.data?.color) {
    return {
      bg: parentNode.data.color as string,
      text: (parentNode.data.textColor as string) || DEFAULT_NODE_COLOR.text,
    };
  }

  return getRandomColorPair();
}

function isCustomColorNode(nodeId: string, nodes: Node[]): boolean {
  const node = nodes.find((n) => n.id === nodeId);
  const color = node?.data?.color as string | undefined;
  return Boolean(color && color !== DEFAULT_NODE_COLOR.bg);
}

function colorOfNodeIn(nodes: Node[]) {
  return (id: string) =>
    nodes.find((n) => n.id === id)?.data?.color as string | undefined;
}

/*
 * CONTEXT
 * - Problem      : 크로스 그래프 엣지(색이 다른 노드 간 연결)가 있으면 서브트리 이동·색 전파·
 *                  삭제 캐스케이드가 경계를 넘어 다른 그래프의 노드까지 끌고 간다.
 * - Why          : 이동/전파/삭제 대상을 루트의 그래프 색과 같은 색의 자손으로 제한한다.
 *                  main 노드도 그래프 색을 data.color에 저장하므로(표시만 흰색) 본인 색을
 *                  기준색으로 사용한다. 색이 확정되는 시점에 backfillMainColor가 저장한다.
 * - Alternatives : 서버 그래프 ID·크로스 엣지 플래그 — getSameColorDescendantIds CONTEXT 참고.
 * - Trade-offs   : 색 미저장 legacy main은 첫 커스텀 색 자식의 색으로 추정하는 폴백을 거침
 *                  (크로스 그래프 자식이 먼저면 오판 가능 — Aideep_backend#52 완료 후 제거).
 * - Edge Case    : 그래프 색을 알 수 없으면 전체 자손 순회로 폴백.
 */
function getSameGraphDescendantIds(
  rootNode: Node,
  nodes: Node[],
  edges: Edge[],
): Set<string> {
  const colorOf = colorOfNodeIn(nodes);

  // main 노드도 그래프 색을 data.color에 저장하므로 본인 색을 그대로 사용
  let rootColor = colorOf(rootNode.id);
  if (rootNode.data?.isMain && !isCustomColorNode(rootNode.id, nodes)) {
    // ponytail: legacy 폴백 — 색 미저장 main은 첫 커스텀 색 자식의 색으로 추정.
    // 같은 그래프의 자식은 색이 같으므로 대부분 정답이지만, 크로스 그래프 엣지의
    // 자식이 먼저 잡히면 상대 그래프 색으로 오판할 수 있다. 색 없는 main이 왜
    // 존재하는지·언제 없어지는지는 backfillMainColor의 CONTEXT 참고.
    // 서버가 PROJECT 노드 color를 보장하면(Aideep_backend#52) 이 블록 삭제.
    rootColor = edges
      .filter((e) => e.source === rootNode.id)
      .map((e) => e.target)
      .filter((id) => isCustomColorNode(id, nodes))
      .map(colorOf)[0];
  }

  if (!rootColor) return getDescendantIds(rootNode.id, edges);
  return getSameColorDescendantIds(rootNode.id, edges, rootColor, colorOf);
}

// 색을 칠할 노드 집합: 루트 + 같은 그래프(같은 색) 자손, main 노드 제외.
// 로컬 페인트(updateSubtreeColors)와 서버 저장 PATCH가 반드시 같은 집합을 쓰도록 공용.
// 서버의 propagateToChildren 전파는 그래프 색 경계를 모르고 크로스 그래프 엣지 너머까지
// 덮어쓰므로(Aideep_backend#51) 사용하지 않고, 이 집합에 노드별 PATCH로 저장한다.
function getRecolorTargetIds(
  rootId: string,
  nodes: Node[],
  edges: Edge[],
): string[] {
  const rootColor = colorOfNodeIn(nodes)(rootId);
  // 색상 경계(다른 그래프)를 넘어 전파하지 않는다
  const descendantIds = rootColor
    ? getSameColorDescendantIds(rootId, edges, rootColor, colorOfNodeIn(nodes))
    : getDescendantIds(rootId, edges);
  return [rootId, ...descendantIds].filter(
    (id) => !nodes.find((n) => n.id === id)?.data?.isMain,
  );
}

// 대칭이동(미러)은 서브트리를 축 반대편으로 보내는데, 색이 다른(다른 그래프) 직계
// 자식은 함께 이동하지 않으므로 연결 방향 규칙이 꼬인다 → 대칭이동 시점에 그 크로스
// 그래프 엣지를 끊는다. 불변식: 같은 그래프의 자식은 항상 부모와 같은 색
// (legacy 무색 노드는 2026-07-05 데이터 정리로 소거 — 색 다름 = 크로스 그래프 확정)
function findCrossColorChildEdges(
  mirroredIds: Iterable<string>,
  nodes: Node[],
  edges: Edge[],
): Edge[] {
  const colorOf = colorOfNodeIn(nodes);
  const ids = new Set(mirroredIds);
  // source/target 정규화(isMain·엣지 수 우선) 때문에 크로스 그래프 엣지는 다른 그래프
  // 쪽이 source일 수도 있다 → 방향 무관하게 한쪽 끝이 미러 집합에 속하면 검사한다.
  // 양쪽 다 집합 안이면 같은 서브트리(같은 색)라 색 비교에서 걸러진다.
  return edges.filter((edge) => {
    if (!ids.has(edge.source) && !ids.has(edge.target)) return false;
    const srcColor = colorOf(edge.source);
    const tgtColor = colorOf(edge.target);
    // 한쪽 색이 미확정(색 없는 legacy main 등)이면 크로스 그래프로 단정하지 않는다
    // — 오판 시 자기 그래프의 엣지를 끊어 서브트리가 고아가 된다 (Aideep_backend#52 전까지 방어)
    if (srcColor === undefined || tgtColor === undefined) return false;
    return srcColor !== tgtColor;
  });
}

function updateSubtreeColors(
  rootId: string,
  nodes: Node[],
  edges: Edge[],
  colorPair: { bg: string; text: string },
): Node[] {
  const idsToUpdate = new Set(getRecolorTargetIds(rootId, nodes, edges));

  return nodes.map((node) =>
    idsToUpdate.has(node.id)
      ? {
          ...node,
          data: {
            ...node.data,
            color: colorPair.bg,
            textColor: colorPair.text,
          },
        }
      : node,
  );
}

function areSiblings(aId: string, bId: string, edges: Edge[]): boolean {
  const parentA = getParentId(aId, edges);
  const parentB = getParentId(bId, edges);
  return parentA !== null && parentA === parentB;
}

function isInvalidConnection(
  sourceId: string,
  targetId: string,
  nodes: Node[],
  edges: Edge[],
): boolean {
  if (sourceId === targetId) return true;

  // 프로젝트(main) 노드끼리는 직접 연결 불가 — 모든 연결 경로(핸들 드래그·노드 드래그·드롭)가 이 함수를 거친다
  const sourceIsMain = nodes.find((n) => n.id === sourceId)?.data?.isMain;
  const targetIsMain = nodes.find((n) => n.id === targetId)?.data?.isMain;
  if (sourceIsMain && targetIsMain) return true;

  // 둘이 서로 연결되어 있는지 확인
  const targetParent = getParentId(targetId, edges);
  const sourceParent = getParentId(sourceId, edges);
  if (targetParent === sourceId || sourceParent === targetId) return true;

  return false;
}

function rectForNode(node: Node) {
  return {
    left: node.position.x,
    right: node.position.x + NODE_WIDTH,
    top: node.position.y,
    bottom: node.position.y + NODE_HEIGHT,
  };
}

function isOverlapping(a: Node, b: Node): boolean {
  const rectA = rectForNode(a);
  const rectB = rectForNode(b);

  return !(
    rectA.right + NODE_PADDING < rectB.left ||
    rectA.left > rectB.right + NODE_PADDING ||
    rectA.bottom + NODE_PADDING < rectB.top ||
    rectA.top > rectB.bottom + NODE_PADDING
  );
}

function canApplyMove(
  nodes: Node[],
  movingIds: Set<string>,
  delta: { x: number; y: number },
): boolean {
  const movingNodes = nodes.filter((node) => movingIds.has(node.id));
  const staticNodes = nodes.filter((node) => !movingIds.has(node.id));

  return movingNodes.every((node) => {
    const movedNode = {
      ...node,
      position: {
        x: node.position.x + delta.x,
        y: node.position.y + delta.y,
      },
    };

    return staticNodes.every((other) => !isOverlapping(movedNode, other));
  });
}

function findOverlapTarget(dragged: Node, nodes: Node[]): Node | null {
  for (const node of nodes) {
    if (node.id === dragged.id) continue;
    if (isOverlapping(dragged, node)) return node;
  }
  return null;
}

// AABB 테두리 간 최단 거리 기반으로 가장 가까운 유효한 노드 찾기
function findClosestNodeInRange(
  draggedNode: Node,
  nodes: Node[],
  edges: Edge[],
  threshold: number = 50, // 픽셀 단위 임계값
): Node | null {
  let closestNode: Node | null = null;
  let minDistance = threshold;

  // 드래그 중인 노드의 실제 크기
  const draggedWidth = draggedNode.width ?? NODE_WIDTH;
  const draggedHeight = draggedNode.height ?? NODE_HEIGHT;

  // 드래그 중인 노드의 AABB 경계 계산 (중심점 기준)
  const draggedCenterX = draggedNode.position.x + draggedWidth / 2;
  const draggedCenterY = draggedNode.position.y + draggedHeight / 2;
  const ax1 = draggedCenterX - draggedWidth / 2;
  const ay1 = draggedCenterY - draggedHeight / 2;
  const ax2 = draggedCenterX + draggedWidth / 2;
  const ay2 = draggedCenterY + draggedHeight / 2;

  for (const node of nodes) {
    if (node.id === draggedNode.id) continue;

    // 연결 유효성 체크
    if (isInvalidConnection(node.id, draggedNode.id, nodes, edges)) continue;

    // 대상 노드의 실제 크기
    const nodeWidth = node.width ?? NODE_WIDTH;
    const nodeHeight = node.height ?? NODE_HEIGHT;

    // 대상 노드의 AABB 경계 계산 (중심점 기준)
    const nodeCenterX = node.position.x + nodeWidth / 2;
    const nodeCenterY = node.position.y + nodeHeight / 2;
    const bx1 = nodeCenterX - nodeWidth / 2;
    const by1 = nodeCenterY - nodeHeight / 2;
    const bx2 = nodeCenterX + nodeWidth / 2;
    const by2 = nodeCenterY + nodeHeight / 2;

    // y축 범위가 겹치지 않으면 제외 (위아래로는 감지 안 함)
    if (ay2 < by1 || ay1 > by2) continue;

    // x축 방향 거리만 계산 (좌우 방향으로만 감지)
    const dx = Math.max(0, Math.max(ax1, bx1) - Math.min(ax2, bx2));
    const distance = dx;

    if (distance < minDistance) {
      minDistance = distance;
      closestNode = node;
    }
  }

  return closestNode;
}

function findNonOverlappingPosition(
  base: { x: number; y: number },
  nodes: Node[],
): { x: number; y: number } {
  const candidate = (x: number, y: number) =>
    ({
      id: '__drag_candidate__',
      position: { x, y },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      data: {},
    }) as Node;

  if (!nodes.some((node) => isOverlapping(candidate(base.x, base.y), node))) {
    return base;
  }

  const step = 16;
  const maxRadius = 12;
  for (let r = 1; r <= maxRadius; r += 1) {
    const radius = r * step;
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI / 4) * i;
      const x = base.x + Math.round(Math.cos(angle) * radius);
      const y = base.y + Math.round(Math.sin(angle) * radius);
      if (!nodes.some((node) => isOverlapping(candidate(x, y), node))) {
        return { x, y };
      }
    }
  }

  return base;
}

function getForcedOutboundSideForSubNodeInMainGraph(
  node: Node,
  nodes: Node[],
  edges: Edge[],
): 'left' | 'right' | null {
  if (node.data?.isMain) return null;

  const mainNode = getMainNodeForSubtree(node.id, nodes, edges);
  if (!mainNode) return null;

  const parentId = getParentId(node.id, edges);
  const parentNode = parentId
    ? nodes.find((n) => n.id === parentId)
    : undefined;
  const referenceX = parentNode?.position.x ?? mainNode.position.x;

  // root 노드의 반대 방향(바깥쪽)으로만 새 연결을 허용
  return getTargetSideRelativeToParent(node.position.x, referenceX);
}

function resolveSideFromEdgeHandle(
  edge: Edge,
  sourceNode: Node,
  targetNode: Node,
): 'left' | 'right' {
  if (edge.sourceHandle?.includes('left')) return 'left';
  if (edge.sourceHandle?.includes('right')) return 'right';

  return getTargetSideRelativeToParent(
    targetNode.position.x,
    sourceNode.position.x,
  );
}

function getTargetSideRelativeToParent(
  targetX: number,
  parentX: number,
): 'left' | 'right' {
  return targetX < parentX ? 'left' : 'right';
}

/**
 * Source 노드 기준으로 target 노드의 X/Y 좌표를 적절히 조정
 * X는 연결 방향 기준 고정 거리, Y는 같은 방향 형제 노드와 간격을 유지하도록 보정
 * @param sourceNode - 부모(source) 노드
 * @param originalY - 생성/드롭된 Y 좌표
 * @param side - 연결 방향 ("left" 또는 "right")
 * @param nodes - 현재 노드 목록
 * @param edges - 현재 엣지 목록
 * @param excludeNodeId - Y 충돌 검사에서 제외할 노드 ID (재연결 시 자기 자신 제외)
 */
function adjustPositionRelativeToSource(
  sourceNode: Node,
  originalY: number,
  side: 'left' | 'right',
  nodes: Node[],
  edges: Edge[],
  excludeNodeId?: string,
  targetNode?: Node | null,
): { x: number; y: number } {
  const sourceWidth = sourceNode?.width ?? NODE_WIDTH;
  const targetWidth = targetNode?.width ?? NODE_WIDTH;

  // 연결 방향에 따라 X 좌표 계산
  const targetX =
    side === 'right'
      ? sourceNode.position.x + sourceWidth + DEFAULT_NODE_DISTANCE
      : sourceNode.position.x - targetWidth - DEFAULT_NODE_DISTANCE;

  const siblingYs = edges
    .filter(
      (edge) => edge.source === sourceNode.id && edge.target !== excludeNodeId,
    )
    .map((edge) => {
      const targetNode = nodes.find((node) => node.id === edge.target);
      if (!targetNode) return null;
      return {
        node: targetNode,
        edgeSide: resolveSideFromEdgeHandle(edge, sourceNode, targetNode),
      };
    })
    .filter(
      (item): item is { node: Node; edgeSide: 'left' | 'right' } =>
        item !== null,
    )
    .filter((item) => item.edgeSide === side)
    .map((item) => item.node.position.y);

  const verticalGap = NODE_HEIGHT + 24;
  const isYAvailable = (y: number) =>
    siblingYs.every((siblingY) => Math.abs(siblingY - y) >= verticalGap);

  let targetY = originalY;
  if (!isYAvailable(targetY)) {
    for (let i = 1; i <= 20; i++) {
      const upperY = originalY - i * verticalGap;
      if (isYAvailable(upperY)) {
        targetY = upperY;
        break;
      }

      const lowerY = originalY + i * verticalGap;
      if (isYAvailable(lowerY)) {
        targetY = lowerY;
        break;
      }
    }
  }

  return {
    x: targetX,
    y: targetY,
  };
}

function resolveHandleId(
  role: 'source' | 'target',
  side: 'left' | 'right',
): string {
  // source 핸들: side 방향과 같은 방향에 위치 (예: side="right" → source-right)
  // target 핸들: source의 반대 방향에 위치 (예: side="right"이면 target이 source 오른쪽에 있으므로 → target-left)
  if (role === 'target') {
    return `target-${side === 'left' ? 'right' : 'left'}`;
  }
  return `source-${side}`;
}

/*
 * CONTEXT
 * - Problem      : 비-root 노드는 source-{handleSide} 핸들 하나만 렌더링하므로, 서브트리
 *                  방향이 바뀌는 지점(재부모화·트리 병합)에서 자손 handleSide·내부 엣지
 *                  핸들을 함께 갱신하지 않으면 엣지가 존재하지 않는 핸들을 가리켜
 *                  React Flow 에러 #008로 렌더링에서 탈락한다.
 * - Why          : D3 대칭이동 경로(방향 반전 시 서브트리 전체 handleSide + 엣지 핸들
 *                  동시 갱신)와 동일한 규칙을 나머지 두 경로에도 적용한다. 서버는 노드
 *                  handleSide 개념이 없고 엣지 핸들만 저장하므로, 로컬 갱신분을 PATCH
 *                  /edge/:edgeId로 동반 저장해야 새로고침 후에도 일관된다.
 * - Alternatives : buildEdgePresentation에서 렌더링 시점 보정 — 데이터 모순을 화면에서만
 *                  가리고 서버엔 그대로 남아 다른 클라이언트·재접속에서 재발, 기각.
 * - Trade-offs   : 서브트리 내부 엣지 수만큼 PATCH 요청 발생 (엣지별 실패는 로그만,
 *                  로컬 상태는 이미 일관 — 실패분은 새로고침 시 다시 어긋날 수 있음).
 * - Edge Case    : 크로스 색 엣지는 같은 그래프 자손 집합에 포함되지 않아 정규화 대상에서
 *                  자연 제외된다 (대칭이동 절단 로직이 별도 처리).
 */
function subtreeInternalEdgeFilter(
  rootId: string,
  subtreeIds: Set<string>,
): (edge: Edge) => boolean {
  return (edge) =>
    (edge.source === rootId || subtreeIds.has(edge.source)) &&
    subtreeIds.has(edge.target);
}

// 서브트리 내부 엣지 핸들의 서버 저장분 갱신 — 이미 새 방향인 엣지는 건너뛴다
function persistSubtreeEdgeHandles(
  workspaceId: string,
  edges: Edge[],
  isInternal: (edge: Edge) => boolean,
  side: 'left' | 'right',
): void {
  const sourceHandle = resolveHandleId('source', side);
  const targetHandle = resolveHandleId('target', side);
  edges
    .filter(isInternal)
    .filter(
      (e) => e.sourceHandle !== sourceHandle || e.targetHandle !== targetHandle,
    )
    .forEach((e) => {
      console.log('[handle:save] updateEdge PATCH 요청 — 엣지 핸들 저장', e.id, {
        before: { sourceHandle: e.sourceHandle, targetHandle: e.targetHandle },
        after: { sourceHandle, targetHandle },
      });
      updateEdge(workspaceId, e.id, { sourceHandle, targetHandle })
        .then(() =>
          console.log(
            '[handle:save] updateEdge PATCH 응답(서버 저장 완료)',
            e.id,
          ),
        )
        .catch(
          (err) => console.error(`[updateEdge subtree ${e.id}] failed`, err),
        );
    });
}

/*
 * CONTEXT
 * - Problem      : 서버 PATCH /node/:id/move는 해당 노드를 절대 좌표로 저장하면서 DB 기준
 *                  delta를 모든 자손에게도 전파한다(node.service.updateNodePosition).
 *                  클라이언트가 드래그 종료 시 부모·자식 각각의 절대 좌표를 병렬 PATCH하면,
 *                  자식 요청이 부모보다 먼저 처리되는 순서에서 자식 = 최종 좌표 + 부모 delta로
 *                  이중 이동된다 (새로고침 시 서브트리만 밀려 보이는 증상).
 * - Why          : root만 PATCH하고 서버 전파 결과를 로컬에서 시뮬레이션한 뒤, 로컬 최종
 *                  위치와 어긋나는 자손만 root 응답 이후 순차 보정한다. 일반 드래그(순수
 *                  평행이동)는 요청 1건, Alt 단독 이동·대칭이동·크로스 그래프 자손처럼
 *                  전파 결과가 로컬과 다른 노드만 추가 PATCH가 나간다.
 * - Alternatives : ① 전 노드 순차 저장 — 항상 자손 수만큼 왕복, 대부분 불필요.
 *                  ② 자식 전송 완전 제거 — Alt 단독 이동·대칭이동에서 서버 전파값이 로컬과
 *                  달라 새로고침 시 어긋남, 기각.
 * - Trade-offs   : 서버 전파 규칙(전체 자손, 색 경계 무시)이 바뀌면 시뮬레이션도 함께
 *                  바꿔야 한다. 보정은 순차 await라 어긋난 자손이 많으면(대칭이동) 왕복 누적.
 * - Edge Case    : root PATCH 실패 시 서버 전파도 없었던 것이므로 보정 전체를 건너뛴다.
 *                  보정 PATCH도 각자 자손에게 delta를 전파하므로 시뮬레이션에 누적 반영한다.
 */
async function saveDragPositions(
  workspaceId: string,
  roots: Array<{ id: string; final?: { x: number; y: number } }>,
  latestNodes: Node[],
  edges: Edge[],
  startPositions: Map<string, { x: number; y: number }>,
): Promise<void> {
  const posOf = (id: string): { x: number; y: number } | undefined => {
    const node = latestNodes.find((n) => n.id === id);
    return node ? { x: node.position.x, y: node.position.y } : undefined;
  };

  for (const root of roots) {
    const rootFinal = root.final ?? posOf(root.id);
    if (!rootFinal) continue;

    console.log(
      '[pos:save] saveDragPositions — root 저장 (서버가 자손 delta 전파)',
      root.id,
      rootFinal,
    );
    try {
      await moveNode(workspaceId, root.id, rootFinal);
    } catch (err) {
      console.error('[moveNode] failed', err);
      continue; // root 실패 = 서버 전파도 없음 — 자손 보정 스킵
    }

    // 서버 전파 시뮬레이션: 자손 = 드래그 시작 위치 + root delta (색 경계 무시 — 서버 selectAllDescendantIds와 동일)
    const descendantIds = getDescendantIds(root.id, edges);
    const serverPos = new Map<string, { x: number; y: number }>();
    descendantIds.forEach((id) => {
      const start = startPositions.get(id);
      if (start) serverPos.set(id, { ...start });
    });
    const rootStart = startPositions.get(root.id);
    if (rootStart) {
      const dx = rootFinal.x - rootStart.x;
      const dy = rootFinal.y - rootStart.y;
      serverPos.forEach((p) => {
        p.x += dx;
        p.y += dy;
      });
    }

    // BFS 순서(조상 → 자손)로 어긋난 자손만 보정 — 보정 자체의 자손 전파도 누적 반영
    for (const childId of descendantIds) {
      const final = posOf(childId);
      const expected = serverPos.get(childId);
      if (!final || !expected) continue;
      if (
        Math.abs(expected.x - final.x) < 0.5 &&
        Math.abs(expected.y - final.y) < 0.5
      ) {
        continue;
      }
      console.log(
        '[pos:save] saveDragPositions — 자손 보정 (서버 전파 예상 ≠ 로컬 최종)',
        childId,
        { 서버예상: expected, 로컬최종: final },
      );
      try {
        await moveNode(workspaceId, childId, final);
      } catch (err) {
        console.error(`[moveNode child ${childId}] failed`, err);
        continue;
      }
      const cdx = final.x - expected.x;
      const cdy = final.y - expected.y;
      getDescendantIds(childId, edges).forEach((id) => {
        const p = serverPos.get(id);
        if (p) {
          p.x += cdx;
          p.y += cdy;
        }
      });
      serverPos.set(childId, { ...final });
    }
  }
}

function buildEdgePresentation(edge: Edge, nodes: Node[], edges: Edge[]): Edge {
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  if (!source || !target) return edge;

  const forcedSourceSide = getForcedOutboundSideForSubNodeInMainGraph(
    source,
    nodes,
    edges,
  );
  // target.data.handleSide는 topology 변경 시점(connect/drag-stop)에만 갱신되므로
  // 드래그 중 position이 바뀌어도 sourceHandle/targetHandle이 유지되도록 한다.
  const storedSide = target.data?.handleSide as 'left' | 'right' | undefined;
  const side =
    storedSide ??
    forcedSourceSide ??
    getTargetSideRelativeToParent(target.position.x, source.position.x);
  const sourceHandle = resolveHandleId('source', side);
  const targetHandle = resolveHandleId('target', side);
  const sourceHandleX =
    source.position.x +
    (side === 'right'
      ? (source.measured?.width ?? source.width ?? NODE_WIDTH)
      : 0);

  return {
    ...edge,
    type: 'branch',
    sourceHandle,
    targetHandle,
    data: {
      ...edge.data,
      hubX: sourceHandleX + (side === 'right' ? HUB_OFFSET : -HUB_OFFSET),
      hubY: source.position.y + NODE_HEIGHT / 2,
    },
  };
}

function mirrorSubtree(
  nodes: Node[],
  subtreeIds: Set<string>, // root 제외, 함께 이동하는(같은 그래프) 자식들만
  parentAxisX: number,
): Node[] {
  const beforePositions = new Map(
    nodes
      .filter((node) => subtreeIds.has(node.id))
      .map((node) => [node.id, { x: node.position.x, y: node.position.y }]),
  );

  const next = nodes.map((node) =>
    subtreeIds.has(node.id)
      ? {
          ...node,
          position: {
            x: parentAxisX * 2 - node.position.x - (node.width ?? NODE_WIDTH),
            y: node.position.y,
          },
        }
      : node,
  );

  if (subtreeIds.size > 0) {
    const diffs = next
      .filter((node) => subtreeIds.has(node.id))
      .map((node) => {
        const before = beforePositions.get(node.id);
        return {
          id: node.id,
          beforeX: before?.x,
          beforeY: before?.y,
          afterX: node.position.x,
          afterY: node.position.y,
        };
      });
    console.log(
      '[pos:move] mirrorSubtree — 서브트리 대칭이동 before/after',
      diffs,
    );
  }

  return next;
}

function initializeHandleSides(nodes: Node[], edges: Edge[]): Node[] {
  return nodes.map((node) => {
    if (node.data?.isMain) return node;

    // root 판별은 depth === 0 (issue #99) — 핸들 방향만 incoming edge에서 유도
    const hasParent = !isRootNode(node);

    // Case 1: target 노드 (부모가 있음) → incoming edge의 sourceHandle로 방향 결정
    const incomingEdge = edges.find((e) => e.target === node.id);
    if (incomingEdge) {
      const side: 'left' | 'right' | undefined =
        incomingEdge.sourceHandle?.includes('right')
          ? 'right'
          : incomingEdge.sourceHandle?.includes('left')
            ? 'left'
            : undefined;
      return {
        ...node,
        data: { ...node.data, handleSide: side, hasParent },
      };
    }

    // Case 2: 부모 없는 non-main 노드
    return { ...node, data: { ...node.data, hasParent } };
  });
}

// D3 force simulation용 노드 타입
interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphCanvasInnerProps {
  workspaceId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: WorkspaceRole;
  focusedNodeId: string | null;
  onFocusComplete?: () => void;
  nodes: Node[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
}

export function convertToReactFlow(
  graphNodes: NodeDto[],
  graphEdges: EdgeDto[],
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = graphNodes.map((n) => ({
    id: n.node_id,
    type: 'textUpdater',
    position: { x: n.position_x, y: n.position_y },
    data: {
      title: n.title,
      color: n.content?.color ?? DEFAULT_NODE_COLOR.bg,
      textColor: n.content?.textColor ?? DEFAULT_NODE_COLOR.text,
      isMain: n.node_type === 'PROJECT',
      nodeType: n.node_type,
      depth: n.depth ?? 0,
    },
  }));

  const rawEdges: Edge[] = graphEdges.map((e) => ({
    id: e.edge_id,
    source: e.source_id,
    target: e.target_id,
    type: 'branch',
    sourceHandle: e.source_handle,
    targetHandle: e.target_handle,
    data: {},
  }));

  const nodesWithHandleSide = initializeHandleSides(nodes, rawEdges);

  const edges: Edge[] = rawEdges.map((edge) =>
    buildEdgePresentation(edge, nodesWithHandleSide, rawEdges),
  );

  return { nodes: nodesWithHandleSide, edges };
}

function GraphCanvasInner({
  workspaceId,
  currentUserId,
  currentUserName,
  currentUserRole,
  focusedNodeId,
  onFocusComplete,
  nodes,
  edges,
  setNodes,
  setEdges,
}: GraphCanvasInnerProps) {
  const [myOpenEditorNodeIds, setMyOpenEditorNodeIds] = useState<string[]>([]);
  const [workingOnEditorNodeId, setWorkingOnEditorNodeId] = useState<string | null>(
    null,
  );
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(
    null,
  );
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isArchiveDeleting, setIsArchiveDeleting] = useState(false);
  const [pendingArchiveNodeIds, setPendingArchiveNodeIds] = useState<string[]>(
    [],
  );

  const { screenToFlowPosition, setCenter } = useReactFlow();

  // ─── Workspace Awareness ─────────────────────────────────────────
  const cursorColor = getCursorColor(currentUserId);

  const { nodeViewers, aggregateOpenNodeIds, setOpenEditorNodeId, setAwarenessOpenNodeIds } = useWorkspaceAwareness({
    workspaceId,
    userName: currentUserName,
    userColor: cursorColor,
    role: currentUserRole,
  });

  // Sync workingOnEditorNodeId → awareness (viewer 뱃지용)
  useEffect(() => {
    setOpenEditorNodeId(workingOnEditorNodeId);
  }, [workingOnEditorNodeId, setOpenEditorNodeId]);

  // Sync myOpenEditorNodeIds → awareness (내가 연 패널 목록 전파용)
  useEffect(() => {
    // CONTEXT: 
    // awareness 는 기본적으로 map 형태로, workspaceId 를 key 값으로 가지며 각 workspace 내에서 참여자 별로 데이터를 저장하는 것이 best practice 이다. (예: awareness.getStates()[clientId] = { user: { name, color }, openEditorNodeId, openNodeIds } 형태)
    // 그래서 각 참여자 별로 연 패널 목록을 따로 관리하고 공유함으로서, 각 사용자가 워크스페이스를 떠나면 해당 사용자만 열어뒀던 패널들은 자동으로 닫히도록 할 수 있다. 
    // 별도의 연결 상태 관리가 필요 없이 awareness 로 참여자의 연결 상태를 관리 가능하므로, 내가 떠나면 내 상태가 사라지게 구현한다.
    setAwarenessOpenNodeIds(myOpenEditorNodeIds);
  }, [myOpenEditorNodeIds, setAwarenessOpenNodeIds]);

  // viewport 저장 (debounce)
  const viewportSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedViewport] = useState<{ x: number; y: number; zoom: number } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(`graph_viewport_${workspaceId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const handleViewportChange = useCallback(
    (viewport: { x: number; y: number; zoom: number }) => {
      if (viewportSaveTimer.current) clearTimeout(viewportSaveTimer.current);
      viewportSaveTimer.current = setTimeout(() => {
        try {
          sessionStorage.setItem(
            `graph_viewport_${workspaceId}`,
            JSON.stringify(viewport),
          );
        } catch {}
      }, 300);
    },
    [workspaceId],
  );

  // D3 force simulation 관리
  const simulationRef = useRef<d3.Simulation<D3Node, undefined> | null>(null);
  const d3NodesRef = useRef<D3Node[]>([]);
  const isDraggingRef = useRef(false);
  const nodesRef = useRef<Node[]>(nodes);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  const contentSaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const previousDragPositionRef = useRef<{ x: number; y: number } | null>(null);
  // 드래그 시작 시점 전체 노드 위치 스냅샷 — 서버 move의 자손 delta 전파 시뮬레이션 기준값
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );
  // 드래그 시작 시점 엣지 핸들 스냅샷 — 드래그 중 좌우 반전으로 로컬에서만 바뀐
  // 핸들을 드래그 종료 시 diff로 골라 서버에 저장하기 위한 기준값
  const dragStartEdgeHandlesRef = useRef<
    Map<string, { source?: string | null; target?: string | null }>
  >(new Map());
  const isConnectingRef = useRef(false);
  const isMultiDragRef = useRef(false);
  const lastLiveEmitRef = useRef(0);
  const LIVE_EMIT_INTERVAL = 50; // ms

  // ─── Cursor sharing ──────────────────────────────────────
  /*
    CONTEXT:
      본인 커서: 브라우저 기본 커서를 그대로 사용.
               WS round-trip을 거치면 필연적으로 지연이 발생하고, 손 아이콘 등 커스텀 상태를 오버레이로 그리는 복잡성 대비 실익이 없어 제거함.
      상대방 커서: WS로 수신한 위치를 CursorOverlay에서 PointerIcon + 이름 뱃지로 렌더링.
  */
  const cursors = useCursors(workspaceId, currentUserId);
  const lastCursorEmitRef = useRef(0);
  const CURSOR_EMIT_INTERVAL = 30; // ms

  // TODO: 워크스페이스에 혼자 있을 때는 emit을 끊는 최적화 가능 (현재는 항상 emit)
  const screenToFlowPositionRef = useRef(screenToFlowPosition);
  const cursorMetaRef = useRef({
    workspaceId,
    currentUserName,
    cursorColor,
  });

  useEffect(() => {
    screenToFlowPositionRef.current = screenToFlowPosition;
  }, [screenToFlowPosition]);

  useEffect(() => {
    cursorMetaRef.current = {
      workspaceId,
      currentUserName,
      cursorColor,
    };
  }, [workspaceId, currentUserName, cursorColor]);

  useEffect(() => {
    const handler = (event: PointerEvent) => {
      const { workspaceId, currentUserName, cursorColor } =
        cursorMetaRef.current;
      const flowPos = screenToFlowPositionRef.current({
        x: event.clientX,
        y: event.clientY,
      });

      const now = Date.now();
      if (now - lastCursorEmitRef.current < CURSOR_EMIT_INTERVAL) return;
      lastCursorEmitRef.current = now;
      emitCursorMove(
        workspaceId,
        flowPos.x,
        flowPos.y,
        currentUserName,
        cursorColor,
      );
    };
    // document 레벨 pointermove > 캔버스 외부로 드래그 및 다른 마우스 동작에서도 상대방 커서 추적 가능하도록
    document.addEventListener('pointermove', handler);
    return () => document.removeEventListener('pointermove', handler);
  }, []); // 마운트/언마운트 시 1회만 등록 — 최신 값은 ref로 접근

  // contentSaveTimers cleanup on unmount
  useEffect(() => {
    return () => {
      contentSaveTimers.current.forEach((timer) => clearTimeout(timer));
      contentSaveTimers.current.clear();
    };
  }, []);

  /* =========================
     D3 Force Simulation 초기화
     ========================= */
  useEffect(() => {
    const simulation = d3
      .forceSimulation<D3Node>()
      .force('collide', rectCollide<D3Node>(NODE_PADDING))
      .alphaDecay(0.02) // 더 빠른 안정화
      .velocityDecay(0.4); // 움직임의 감쇠

    // tick 이벤트: d3의 계산 결과를 React Flow nodes에 반영
    simulation.on('tick', () => {
      if (!isDraggingRef.current) return;

      const d3Nodes = d3NodesRef.current;
      if (d3Nodes.length === 0) return;

      setNodes((currentNodes) => {
        const moved: Array<{
          id: string;
          from: { x: number; y: number };
          to: { x: number; y: number };
        }> = [];
        const next = currentNodes.map((node) => {
          const d3Node = d3Nodes.find((d) => d.id === node.id);
          if (!d3Node) return node;

          // D3는 중심점 기준, React Flow는 왼쪽 상단 기준이므로 변환
          const nodeWidth = node.width ?? NODE_WIDTH;
          const nodeHeight = node.height ?? NODE_HEIGHT;

          const newPosition = {
            x: (d3Node.x ?? node.position.x + nodeWidth / 2) - nodeWidth / 2,
            y: (d3Node.y ?? node.position.y + nodeHeight / 2) - nodeHeight / 2,
          };
          if (
            Math.abs(newPosition.x - node.position.x) > 0.5 ||
            Math.abs(newPosition.y - node.position.y) > 0.5
          ) {
            moved.push({ id: node.id, from: node.position, to: newPosition });
          }

          return {
            ...node,
            position: newPosition,
          };
        });
        if (moved.length > 0) {
          console.log('[pos:move] D3 tick — 충돌 회피로 밀려난 노드', moved);
        }
        return next;
      });
    });

    // alpha가 충분히 작아지면 시뮬레이션 멈춤
    simulation.on('end', () => {
      console.log('Simulation ended');
    });

    simulationRef.current = simulation;

    // cleanup
    return () => {
      simulation.stop();
    };
  }, []);

  /* =========================
     Node data update
     ========================= */
  const handleNodeViewChange = useCallback(
    (nodeId: string, newData: Record<string, unknown>) => {
      setNodes((snapshot) =>
        snapshot.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...newData } }
            : node,
        ),
      );
    },
    [setNodes],
  );

  /*
   * CONTEXT — lazy backfill: 색 없는 main(PROJECT) 노드에 그래프 색을 뒤늦게 저장
   * - Problem      : 그래프 단위 동작(서브트리 이동·색 전파·삭제 캐스케이드)은
   *                  "같은 색 = 같은 그래프"로 경계를 판별하므로, main 노드도
   *                  data.color에 자기 그래프 색을 갖고 있어야 한다(표시만 흰색).
   *                  그런데 color 없는 PROJECT 노드가 DB에 존재한다:
   *                  ① 클라 createProjectNode가 { title, position }만 전송하고
   *                  ② 서버 CreateProjectNodeBody.body에 @IsDefined()가 없어
   *                     body 누락 요청이 검증을 통과해 content가 색 없이 저장됨.
   * - Why          : PROJECT 노드는 생성 시점엔 연결된 그래프가 없어 색을 정할 수
   *                  없고, 그래프 색은 첫 엣지 연결 시점에야 확정된다. 그래서 색이
   *                  확정되는 각 지점(onConnect, 핸들 드래그로 새 노드 생성, 노드
   *                  드래그 연결, 드래그 종료)에서 이 함수를 호출해, 색 없는 main에
   *                  로컬 state + 서버(updateNodeContent) 양쪽으로 색을 채워 넣는다.
   *                  한 번 채워지면 getGraphColor·getSameGraphDescendantIds가 edges
   *                  탐색(추정 폴백) 없이 본인 data.color를 바로 쓴다.
   * - Alternatives : 생성 시점에 랜덤 색 부여 — 첫 연결 상대의 색과 이중 진실이 됨.
   *                  서버 백필 마이그레이션 — 근본 해결이지만 서버 작업이라 이슈로 분리.
   * - Trade-offs   : 백필 전까지는 색 없는 main이 남아 있어 추정 폴백(ponytail: 주석
   *                  블록)이 필요하고, 크로스 그래프 자식이 먼저 잡히면 오판 가능.
   * - 제거 조건    : 서버가 ① 기존 PROJECT 노드 color 백필 ② 생성 시 body 필수화
   *                  (Aideep_backend#52)를 완료하면, 이 함수와 getGraphColor·
   *                  getSameGraphDescendantIds의 추정 폴백 블록을 함께 삭제한다.
   * - Edge Case    : 색이 이미 있는 main·main이 아닌 노드는 no-op (멱등).
   */
  const backfillMainColor = useCallback(
    (nodeId: string, colorPair: { bg: string; text: string }) => {
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node?.data?.isMain || isCustomColorNode(nodeId, nodesRef.current)) {
        return;
      }

      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  color: colorPair.bg,
                  textColor: colorPair.text,
                },
              }
            : n,
        ),
      );
      updateNodeContent(workspaceId, nodeId, {
        color: colorPair.bg,
        textColor: colorPair.text,
      }).catch((err) => console.error('[backfillMainColor] failed', err));
    },
    [workspaceId, setNodes],
  );

  const titleDebounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const handleClosePanel = useCallback((nodeId: string) => {
    setMyOpenEditorNodeIds((prev) => prev.filter((id) => id !== nodeId));
    setWorkingOnEditorNodeId((prev) => (prev === nodeId ? null : prev));
  }, []);

  const handleForwardPanel = useCallback((nodeId: string) => {
    setWorkingOnEditorNodeId(nodeId);
  }, []);

  const handleCloseAllPanels = useCallback(() => {
    setMyOpenEditorNodeIds([]);
    setWorkingOnEditorNodeId(null);
  }, []);

  const handleTitleChange = useCallback(
    (nodeId: string, value: string) => {
      handleNodeViewChange(nodeId, { title: value });

      const existing = titleDebounceRef.current.get(nodeId);
      if (existing) clearTimeout(existing);

      titleDebounceRef.current.set(
        nodeId,
        setTimeout(() => {
          updateNodeContent(workspaceId, nodeId, { title: value }).catch(
            console.error,
          );
          titleDebounceRef.current.delete(nodeId);
        }, 500),
      );
    },
    [workspaceId, handleNodeViewChange],
  );
  // ponytail: 로컬 상태만 토글 — 백엔드에 node_type 변경 API가 없음. 서버 영속·협업자 동기화는 백엔드 엔드포인트 추가 시 연동
  const handleToggleNodeType = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id !== nodeId) return node;
        const toProject = !node.data?.isMain;
        return {
          ...node,
          data: {
            ...node.data,
            isMain: toProject,
            nodeType: toProject ? 'PROJECT' : 'DATA',
          },
        };
      }),
    );
    setContextMenuNodeId(null);
  };

  // 키보드 Backspace 삭제(onBeforeDelete)와 동일 플로우: 확인 모달 → 서브트리 삭제 + WS 동기화
  const handleDeleteNode = (nodeId: string) => {
    setContextMenuNodeId(null);
    requestArchiveForNodes([nodeId]);
  };

  const nodesWithCallbacks = nodes.map((node) => {
    // 부모가 없는 서브 노드는 양쪽에 핸들 표시 — root 판별은 depth === 0 (issue #99)
    const hasParent = !isRootNode(node);

    const isContextMenuOpen = contextMenuNodeId === node.id;
    const isEditorOpen = aggregateOpenNodeIds.includes(node.id);

    return {
      ...node,
      zIndex: isContextMenuOpen ? 1000 : isEditorOpen ? 100 : undefined,
      data: {
        ...node.data,
        handleSide: node.data?.isMain ? undefined : node.data?.handleSide,
        hasParent, // 부모 노드 존재 여부 전달
        showInputBox: aggregateOpenNodeIds.includes(node.id), // 열린 노드에 입력박스 표시
        isContextMenuOpen, // 컨텍스트 메뉴 표시 여부
        panelZIndex: node.id === workingOnEditorNodeId ? 30 : 20, // 포커스된 패널이 위
        isHovered: hoveredNodeId === node.id, // 드래그 중 hover된 노드 표시
        workspaceId, // 전체화면 이동 시 사용
        viewers: nodeViewers[node.id] ?? [], // 현재 이 노드를 보고 있는 다른 유저들
        onToggleNodeType: handleToggleNodeType,
        onDeleteNode: handleDeleteNode,
        onClosePanel: handleClosePanel,
        onForwardPanel: handleForwardPanel,
        onChange: handleTitleChange,
      },
    };
  });

  /* =========================
     React Flow handlers
     ========================= */
  const requestArchiveForNodes = useCallback(
    (rootNodeIds: string[]) => {
      const subtreeNodeIds = new Set<string>();

      rootNodeIds.forEach((rootId) => {
        subtreeNodeIds.add(rootId);
        // 삭제 캐스케이드도 그래프 경계(색 경계)에서 멈춘다 — 크로스 그래프 엣지로
        // 이어진 상대 그래프의 노드는 삭제 대상에서 제외. 두 그래프를 잇던 엣지는
        // 서버가 노드 삭제 시 해당 노드의 엣지를 함께 지우므로(deleteEdgesByNodeId)
        // 남지 않고, 상대 그래프는 자기 그래프의 루트로 독립한다.
        const rootNode = nodes.find((n) => n.id === rootId);
        const descendants = rootNode
          ? getSameGraphDescendantIds(rootNode, nodes, edges)
          : getDescendantIds(rootId, edges);
        descendants.forEach((id) => subtreeNodeIds.add(id));
      });

      setPendingArchiveNodeIds(Array.from(subtreeNodeIds));
      setIsArchiveModalOpen(true);
    },
    [nodes, edges],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const removedNodeIds = changes
        .filter((change) => change.type === 'remove')
        .map((change) => change.id);

      if (removedNodeIds.length > 0) {
        requestArchiveForNodes(removedNodeIds);
      }

      const nonRemoveChanges = changes.filter(
        (change) => change.type !== 'remove',
      );
      if (nonRemoveChanges.length === 0) return;

      nonRemoveChanges.forEach((change) => {
        if (change.type === 'position' && change.position) {
          console.log(
            '[pos:move] onNodesChange — React Flow 드래그 위치 적용',
            change.id,
            '→',
            change.position,
            'dragging:',
            change.dragging,
          );
        }
      });

      setNodes((snapshot) => applyNodeChanges(nonRemoveChanges, snapshot));
    },
    [requestArchiveForNodes, setNodes],
  );

  const onBeforeDelete = useCallback(
    async ({ nodes: nodesToDelete }: { nodes: Node[]; edges: Edge[] }) => {
      if (nodesToDelete.length > 0) {
        requestArchiveForNodes(nodesToDelete.map((node) => node.id));
        return false;
      }

      return true;
    },
    [requestArchiveForNodes],
  );

  const handleCancelArchive = useCallback(() => {
    setIsArchiveModalOpen(false);
    setPendingArchiveNodeIds([]);
  }, []);

  const handleConfirmArchive = useCallback(async () => {
    if (pendingArchiveNodeIds.length === 0) {
      setIsArchiveModalOpen(false);
      return;
    }

    const idsToArchive = new Set(pendingArchiveNodeIds);

    setIsArchiveDeleting(true);
    // BE 삭제 API 호출 (병렬)
    try {
      await Promise.all(
        pendingArchiveNodeIds.map((nodeId) => deleteNode(workspaceId, nodeId)),
      );
    } catch (error) {
      console.error('[handleConfirmArchive] deleteNode failed', error);
      // 실패 시 모달만 닫고 로컬 state 유지
      setPendingArchiveNodeIds([]);
      setIsArchiveModalOpen(false);
      setIsArchiveDeleting(false);
      return;
    }

    // 로컬 state 즉시 업데이트
    setEdges((snapshot) =>
      snapshot.filter(
        (edge) =>
          !idsToArchive.has(edge.source) && !idsToArchive.has(edge.target),
      ),
    );
    setNodes((snapshot) =>
      snapshot.filter((node) => !idsToArchive.has(node.id)),
    );
    setHoveredNodeId((prev) => (prev && idsToArchive.has(prev) ? null : prev));
    setMyOpenEditorNodeIds((prev) => prev.filter((id) => !idsToArchive.has(id)));
    setWorkingOnEditorNodeId((prev) =>
      prev && idsToArchive.has(prev) ? null : prev,
    );
    setPendingArchiveNodeIds([]);
    setIsArchiveModalOpen(false);
    setIsArchiveDeleting(false);
  }, [pendingArchiveNodeIds, workspaceId, setNodes, setEdges]);

  const edgesWithPresentation = useMemo(
    () => edges.map((edge) => buildEdgePresentation(edge, nodes, edges)),
    [nodes, edges],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removeChanges = changes.filter(
        (change) => change.type === 'remove',
      );
      const nonRemoveChanges = changes.filter(
        (change) => change.type !== 'remove',
      );

      if (isArchiveModalOpen) {
        if (nonRemoveChanges.length === 0) return;
        setEdges((snapshot) => applyEdgeChanges(nonRemoveChanges, snapshot));
        return;
      }

      // non-remove 변경은 즉시 적용
      if (nonRemoveChanges.length > 0) {
        setEdges((snapshot) => applyEdgeChanges(nonRemoveChanges, snapshot));
      }

      // remove 변경은 API 호출 성공 후에만 state 업데이트
      if (removeChanges.length > 0) {
        setEdges((snapshot) => {
          const removedEdges = removeChanges
            .map((change) => snapshot.find((edge) => edge.id === change.id))
            .filter((edge): edge is Edge => edge !== undefined);

          if (removedEdges.length === 0) return snapshot;

          Promise.all(
            removedEdges.map((edge) => deleteEdge(workspaceId, edge.id)),
          )
            .then(() => {
              setEdges((prev) => {
                const updatedEdges = applyEdgeChanges(removeChanges, prev);

                setNodes((currentNodes) => {
                  let updatedNodes = currentNodes;

                  removedEdges.forEach((edge) => {
                    // 서버가 이 시점에 target 서브트리 depth를 갱신하므로 로컬도 동일 규칙 적용
                    updatedNodes = applyDepthOnEdgeDelete(
                      updatedNodes,
                      updatedEdges,
                      edge.target,
                    );
                    const remainingParentId = getParentId(
                      edge.target,
                      updatedEdges,
                    );
                    const remainingParent = remainingParentId
                      ? updatedNodes.find((n) => n.id === remainingParentId)
                      : null;
                    const color = remainingParent
                      ? getGraphColor(
                          remainingParentId!,
                          updatedNodes,
                          updatedEdges,
                        )
                      : DEFAULT_NODE_COLOR;
                    // 페인트가 색을 바꾸기 전에 저장 대상 집합을 확정해 둔다
                    const recolorIds = getRecolorTargetIds(
                      edge.target,
                      updatedNodes,
                      updatedEdges,
                    );
                    updatedNodes = updateSubtreeColors(
                      edge.target,
                      updatedNodes,
                      updatedEdges,
                      color,
                    );

                    recolorIds.forEach((id) =>
                      updateNodeContent(workspaceId, id, {
                        color: color.bg,
                        textColor: color.text,
                      }).catch((err) =>
                        console.error(
                          '[updateNodeContent after edge delete] failed',
                          err,
                        ),
                      ),
                    );
                  });

                  return updatedNodes;
                });

                return updatedEdges;
              });
            })
            .catch((err) => {
              console.error('[deleteEdge] failed', err);
            });

          return snapshot; // API 응답 전까지 state 유지
        });
      }
    },
    [isArchiveModalOpen, workspaceId, setEdges, setNodes],
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      if (!connection.source || !connection.target) return false;

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return false;

      // 기존 유효성 체크
      if (
        isInvalidConnection(connection.source, connection.target, nodes, edges)
      ) {
        return false;
      }

      // 같은 그래프 내 노드끼리는 연결 불가 (main ↔ 서브 재연결 방지)
      const sourceMain = getMainNodeForSubtree(connection.source, nodes, edges);
      const targetMain = getMainNodeForSubtree(connection.target, nodes, edges);
      if (sourceMain && targetMain && sourceMain.id === targetMain.id) {
        return false;
      }

      /*
       * CONTEXT
       * - Problem      : 서로 다른 그래프를 잇는 크로스 그래프 엣지는 이동·색 전파·삭제
       *                  캐스케이드가 그래프 경계를 넘게 만들고, depth≠0 root 같은
       *                  데이터 꼬임(Aideep_backend#64)을 낳는다.
       * - Why          : 크로스 엣지의 유일한 신규 발생 경로가 핸들 드래그(onConnect)라서
       *                  여기서 색 비교로 원천 차단한다. 색 = 그래프 정체성 (findCross-
       *                  ColorChildEdges와 동일 기준). 둘 다 엣지를 가진 노드만 검사 —
       *                  단독 노드는 색이 남아 있어도 그래프 편입(swap 케이스 2) 허용.
       * - Alternatives : 서버 createEdge 검증 — 그래프 식별 기준(색? root?)을 서버가
       *                  모르므로 백엔드 논의 필요, 클라 차단 후 후순위 이슈.
       * - Trade-offs   : 두 그래프를 직접 잇는 기능(#117의 "양쪽 색 유지" 규칙)이 사라진다.
       *                  같은 색 loose 트리끼리는 같은 그래프 취급이라 여전히 병합 가능.
       * - Edge Case    : 색 미확정(legacy 무색 main)이면 차단하지 않는다 — 오판 방지,
       *                  대칭이동 절단과 같은 맹점 (Aideep_backend#52 전까지).
       */
      const sourceInGraph = edges.some(
        (e) => e.source === connection.source || e.target === connection.source,
      );
      const targetInGraph = edges.some(
        (e) => e.source === connection.target || e.target === connection.target,
      );
      if (sourceInGraph && targetInGraph) {
        const colorOf = colorOfNodeIn(nodes);
        const srcColor = colorOf(connection.source);
        const tgtColor = colorOf(connection.target);
        if (
          srcColor !== undefined &&
          tgtColor !== undefined &&
          srcColor !== tgtColor
        ) {
          return false;
        }
      }

      return true;
    },
    [nodes, edges],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);
      const sourceIsMain = sourceNode?.data?.isMain === true;
      const targetIsMain = targetNode?.data?.isMain === true;

      const sourceEdgeCount = edges.filter(
        (e) => e.source === params.source || e.target === params.source,
      ).length;
      const targetEdgeCount = edges.filter(
        (e) => e.source === params.target || e.target === params.target,
      ).length;

      /*
       * CONTEXT
       * - Problem      : 서로 다른 그래프(색 다름) 간 연결은 isValidConnection이 차단하므로
       *                  onConnect에 도달하는 연결은 단독 노드·같은 색 트리뿐이다.
       * - Why          : 남은 케이스는 전부 "target을 source 그래프에 편입"이 맞다 —
       *                  항상 재배치·재색칠한다. main(프로젝트) 노드는 항상 부모(source).
       * - Alternatives : 기존 "그래프 ↔ 그래프는 양쪽 색 유지, 연결만 생성" 분기(#117) —
       *                  크로스 엣지의 유일한 신규 발생 경로였고, 차단 결정으로 도달 불가가
       *                  되어 제거 (Aideep_backend#64 논의).
       * - Trade-offs   : 단독 노드 → 그래프 연결(케이스 2)은 그래프 쪽이 부모가 되어
       *                  색을 전파한다 (단독 노드가 그래프에 편입되는 시나리오).
       * - Edge Case    : target이 이미 부모를 가진 노드면 incoming 엣지가 2개가 된다 (허용).
       */
      const shouldSwap =
        // 케이스 1: main(프로젝트) 노드는 항상 부모
        ((sourceIsMain || targetIsMain) && !sourceIsMain) ||
        // 케이스 2: 단독 노드가 그래프에 연결되면 그래프 쪽이 부모
        (sourceEdgeCount === 0 && targetEdgeCount > 0);

      const sourceId = shouldSwap ? params.target : params.source;
      const targetId = shouldSwap ? params.source : params.target;

      const srcNode = nodes.find((n) => n.id === sourceId);
      const tgtNode = nodes.find((n) => n.id === targetId);
      const targetNodeSideRelativeToParent =
        srcNode && tgtNode
          ? getTargetSideRelativeToParent(
              tgtNode.position.x,
              srcNode.position.x,
            )
          : 'right';
      // swap 후 source쪽 핸들 (loose mode: source-*, strict: source-* 또는 target-*)
      const rawSourceHandle = shouldSwap
        ? params.targetHandle
        : params.sourceHandle;
      // 핸들 이름에서 side 추출 — loose/strict/swap 조합 무관하게 'right'/'left' 포함 여부로 판별
      const sideFromHandle: 'left' | 'right' | null = rawSourceHandle?.includes(
        'right',
      )
        ? 'right'
        : rawSourceHandle?.includes('left')
          ? 'left'
          : null;
      const computedSide: 'left' | 'right' =
        sideFromHandle ?? targetNodeSideRelativeToParent;
      // 항상 올바른 source-*/target-* 형태로 정규화 (loose mode의 source-to-source 대응)
      const resolvedSourceHandle = `source-${computedSide}`;
      const resolvedTargetHandle = resolveHandleId('target', computedSide);

      // 한 번만 계산해 로컬 반영·API 전파에 재사용 — 색 없는 main의 랜덤 색이 두 번 뽑히는 것 방지
      const colorToPropagate = getGraphColor(sourceId, nodes, edges);
      backfillMainColor(sourceId, colorToPropagate);

      // target이 트리째 병합될 때 서브트리 방향 정규화 대상 (subtreeInternalEdgeFilter CONTEXT 참고)
      const mergedSubtreeIds = tgtNode
        ? getSameGraphDescendantIds(tgtNode, nodes, edges)
        : new Set<string>();

      // 연결된 target 노드 위치(및 subtree)와 색상을 source 기준으로 업데이트
      setNodes((currentNodes) => {
        const sourceNode = currentNodes.find((node) => node.id === sourceId);
        const targetNode = currentNodes.find((node) => node.id === targetId);

        let positionedNodes = currentNodes;
        if (sourceNode && targetNode) {
          const adjustedPosition = adjustPositionRelativeToSource(
            sourceNode,
            targetNode.position.y,
            computedSide,
            currentNodes,
            edges,
            targetNode.id,
            targetNode,
          );

          const deltaX = adjustedPosition.x - targetNode.position.x;
          const deltaY = adjustedPosition.y - targetNode.position.y;
          if (deltaX !== 0 || deltaY !== 0) {
            console.log(
              '[pos:move] onConnect — target 위치를 source 기준으로 조정',
              targetNode.id,
              targetNode.position,
              '→',
              adjustedPosition,
              `(서브트리 delta: ${deltaX}, ${deltaY})`,
            );
            const childrenIds = getDescendantIds(targetNode.id, edges);
            const affectedNodeIds = new Set([targetNode.id, ...childrenIds]);
            positionedNodes = currentNodes.map((node) =>
              affectedNodeIds.has(node.id)
                ? {
                    ...node,
                    position: {
                      x: node.position.x + deltaX,
                      y: node.position.y + deltaY,
                    },
                  }
                : node,
            );
          }

          // 연결 방향이 확정된 시점에 handleSide를 node.data에 저장 — 서브트리 자손 포함
          console.log(
            '[handle:move] onConnect — handleSide 변경',
            targetId,
            '서브트리:',
            Array.from(mergedSubtreeIds),
            '→',
            computedSide,
          );
          positionedNodes = positionedNodes.map((node) =>
            node.id === targetId || mergedSubtreeIds.has(node.id)
              ? { ...node, data: { ...node.data, handleSide: computedSide } }
              : node,
          );

          // 반대 방향으로 뻗어 있던 서브트리는 대칭이동 (재부모화 경로와 동일 규칙)
          if (mergedSubtreeIds.size > 0) {
            const movedTarget = positionedNodes.find((n) => n.id === targetId);
            const subtreeNodes = positionedNodes.filter((n) =>
              mergedSubtreeIds.has(n.id),
            );
            if (movedTarget && subtreeNodes.length > 0) {
              const targetCenterX =
                movedTarget.position.x + (movedTarget.width ?? NODE_WIDTH) / 2;
              const avgChildCenterX =
                subtreeNodes.reduce(
                  (sum, n) => sum + n.position.x + (n.width ?? NODE_WIDTH) / 2,
                  0,
                ) / subtreeNodes.length;
              const needsMirror =
                computedSide === 'right'
                  ? avgChildCenterX < targetCenterX
                  : avgChildCenterX > targetCenterX;
              if (needsMirror) {
                console.log(
                  '[pos:move] onConnect — 병합 서브트리 대칭이동 실행',
                  targetId,
                  '기준축 x:',
                  targetCenterX,
                );
                positionedNodes = mirrorSubtree(
                  positionedNodes,
                  mergedSubtreeIds,
                  targetCenterX,
                );
              }
            }
          }
        }

        return updateSubtreeColors(
          targetId,
          positionedNodes,
          edges,
          colorToPropagate,
        );
      });

      // 서브트리 내부 엣지 핸들도 새 방향으로 — 로컬 상태와 서버 저장분 동시 갱신
      if (mergedSubtreeIds.size > 0) {
        const isMergedInternal = subtreeInternalEdgeFilter(
          targetId,
          mergedSubtreeIds,
        );
        const mergedSourceHandle = resolveHandleId('source', computedSide);
        const mergedTargetHandle = resolveHandleId('target', computedSide);
        console.log(
          '[handle:move] onConnect — 서브트리 내부 엣지 핸들 변경',
          edges.filter(isMergedInternal).map((e) => e.id),
          '→',
          { sourceHandle: mergedSourceHandle, targetHandle: mergedTargetHandle },
        );
        setEdges((prev) =>
          prev.map((e) =>
            isMergedInternal(e)
              ? {
                  ...e,
                  sourceHandle: mergedSourceHandle,
                  targetHandle: mergedTargetHandle,
                }
              : e,
          ),
        );
        persistSubtreeEdgeHandles(
          workspaceId,
          edges,
          isMergedInternal,
          computedSide,
        );
      }

      console.log(
        '[handle:save] onConnect — 새 엣지 생성 요청(핸들 포함 서버 저장)',
        { source: sourceId, target: targetId },
        {
          sourceHandle: resolvedSourceHandle,
          targetHandle: resolvedTargetHandle,
        },
      );
      createEdge(
        workspaceId,
        sourceId,
        targetId,
        resolvedSourceHandle,
        resolvedTargetHandle,
      )
        .then(({ edgeId }) => {
          setEdges((prev) => [
            ...prev,
            {
              id: edgeId,
              source: sourceId,
              target: targetId,
              type: 'branch',
              sourceHandle: resolvedSourceHandle,
              targetHandle: resolvedTargetHandle,
            },
          ]);
          // 서버가 이 시점에 target 서브트리 depth를 갱신하므로 로컬도 동일 규칙 적용
          setNodes((prev) => applyDepthOnEdgeCreate(prev, edges, sourceId, targetId));
          getRecolorTargetIds(targetId, nodes, edges).forEach((id) =>
            updateNodeContent(workspaceId, id, {
              color: colorToPropagate.bg,
              textColor: colorToPropagate.text,
            }).catch((err) => console.error('[updateNodeColor] failed', err)),
          );
        })
        .catch((err) => console.error('[createEdge] failed', err));
    },
    [nodes, edges, workspaceId, setNodes, setEdges, backfillMainColor],
  );

  /* =========================
     핸들 드래그로 빈 공간에 새 노드 생성
     ========================= */
  const onConnectStart = useCallback(() => {
    isConnectingRef.current = true;
  }, []);

  const onConnectEnd = useCallback(
    async (event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
      // 핸들에서 직접 뽑은 엣지가 다른 노드에 연결되지 않았을 때 (엣지를 빈 공간에 드롭) 새 노드 생성하며 연결 생성
      if (!connectionState.isValid) {
        const fromNode = connectionState.fromNode;
        if (!fromNode) return;
        // 마우스 위치 가져오기
        const { clientX, clientY } =
          'changedTouches' in event ? event.changedTouches[0] : event;

        // flow 좌표로 변환
        const originalPosition = screenToFlowPosition({
          x: clientX,
          y: clientY,
        });

        // source 노드 찾기
        const sourceNode = nodes.find(
          (n) => n.id === fromNode.id,
        );
        if (!sourceNode) return;

        // 어느 핸들에서 연결이 시작되었는지 확인
        const fromHandle = connectionState.fromHandle?.id || '';
        let side: 'left' | 'right';

        const forcedSourceSide = getForcedOutboundSideForSubNodeInMainGraph(
          sourceNode,
          nodes,
          edges,
        );

        if (forcedSourceSide) {
          side = forcedSourceSide;
        } else if (fromHandle.includes('left')) {
          side = 'left';
        } else if (fromHandle.includes('right')) {
          side = 'right';
        } else {
          const parentId = getParentId(sourceNode.id, edges);
          const parentNode = parentId
            ? nodes.find((n) => n.id === parentId)
            : undefined;
          const mainNode = getMainNodeForSubtree(sourceNode.id, nodes, edges);
          const referenceX =
            parentNode?.position.x ?? mainNode?.position.x ?? 0;
          side = getTargetSideRelativeToParent(
            sourceNode.position.x,
            referenceX,
          );
        }

        // source 노드 기준으로 적절한 거리에 위치 조정
        const adjustedPosition = adjustPositionRelativeToSource(
          sourceNode,
          originalPosition.y,
          side,
          nodes,
          edges,
        );

        // source 노드의 색상 가져오기
        const colorPair = getGraphColor(fromNode.id, nodes, edges);
        backfillMainColor(fromNode.id, colorPair);

        try {
          const { nodeId } = await createMdNode(
            workspaceId,
            '',
            adjustedPosition,
            {
              markdownBody: '',
              jsonBody: EMPTY_LEXICAL_JSON,
              color: colorPair.bg,
              textColor: colorPair.text,
            },
          );

          // WS NODE_CREATE 필터링(useWorkspaceWS)으로 race condition이 제거됨.
          // 본인 생성 노드의 WS 이벤트는 무시되므로 REST 응답이 항상 최초 삽입.
          setNodes((prev) => [
            ...prev,
            {
              id: nodeId,
              type: 'textUpdater',
              position: adjustedPosition,
              data: {
                title: '',
                isMain: false,
                depth: 0, // 서버 생성 초기값과 동일 — 엣지 생성 성공 시 전파로 갱신
                color: colorPair.bg,
                textColor: colorPair.text,
                handleSide: side,
              },
            },
          ]);

          const fromHandleId = fromHandle || `source-${side}`;
          const targetHandleId = `target-${side === 'left' ? 'right' : 'left'}`;
          createEdge(
            workspaceId,
            fromNode.id,
            nodeId,
            fromHandleId,
            targetHandleId,
          )
            .then(({ edgeId }) => {
              setEdges((prev) => [
                ...prev,
                {
                  id: edgeId,
                  source: fromNode.id,
                  target: nodeId,
                  type: 'branch',
                  sourceHandle: fromHandleId,
                  targetHandle: targetHandleId,
                },
              ]);
              // 방금 만든 노드는 자손이 없으므로 엣지 목록 없이 depth만 전파
              setNodes((prev) =>
                applyDepthOnEdgeCreate(prev, [], fromNode.id, nodeId),
              );
            })
            .catch((err) =>
              console.error('[onConnectEnd] createEdge failed', err),
            );
        } catch (err) {
          console.error('[onConnectEnd] node creation failed', err);
        }
      }

      // onPaneClick이 실행되지 않도록 약간의 딜레이 후 플래그 해제
      setTimeout(() => {
        isConnectingRef.current = false;
      }, 0);
    },
    [
      screenToFlowPosition,
      nodes,
      edges,
      workspaceId,
      setNodes,
      setEdges,
      backfillMainColor,
    ],
  );

  /* =========================
     Node right-click → open context menu
     ========================= */
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenuNodeId(node.id);
    },
    [],
  );

  /* =========================
     Node click → toggle input box
     ========================= */
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setMyOpenEditorNodeIds((prev) => {
      if (prev.includes(node.id)) {
        // 이미 열려 있으면 포커스만 이동
        return prev;
      }
      return [...prev, node.id];
    });
    setWorkingOnEditorNodeId(node.id);
  }, []);

  /* =========================
     Empty pane click → create node
     ========================= */
  const onPaneClick = useCallback(
    async (event: React.MouseEvent) => {
      // 연결 드래그 중이면 노드 생성하지 않음
      if (isConnectingRef.current) return;

      // 컨텍스트 메뉴가 열려 있으면 닫기
      if (contextMenuNodeId) {
        setContextMenuNodeId(null);
        return;
      }

      // (선택) 우클릭은 제외
      if (event.button !== 0) return;

      // 다중 선택 해제 중이면 노드 생성 스킵 (ReactFlow가 자동으로 선택 해제)
      const hasSelection = nodesRef.current.some((n) => n.selected);
      if (hasSelection) return;

      // wrapper 기준 좌표로 변환 (screenToFlowPosition은 clientX/Y 기반으로 처리)
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      try {
        const colorPair = getRandomColorPair();
        const body = {
          markdownBody: '',
          jsonBody: EMPTY_LEXICAL_JSON,
          color: colorPair.bg,
          textColor: colorPair.text,
        } as MdBody;

        const { nodeId } = await createMdNode(workspaceId, '', position, body);

        // WS NODE_CREATE 필터링(useWorkspaceWS)으로 race condition이 제거됨.
        // 본인 생성 노드의 WS 이벤트는 무시되므로 REST 응답이 항상 최초 삽입.
        setNodes((prev) => [
          ...prev,
          {
            id: nodeId,
            type: 'textUpdater',
            position,
            data: {
              title: '',
              isMain: false,
              depth: 0, // 서버 생성 초기값과 동일
              color: colorPair.bg,
              textColor: colorPair.text,
            },
          },
        ]);
      } catch (err) {
        console.error('[onPaneClick] createMdNode failed', err);
      }
    },
    [screenToFlowPosition, workspaceId, contextMenuNodeId, setNodes],
  );

  const onDragOver = useCallback(
    (event: DragEvent) => {
      const types = Array.from(event.dataTransfer.types);
      if (!types.includes('application/resource-subitem')) return;

      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const draggedPreview: Node = {
        id: '__drag_preview__',
        type: 'textUpdater',
        position,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        data: {},
      };

      const closestNode = findClosestNodeInRange(draggedPreview, nodes, edges);
      const isInvalid =
        closestNode &&
        isInvalidConnection(closestNode.id, draggedPreview.id, nodes, edges);
      setHoveredNodeId(isInvalid ? null : (closestNode?.id ?? null));
    },
    [screenToFlowPosition, nodes, edges, setNodes],
  );

  const onDrop = useCallback(
    async (event: DragEvent) => {
      const raw = event.dataTransfer.getData('application/resource-subitem');
      if (!raw) return;
      event.preventDefault();

      let payload: {
        id: string;
        name: string;
        markdownBody?: string;
        jsonBody?: string;
      } | null = null;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      if (!payload?.name) return;

      const basePosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const targetParent =
        hoveredNodeId && nodes.find((node) => node.id === hoveredNodeId);
      const shouldConnect =
        targetParent &&
        !isInvalidConnection(targetParent.id, '__new__', nodes, edges);

      // hoveredNode(sourceNode)가 handleSide를 가지면 상속, 없으면(root) 위치 기반
      const dropSide: 'left' | 'right' | undefined = (() => {
        if (!shouldConnect || !targetParent) return undefined;
        const storedSide = targetParent.data?.handleSide as
          | 'left'
          | 'right'
          | undefined;
        return (
          storedSide ??
          getTargetSideRelativeToParent(basePosition.x, targetParent.position.x)
        );
      })();

      const position =
        shouldConnect && targetParent && dropSide
          ? adjustPositionRelativeToSource(
              targetParent,
              basePosition.y,
              dropSide,
              nodes,
              edges,
            )
          : findNonOverlappingPosition(basePosition, nodes);

      const colorPair = shouldConnect
        ? getGraphColor(targetParent.id, nodes, edges)
        : DEFAULT_NODE_COLOR;
      if (shouldConnect) {
        backfillMainColor(targetParent.id, colorPair);
      }

      try {
        const { nodeId } = await createMdNode(
          workspaceId,
          payload.name,
          position,
          {
            markdownBody: payload.markdownBody ?? '',
            jsonBody: payload.jsonBody ?? EMPTY_LEXICAL_JSON,
            color: colorPair.bg,
            textColor: colorPair.text,
          },
        );

        // WS NODE_CREATE 필터링(useWorkspaceWS)으로 race condition이 제거됨.
        // 본인 생성 노드의 WS 이벤트는 무시되므로 REST 응답이 항상 최초 삽입.
        setNodes((prev) => [
          ...prev,
          {
            id: nodeId,
            type: 'textUpdater',
            position,
            data: {
              title: payload.name,
              isMain: false,
              depth: 0, // 서버 생성 초기값과 동일 — 연결 시 전파로 갱신
              color: colorPair.bg,
              textColor: colorPair.text,
              ...(dropSide && { handleSide: dropSide }),
            },
          },
        ]);

        if (shouldConnect && targetParent && dropSide) {
          const sourceHandle = `source-${dropSide}`;
          const targetHandle = `target-${dropSide === 'left' ? 'right' : 'left'}`;
          createEdge(
            workspaceId,
            targetParent.id,
            nodeId,
            sourceHandle,
            targetHandle,
          )
            .then(({ edgeId }) => {
              setEdges((prev) => [
                ...prev,
                {
                  id: edgeId,
                  source: targetParent.id,
                  target: nodeId,
                  type: 'branch',
                  sourceHandle,
                  targetHandle,
                },
              ]);
              // 방금 만든 노드는 자손이 없으므로 엣지 목록 없이 depth만 전파
              setNodes((prev) =>
                applyDepthOnEdgeCreate(prev, [], targetParent.id, nodeId),
              );
            })
            .catch((err) => console.error('[onDrop] createEdge failed', err));
        }
      } catch (err) {
        console.error('[onDrop] createMdNode failed', err);
        setHoveredNodeId(null);
        return;
      }

      setHoveredNodeId(null);
    },
    [
      screenToFlowPosition,
      nodes,
      edges,
      hoveredNodeId,
      workspaceId,
      setNodes,
      setEdges,
      backfillMainColor,
    ],
  );

  const onDragLeave = useCallback((event: DragEvent) => {
    const types = Array.from(event.dataTransfer.types);
    if (!types.includes('application/resource-subitem')) return;
    setHoveredNodeId(null);
  }, []);

  const onNodeDragStart = useCallback(
    (event: React.MouseEvent, draggedNode: Node) => {
      // hover 상태 초기화
      setHoveredNodeId(null);

      // D3 force simulation 시작
      isDraggingRef.current = true;

      // 드래그 노드와 같은 그래프(같은 색)의 자식들만 함께 고정 — 크로스 그래프 노드는 제외
      const childrenIds = getSameGraphDescendantIds(draggedNode, nodes, edges);
      const fixedNodeIds = new Set([draggedNode.id, ...childrenIds]);

      // 다중 선택 드래그: 선택된 모든 노드와 그 서브트리도 고정
      const selectedNodes = nodesRef.current.filter((n) => n.selected);
      isMultiDragRef.current = selectedNodes.length > 1;
      if (isMultiDragRef.current) {
        selectedNodes.forEach((sel) => {
          fixedNodeIds.add(sel.id);
          getDescendantIds(sel.id, edges).forEach((id) => fixedNodeIds.add(id));
        });
      }

      // React Flow nodes에서 d3 노드 데이터 추출
      const d3Nodes: D3Node[] = nodes.map((n) => ({
        id: n.id,
        x: n.position.x + (n.width ?? NODE_WIDTH) / 2, // 중심점으로 변환
        y: n.position.y + (n.height ?? NODE_HEIGHT) / 2,
        width: n.width ?? NODE_WIDTH,
        height: n.height ?? NODE_HEIGHT,
        // 드래그 노드와 그 자식들은 모두 고정
        fx: fixedNodeIds.has(n.id)
          ? n.position.x + (n.width ?? NODE_WIDTH) / 2
          : null,
        fy: fixedNodeIds.has(n.id)
          ? n.position.y + (n.height ?? NODE_HEIGHT) / 2
          : null,
      }));

      d3NodesRef.current = d3Nodes;

      // 시뮬레이션에 노드 데이터 주입 및 reheat
      const simulation = simulationRef.current;
      if (simulation) {
        simulation.nodes(d3Nodes);
        simulation.alpha(1).alphaTarget(0.3).restart();
      }

      // 드래그 시작 시 현재 위치 저장 (delta 계산용)
      previousDragPositionRef.current = {
        x: draggedNode.position.x,
        y: draggedNode.position.y,
      };

      // 전체 노드 위치 스냅샷 — 드래그 종료 시 서버 delta 전파 시뮬레이션 기준
      dragStartPositionsRef.current = new Map(
        nodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }]),
      );

      // 엣지 핸들 스냅샷 — 드래그 중 반전으로 바뀐 핸들의 서버 저장 diff 기준
      dragStartEdgeHandlesRef.current = new Map(
        edges.map((e) => [
          e.id,
          { source: e.sourceHandle, target: e.targetHandle },
        ]),
      );
    },
    [nodes, edges],
  );

  const onNodeDrag = useCallback(
    (event: React.MouseEvent, draggedNode: Node) => {
      // 드래그 중에 가까운 노드 찾기
      const closestNode = findClosestNodeInRange(draggedNode, nodes, edges);
      // 이미 연결된 노드는 hover 효과 제외
      const isInvalid =
        closestNode &&
        isInvalidConnection(closestNode.id, draggedNode.id, nodes, edges);
      setHoveredNodeId(isInvalid ? null : (closestNode?.id ?? null));

      // 좌우 전환 시 서브트리 대칭 이동 + 노드/엣지 핸들 및 hub 정보 업데이트
      // dragged node 자체는 사용자가 드래그하는 위치를 따라가므로 위치 변경 없음
      let didMirrorSubtree = false;
      const previousPosition = previousDragPositionRef.current;
      if (previousPosition && !draggedNode.data?.isMain && !isMultiDragRef.current) {
        const mainNode = getMainNodeForSubtree(draggedNode.id, nodes, edges);
        const isDirectChildOfMain =
          mainNode && getParentId(draggedNode.id, edges) === mainNode.id;
        if (mainNode && isDirectChildOfMain) {
          const mainAxisX = mainNode.position.x + NODE_WIDTH / 2;
          const nodeWidth = draggedNode.width ?? NODE_WIDTH;
          const nodeHeight = draggedNode.height ?? NODE_HEIGHT;
          const beforeCenterX = previousPosition.x + nodeWidth / 2;
          const afterCenterX = draggedNode.position.x + nodeWidth / 2;
          const afterCenterY = draggedNode.position.y + nodeHeight / 2;
          const beforeSide = beforeCenterX < mainAxisX ? 'left' : 'right';
          const afterSide = afterCenterX < mainAxisX ? 'left' : 'right';

          if (beforeSide !== afterSide) {
            const newSide: 'left' | 'right' = afterSide;
            const subtreeIds = getSameGraphDescendantIds(
              draggedNode,
              nodes,
              edges,
            );
            const beforeDraggedCenterY = previousPosition.y + nodeHeight / 2;

            // 1. 서브트리 노드들: dragged node 기준 거리 유지 + 방향 반전
            const newSubtreeCenters = new Map<
              string,
              { x: number; y: number }
            >();

            d3NodesRef.current.forEach((d3Node) => {
              if (!subtreeIds.has(d3Node.id)) return;
              const distanceX = (d3Node.x ?? 0) - beforeCenterX; // 이전 프레임 subtree 노드 - dragged 사이 거리
              const distanceY = (d3Node.y ?? 0) - beforeDraggedCenterY;
              const newCenterX = afterCenterX - distanceX;
              const newCenterY = afterCenterY + distanceY;
              d3Node.x = newCenterX;
              d3Node.y = newCenterY;
              if (d3Node.fx != null) d3Node.fx = newCenterX;
              if (d3Node.fy != null) d3Node.fy = newCenterY;
              newSubtreeCenters.set(d3Node.id, {
                x: newCenterX,
                y: newCenterY,
              });
            });

            console.log(
              '[pos:move] onNodeDrag — 좌우 전환 서브트리 대칭이동',
              draggedNode.id,
              `${beforeSide} → ${afterSide}`,
              '서브트리 새 중심점:',
              Object.fromEntries(newSubtreeCenters),
            );

            // 2. handleSide 업데이트: dragged node + 서브트리 모두 newSide로
            console.log(
              '[handle:move] onNodeDrag — 좌우 전환 handleSide 변경',
              draggedNode.id,
              '서브트리:',
              Array.from(subtreeIds),
              '→',
              newSide,
            );
            setNodes((currentNodes) =>
              currentNodes.map((node) => {
                if (node.id === draggedNode.id || subtreeIds.has(node.id)) {
                  return {
                    ...node,
                    data: { ...node.data, handleSide: newSide },
                  };
                }
                return node;
              }),
            );

            // 3. 엣지 업데이트
            const newSourceHandle = resolveHandleId('source', newSide);
            const newTargetHandle = resolveHandleId('target', newSide);

            console.log(
              '[handle:move] onNodeDrag — 좌우 전환 엣지 핸들 변경(로컬만, 서버 미저장)',
              '대상: main→dragged 엣지 + 서브트리 내부 엣지',
              '→',
              { sourceHandle: newSourceHandle, targetHandle: newTargetHandle },
            );
            setEdges((currentEdges) =>
              currentEdges.map((edge) => {
                // mainNode와 draggedNode 사이 엣지 정보 업데이트: source 노드는 mainNode (위치 불변), 사용하는 source handle side만 바뀜
                if (
                  edge.source === mainNode.id &&
                  edge.target === draggedNode.id
                ) {
                  const srcWidth = mainNode.width ?? NODE_WIDTH;
                  // position.x 기준: right → position.x + width, left → position.x
                  const srcHandleX =
                    mainNode.position.x + (newSide === 'right' ? srcWidth : 0);
                  return {
                    ...edge,
                    sourceHandle: newSourceHandle,
                    targetHandle: newTargetHandle,
                    data: {
                      ...edge.data,
                      hubX:
                        srcHandleX +
                        (newSide === 'right' ? HUB_OFFSET : -HUB_OFFSET),
                      hubY: mainNode.position.y + NODE_HEIGHT / 2,
                    },
                  };
                }

                // 서브트리 엣지: sourceHandle/targetHandle은 newSide 재사용,
                // hubX/Y는 이동한 source의 새 center 기반으로 재계산
                const isSourceDragged = edge.source === draggedNode.id;
                const isSourceInSubtree = subtreeIds.has(edge.source);
                if (isSourceDragged || isSourceInSubtree) {
                  const srcCenter = isSourceDragged
                    ? { x: afterCenterX, y: afterCenterY }
                    : newSubtreeCenters.get(edge.source);
                  if (!srcCenter) return edge;

                  const srcNode = nodes.find((n) => n.id === edge.source);
                  const srcWidth = srcNode?.width ?? NODE_WIDTH;
                  // d3 center → position.x: centerX - width/2
                  // right handle: position.x + width = centerX + width/2
                  // left handle: position.x = centerX - width/2
                  const srcHandleX =
                    srcCenter.x +
                    (newSide === 'right' ? srcWidth / 2 : -srcWidth / 2);
                  return {
                    ...edge,
                    sourceHandle: newSourceHandle,
                    targetHandle: newTargetHandle,
                    data: {
                      ...edge.data,
                      hubX:
                        srcHandleX +
                        (newSide === 'right' ? HUB_OFFSET : -HUB_OFFSET),
                      hubY: srcCenter.y,
                    },
                  };
                }

                return edge;
              }),
            );

            // 색이 다른(다른 그래프) 직계 자식은 대칭이동을 따라오지 않아 연결
            // 방향 규칙이 꼬인다 → 해당 크로스 그래프 엣지는 대칭이동과 함께 끊는다
            const crossEdges = findCrossColorChildEdges(
              [draggedNode.id, ...subtreeIds],
              nodes,
              edges,
            );
            if (crossEdges.length > 0) {
              console.log(
                '[edge:cut] onNodeDrag — 대칭이동에 따른 크로스 그래프 엣지 절단(서버 삭제 포함)',
                crossEdges.map((e) => e.id),
              );
              const crossEdgeIds = new Set(crossEdges.map((e) => e.id));
              const remainingEdges = edges.filter(
                (e) => !crossEdgeIds.has(e.id),
              );
              setEdges((prev) => prev.filter((e) => !crossEdgeIds.has(e.id)));
              // 서버가 각 엣지 삭제 시 target 서브트리 depth를 갱신하므로 로컬도 동일 규칙 적용
              setNodes((prev) =>
                crossEdges.reduce(
                  (acc, e) => applyDepthOnEdgeDelete(acc, remainingEdges, e.target),
                  prev,
                ),
              );
              crossEdges.forEach((e) =>
                deleteEdge(workspaceId, e.id).catch((err) =>
                  console.error(`[deleteEdge mirror ${e.id}] failed`, err),
                ),
              );
            }

            didMirrorSubtree = true;
          }
        }
      }

      // 부모가 움직인 거리(delta) 계산
      const delta = previousDragPositionRef.current
        ? {
            x: draggedNode.position.x - previousDragPositionRef.current.x,
            y: draggedNode.position.y - previousDragPositionRef.current.y,
          }
        : { x: 0, y: 0 };

      // 현재 위치를 다음 계산을 위해 저장
      previousDragPositionRef.current = {
        x: draggedNode.position.x,
        y: draggedNode.position.y,
      };

      // D3 시뮬레이션에서 드래그 중인 노드의 고정 위치 업데이트
      const d3Node = d3NodesRef.current.find((n) => n.id === draggedNode.id);
      if (d3Node) {
        d3Node.fx =
          draggedNode.position.x + (draggedNode.width ?? NODE_WIDTH) / 2;
        d3Node.fy =
          draggedNode.position.y + (draggedNode.height ?? NODE_HEIGHT) / 2;
      }

      // 자식 노드들도 delta만큼 이동 (대칭 이동한 프레임은 제외, Alt 키 누르면 단독 이동)
      if (!didMirrorSubtree && !event.altKey) {
        const childrenIds = getSameGraphDescendantIds(draggedNode, nodes, edges);

        childrenIds.forEach((childId) => {
          const d3ChildNode = d3NodesRef.current.find((n) => n.id === childId);
          if (d3ChildNode && d3ChildNode.fx != null && d3ChildNode.fy != null) {
            // 기존 fx/fy에 delta를 더해서 부모와 함께 이동
            d3ChildNode.fx += delta.x;
            d3ChildNode.fy += delta.y;
          }
        });

        // 다중 선택 드래그: 다른 선택 노드들과 그 서브트리도 delta만큼 이동
        if (isMultiDragRef.current) {
          const alreadyMoved = new Set<string>([
            draggedNode.id,
            ...childrenIds,
          ]);
          const otherSelected = nodesRef.current.filter(
            (n) => n.selected && n.id !== draggedNode.id,
          );
          otherSelected.forEach((selNode) => {
            [selNode.id, ...getDescendantIds(selNode.id, edges)].forEach(
              (id) => {
                if (alreadyMoved.has(id)) return;
                alreadyMoved.add(id);
                const d3n = d3NodesRef.current.find((n) => n.id === id);
                if (d3n && d3n.fx != null && d3n.fy != null) {
                  d3n.fx += delta.x;
                  d3n.fy += delta.y;
                }
              },
            );
          });
        }
      }

      // WS: 실시간 위치 브로드캐스트 (50ms throttle)
      const now = Date.now();
      if (now - lastLiveEmitRef.current >= LIVE_EMIT_INTERVAL) {
        lastLiveEmitRef.current = now;
        console.log(
          '[pos:send] emitLivePosition — WS 실시간 위치 송신(저장 아님)',
          draggedNode.id,
          { x: draggedNode.position.x, y: draggedNode.position.y },
        );
        emitLivePosition(
          workspaceId,
          draggedNode.id,
          draggedNode.position.x,
          draggedNode.position.y,
        );
      }
    },
    [nodes, edges, workspaceId, setNodes, setEdges],
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, draggedNode: Node) => {
      // hover-snap 발생 시 adjustedPosition을 추적하여 moveNode에 전달
      let finalPosition = draggedNode.position;
      // 재부모화가 실행되면 그 경로의 persistSubtreeEdgeHandles가 핸들을
      // 저장하므로, 아래 드래그 반전 diff 스윕은 건너뛴다 (동일 엣지 이중 PATCH 방지)
      let didReparent = false;

      // hover된 노드가 있으면 연결 생성 (다중 선택 드래그 중에는 hover-snap 비활성화)
      if (hoveredNodeId && !isMultiDragRef.current) {
        const newParent = nodes.find((n) => n.id === hoveredNodeId);
        const draggedIsMain = draggedNode.data?.isMain === true;
        if (
          newParent &&
          !isInvalidConnection(
            draggedIsMain ? draggedNode.id : newParent.id,
            draggedIsMain ? newParent.id : draggedNode.id,
            nodes,
            edges,
          )
        ) {
          didReparent = true;

          // source/target 역할 결정: main 노드가 드래그된 경우 항상 source
          const parentNode = draggedIsMain ? draggedNode : newParent;
          const childNode = draggedIsMain ? newParent : draggedNode;

          // 1. 기존 부모와의 연결 끊기 (childNode 기준)
          const existingParentEdge = edges.find(
            (edge) => edge.target === childNode.id,
          );

          // 2. 연결 방향 결정
          // 부모 노드가 root인 경우: 자식 노드의 위치 기준 (부모 좌우 어디에 있나)
          // 부모 노드가 depth>0 인 경우: 자식 노드는 부모 노드의 handleSide 계승 (같은 방향으로 뻗어나감)
          const parentHasParent = !isRootNode(parentNode);
          const sideRelativeToParent: 'left' | 'right' = parentHasParent
            ? ((parentNode.data?.handleSide as 'left' | 'right' | undefined) ??
              getTargetSideRelativeToParent(
                childNode.position.x,
                parentNode.position.x,
              ))
            : getTargetSideRelativeToParent(
                childNode.position.x,
                parentNode.position.x,
              );

          // 3. childNode 위치를 parentNode 기준으로 조정
          const adjustedPosition = adjustPositionRelativeToSource(
            parentNode,
            childNode.position.y,
            sideRelativeToParent,
            nodes,
            edges,
            childNode.id,
            childNode,
          );

          // draggedNode가 child인 경우에만 finalPosition 갱신
          if (!draggedIsMain) {
            finalPosition = adjustedPosition;
          }

          // 4. childNode와 서브트리의 위치를 조정된 위치로 이동
          const deltaX = adjustedPosition.x - childNode.position.x;
          const deltaY = adjustedPosition.y - childNode.position.y;

          console.log(
            '[pos:move] onNodeDragStop — hover-snap 위치 조정',
            childNode.id,
            childNode.position,
            '→',
            adjustedPosition,
            `(서브트리 delta: ${deltaX}, ${deltaY})`,
          );

          setNodes((currentNodes) => {
            const childrenIds = getSameGraphDescendantIds(
              childNode,
              currentNodes,
              edges,
            );
            const affectedNodeIds = new Set([childNode.id, ...childrenIds]);

            return currentNodes.map((node) => {
              if (node.id === childNode.id) {
                return {
                  ...node,
                  position: {
                    x: node.position.x + deltaX,
                    y: node.position.y + deltaY,
                  },
                  data: { ...node.data, handleSide: sideRelativeToParent },
                };
              }
              if (affectedNodeIds.has(node.id)) {
                return {
                  ...node,
                  position: {
                    x: node.position.x + deltaX,
                    y: node.position.y + deltaY,
                  },
                };
              }
              return node;
            });
          });

          // 5. 서브트리 대칭 이동이 필요한지 확인 후 실행 (같은 그래프 노드만)
          const childrenIds = getSameGraphDescendantIds(childNode, nodes, edges);
          if (childrenIds.size > 0) {
            const adjustedCenterX =
              adjustedPosition.x + (childNode.width ?? NODE_WIDTH) / 2;

            const childNodes = nodes.filter((n) => childrenIds.has(n.id));
            const avgChildCenterX =
              childNodes.reduce(
                (sum, n) =>
                  sum + n.position.x + deltaX + (n.width ?? NODE_WIDTH) / 2,
                0,
              ) / childNodes.length;

            const needsMirror =
              sideRelativeToParent === 'right'
                ? avgChildCenterX < adjustedCenterX
                : avgChildCenterX > adjustedCenterX;

            if (needsMirror) {
              console.log(
                '[pos:move] onNodeDragStop — mirrorSubtree 서브트리 대칭이동',
                childNode.id,
                '기준축 x:',
                adjustedCenterX,
                '대상:',
                Array.from(childrenIds),
              );
              setNodes((currentNodes) =>
                mirrorSubtree(currentNodes, childrenIds, adjustedCenterX),
              );
              // 색이 다른 직계 자식과의 엣지는 대칭이동과 함께 끊는다 (연결 규칙 꼬임 방지)
              const crossEdges = findCrossColorChildEdges(
                [childNode.id, ...childrenIds],
                nodes,
                edges,
              );
              if (crossEdges.length > 0) {
                console.log(
                  '[edge:cut] onNodeDragStop — 대칭이동에 따른 크로스 그래프 엣지 절단(서버 삭제 포함)',
                  crossEdges.map((e) => e.id),
                );
                const crossEdgeIds = new Set(crossEdges.map((e) => e.id));
                const remainingEdges = edges.filter(
                  (e) => !crossEdgeIds.has(e.id),
                );
                setEdges((prev) => prev.filter((e) => !crossEdgeIds.has(e.id)));
                // 서버가 각 엣지 삭제 시 target 서브트리 depth를 갱신하므로 로컬도 동일 규칙 적용
                setNodes((prev) =>
                  crossEdges.reduce(
                    (acc, e) =>
                      applyDepthOnEdgeDelete(acc, remainingEdges, e.target),
                    prev,
                  ),
                );
                crossEdges.forEach((e) =>
                  deleteEdge(workspaceId, e.id).catch((err) =>
                    console.error(`[deleteEdge mirror ${e.id}] failed`, err),
                  ),
                );
              }
            }

            // 서브트리 handleSide·내부 엣지 핸들을 새 방향으로 정규화
            // (누락 시 에러 #008 — subtreeInternalEdgeFilter CONTEXT 참고)
            console.log(
              '[handle:move] onNodeDragStop — 재부모화 서브트리 handleSide 변경',
              childNode.id,
              '서브트리:',
              Array.from(childrenIds),
              '→',
              sideRelativeToParent,
            );
            setNodes((prev) =>
              prev.map((n) =>
                childrenIds.has(n.id)
                  ? {
                      ...n,
                      data: { ...n.data, handleSide: sideRelativeToParent },
                    }
                  : n,
              ),
            );
            const isReparentInternal = subtreeInternalEdgeFilter(
              childNode.id,
              childrenIds,
            );
            const reparentSourceHandle = resolveHandleId(
              'source',
              sideRelativeToParent,
            );
            const reparentTargetHandle = resolveHandleId(
              'target',
              sideRelativeToParent,
            );
            console.log(
              '[handle:move] onNodeDragStop — 재부모화 서브트리 내부 엣지 핸들 변경',
              edges.filter(isReparentInternal).map((e) => e.id),
              '→',
              {
                sourceHandle: reparentSourceHandle,
                targetHandle: reparentTargetHandle,
              },
            );
            setEdges((prev) =>
              prev.map((e) =>
                isReparentInternal(e)
                  ? {
                      ...e,
                      sourceHandle: reparentSourceHandle,
                      targetHandle: reparentTargetHandle,
                    }
                  : e,
              ),
            );
            persistSubtreeEdgeHandles(
              workspaceId,
              edges,
              isReparentInternal,
              sideRelativeToParent,
            );
          }

          // 6. 엣지 업데이트 (기존 부모 연결 끊고, 새 부모 연결)
          // 기존 부모 연결 먼저 제거 — 로컬 state와 서버 모두 삭제해야 재접속 시 복원되지 않음
          setEdges((prev) =>
            existingParentEdge
              ? prev.filter((edge) => edge.id !== existingParentEdge.id)
              : prev,
          );
          if (existingParentEdge) {
            // 서버가 이 시점에 target 서브트리 depth를 갱신하므로 로컬도 동일 규칙 적용
            setNodes((prev) =>
              applyDepthOnEdgeDelete(prev, edges, existingParentEdge.target),
            );
            deleteEdge(workspaceId, existingParentEdge.id).catch((err) =>
              console.error('[deleteEdge re-parent] failed', err),
            );
          }

          // API: 새 부모 연결 — REST 응답으로 edgeId 취득 후 state 추가
          const dragStopSourceHandle = `source-${sideRelativeToParent}`;
          const dragStopTargetHandle = `target-${sideRelativeToParent === 'left' ? 'right' : 'left'}`;
          const dragStopColor = getGraphColor(parentNode.id, nodes, edges);
          backfillMainColor(parentNode.id, dragStopColor);
          console.log(
            '[handle:save] onNodeDragStop — 새 부모 엣지 생성 요청(핸들 포함 서버 저장)',
            { source: parentNode.id, target: childNode.id },
            {
              sourceHandle: dragStopSourceHandle,
              targetHandle: dragStopTargetHandle,
            },
          );
          createEdge(
            workspaceId,
            parentNode.id,
            childNode.id,
            dragStopSourceHandle,
            dragStopTargetHandle,
          )
            .then(({ edgeId }) => {
              setEdges((prev) => [
                ...prev,
                {
                  id: edgeId,
                  source: parentNode.id,
                  target: childNode.id,
                  type: 'branch',
                  sourceHandle: dragStopSourceHandle,
                  targetHandle: dragStopTargetHandle,
                },
              ]);
              // 서버가 이 시점에 target 서브트리 depth를 갱신하므로 로컬도 동일 규칙 적용
              setNodes((prev) =>
                applyDepthOnEdgeCreate(prev, edges, parentNode.id, childNode.id),
              );
              getRecolorTargetIds(childNode.id, nodes, edges).forEach((id) =>
                updateNodeContent(workspaceId, id, {
                  color: dragStopColor.bg,
                  textColor: dragStopColor.text,
                }).catch((err) =>
                  console.error('[updateNodeColor drag] failed', err),
                ),
              );
            })
            .catch((err) =>
              console.error('[createEdge re-parent] failed', err),
            );

          // 7. childNode 서브트리 색상을 parentNode 색상으로 업데이트
          // dragStopColor 재사용 — 색 없는 main의 랜덤 색이 두 번 뽑히는 것 방지
          setNodes((currentNodes) =>
            updateSubtreeColors(
              childNode.id,
              currentNodes,
              edges,
              dragStopColor,
            ),
          );
        }
      }

      // D3 시뮬레이션 종료: fx, fy 해제 및 alphaTarget(0) 설정
      isDraggingRef.current = false;

      // 드래그 노드와 함께 이동한(같은 그래프) 자식들의 fx, fy 모두 해제
      const draggedChildrenIds = getSameGraphDescendantIds(
        draggedNode,
        nodes,
        edges,
      );
      const allNodesToRelease = [draggedNode.id, ...draggedChildrenIds];

      allNodesToRelease.forEach((nodeId) => {
        const d3Node = d3NodesRef.current.find((n) => n.id === nodeId);
        if (d3Node) {
          d3Node.fx = null;
          d3Node.fy = null;
        }
      });

      // 다중 선택 드래그: 다른 선택 노드들과 그 서브트리도 fx/fy 해제
      if (isMultiDragRef.current) {
        const otherSelected = nodesRef.current.filter(
          (n) => n.selected && n.id !== draggedNode.id,
        );
        otherSelected.forEach((selNode) => {
          [selNode.id, ...getDescendantIds(selNode.id, edges)].forEach((id) => {
            const d3n = d3NodesRef.current.find((n) => n.id === id);
            if (d3n) {
              d3n.fx = null;
              d3n.fy = null;
            }
          });
        });
      }

      const simulation = simulationRef.current;
      if (simulation) {
        simulation.alphaTarget(0);
      }

      // hover 상태 초기화
      setHoveredNodeId(null);

      // 드래그 위치 초기화
      previousDragPositionRef.current = null;

      // 드래그 중 좌우 반전으로 로컬에서만 바뀐 엣지 핸들을 서버에 저장.
      // 반전 후 빈 공간에 놓는 경로는 persistSubtreeEdgeHandles(재부모화·병합
      // 전용)가 닿지 않아, 드래그 시작 스냅샷과의 diff로 변경분을 골라낸다.
      const startHandles = dragStartEdgeHandlesRef.current;
      const edgesToSweep = didReparent ? [] : edges;
      edgesToSweep.forEach((e) => {
        const start = startHandles.get(e.id);
        if (!start) return;
        if (
          start.source === e.sourceHandle &&
          start.target === e.targetHandle
        ) {
          return;
        }
        console.log(
          '[handle:save] onNodeDragStop — 드래그 중 반전된 엣지 핸들 저장',
          e.id,
          {
            before: { sourceHandle: start.source, targetHandle: start.target },
            after: {
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle,
            },
          },
        );
        updateEdge(workspaceId, e.id, {
          ...(typeof e.sourceHandle === 'string' && {
            sourceHandle: e.sourceHandle,
          }),
          ...(typeof e.targetHandle === 'string' && {
            targetHandle: e.targetHandle,
          }),
        })
          .then(() =>
            console.log(
              '[handle:save] updateEdge PATCH 응답(서버 저장 완료)',
              e.id,
            ),
          )
          .catch((err) =>
            console.error(`[updateEdge drag-mirror ${e.id}] failed`, err),
          );
      });

      // API: 위치 저장 — root만 PATCH하고 서버의 자손 delta 전파와 어긋나는
      // 자손만 순차 보정한다 (saveDragPositions CONTEXT 참고)
      const rootsToSave: Array<{
        id: string;
        final?: { x: number; y: number };
      }> = [
        {
          id: draggedNode.id,
          final: { x: finalPosition.x, y: finalPosition.y },
        },
      ];
      if (isMultiDragRef.current) {
        nodesRef.current
          .filter((n) => n.selected && n.id !== draggedNode.id)
          .forEach((n) => rootsToSave.push({ id: n.id }));
        isMultiDragRef.current = false;
      }
      const startPositions = dragStartPositionsRef.current;
      // setTimeout(0): 이 핸들러의 snap·대칭이동 setNodes가 커밋된 뒤
      // nodesRef에서 최신 위치를 읽는다
      setTimeout(() => {
        void saveDragPositions(
          workspaceId,
          rootsToSave,
          nodesRef.current,
          edges,
          startPositions,
        );
      }, 0);
    },
    [
      nodes,
      edges,
      hoveredNodeId,
      workspaceId,
      setNodes,
      setEdges,
      backfillMainColor,
    ],
  );

  useEffect(() => {
    if (focusedNodeId) {
      const node = nodes.find((n) => n.id === focusedNodeId);
      onFocusComplete?.();

      if (node) {
        const x = node.position.x + (node.width ?? NODE_WIDTH) / 2;
        const y = node.position.y + (node.height ?? NODE_HEIGHT) / 2;
        setCenter(x, y, { zoom: 1, duration: 800 });
      }
    }
  }, [focusedNodeId, nodes, setCenter]);

  return (
    <div className="relative w-full h-full bg-background">
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edgesWithPresentation}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onBeforeDelete={onBeforeDelete}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragLeave={onDragLeave}
        isValidConnection={isValidConnection}
        onViewportChange={handleViewportChange}
        {...(savedViewport
          ? { defaultViewport: savedViewport }
          : { fitView: true })}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
      />
      <CursorOverlay cursors={cursors} />
      {myOpenEditorNodeIds.length > 0 && (
        <button
          type="button"
          onClick={handleCloseAllPanels}
          // top-20: 캔버스가 inset-0으로 ChipHeader(fixed h-16, z-30) 뒤까지 깔리므로
          // top-4는 헤더에 가려진다. 헤더 높이(64px) + 16px 아래에 배치.
          className="absolute top-20 right-4 z-40 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        >
          에디터 모두 닫기
        </button>
      )}
      {isArchiveModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[360px] rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <p className="text-base font-semibold">보관하시겠습니까?</p>
            <p className="mt-2 text-sm text-muted">
              선택한 노드와 하위 서브 노드가 함께 보관 처리됩니다. (총{' '}
              {pendingArchiveNodeIds.length}개)
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelArchive}
                className="rounded-md border border-border px-3 py-1.5 text-sm"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={isArchiveDeleting}
                className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface GraphCanvasProps {
  workspaceId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: WorkspaceRole;
  focusedNodeId?: string | null;
  onFocusComplete?: () => void;
  nodes: Node[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
}

export default function GraphCanvas({
  workspaceId,
  currentUserId,
  currentUserName,
  currentUserRole,
  focusedNodeId = null,
  onFocusComplete,
  nodes,
  edges,
  setNodes,
  setEdges,
}: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner
        workspaceId={workspaceId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserRole={currentUserRole}
        focusedNodeId={focusedNodeId}
        onFocusComplete={onFocusComplete}
        nodes={nodes}
        edges={edges}
        setNodes={setNodes}
        setEdges={setEdges}
      />
    </ReactFlowProvider>
  );
}
