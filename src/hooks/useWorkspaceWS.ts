'use client';
import { useEffect, useRef } from 'react';
import { subscribeToWorkspace, onLivePosition } from '@/api/ws';
import type { LivePositionPayload } from '@/api/ws';
import type {
  WsEvent,
  WsNodeMoveEvent,
  WsNodeCreateEvent,
  WsNodeDeleteEvent,
  WsNodeUpdateEvent,
  WsEdgeCreateEvent,
  WsEdgeDeletedEvent,
} from '@/api/types';
import type { Node, Edge } from '@xyflow/react';
import type { Dispatch, SetStateAction, RefObject } from 'react';
import { DEFAULT_NODE_COLOR } from '@/features/graph/constants/colors';
import { getDescendantIds } from '@/features/graph/utils/graphUtils';

const TRANSITION_DURATION = 300;
const MOVE_TRANSITION = `transform ${TRANSITION_DURATION}ms ease`;

interface UseWorkspaceWSOptions {
  workspaceId: string;
  currentUserId?: string;
  userName?: string;
  color?: string;
  profile?: string | null;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  edgesRef: RefObject<Edge[]>;
  isDraggingRef?: RefObject<boolean>;
}

/**
 * Subscribes to workspace WS events and applies real-time updates
 * to the React Flow node state. Side-effect only hook.
 */
export function useWorkspaceWS({
  workspaceId,
  currentUserId,
  userName,
  color,
  profile = null,
  setNodes,
  setEdges,
  edgesRef,
  isDraggingRef,
}: UseWorkspaceWSOptions): void {
  // Use refs so the latest setters are always available
  // without re-subscribing on every render.
  const setNodesRef = useRef(setNodes);
  const setEdgesRef = useRef(setEdges);

  useEffect(() => {
    setNodesRef.current = setNodes;
    setEdgesRef.current = setEdges;
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (!workspaceId || !userName) return;

    const handleEvent = (event: WsEvent) => {
      switch (event.type) {
        case 'NODE_MOVE':
          handleNodeMove(event);
          break;
        case 'NODE_CREATE':
          handleNodeCreate(event);
          break;
        case 'NODE_DELETE':
          handleNodeDelete(event);
          break;
        case 'NODE_UPDATE':
          handleNodeUpdate(event);
          break;
        case 'EDGE_CREATE':
          handleEdgeCreate(event);
          break;
        case 'EDGE_DELETED':
          handleEdgeDelete(event);
          break;
      }
    };

    const handleNodeMove = (e: WsNodeMoveEvent) => {
      // 로컬 드래그 중이면 transition 생략 (충돌 방지)
      const useTransition = !isDraggingRef?.current;
      const transitionStyle = useTransition
        ? { transition: MOVE_TRANSITION }
        : {};

      setNodesRef.current((prev) => {
        const target = prev.find((n) => n.id === e.nodeId);
        if (!target) return prev;

        const deltaX = e.x - target.position.x;
        const deltaY = e.y - target.position.y;
        const childIds = getDescendantIds(e.nodeId, edgesRef.current);

        return prev.map((node) => {
          if (node.id === e.nodeId) {
            return {
              ...node,
              position: { x: e.x, y: e.y },
              style: { ...node.style, ...transitionStyle },
            };
          }
          if (childIds.has(node.id)) {
            return {
              ...node,
              position: {
                x: node.position.x + deltaX,
                y: node.position.y + deltaY,
              },
              style: { ...node.style, ...transitionStyle },
            };
          }
          return node;
        });
      });

      // transition 제거 (로컬 드래그 시 잔류 방지)
      if (useTransition) {
        const affectedIds = new Set([
          e.nodeId,
          ...getDescendantIds(e.nodeId, edgesRef.current),
        ]);
        setTimeout(() => {
          setNodesRef.current((prev) =>
            prev.map((node) =>
              affectedIds.has(node.id)
                ? { ...node, style: { ...node.style, transition: undefined } }
                : node,
            ),
          );
        }, TRANSITION_DURATION);
      }
    };

    /*
     * CONTEXT
     * - Problem      : 노드 생성 시 REST 응답(nodeId만 포함)과 WS NODE_CREATE 이벤트(DB 저장값 전체 포함)가
     *                  모두 도착해, "누가 먼저 왔냐"를 GraphCanvas 곳곳에서 판단하는
     *                  race condition guard가 3벌 중복됐었음.
     * - Why          : 본인 변경은 REST 응답으로 반영하고, 서버가 발신자 제외 broadcast
     *                  (Aideep_backend#47, per-user 룸 .except())를 하므로 본인 WS 이벤트는
     *                  원래 오지 않음. 아래 currentUserId 필터는 서버 회귀·재연결 시
     *                  룸 join 어긋남에 대비한 안전망 — 없으면 중복 삽입.
     * - Alternatives : GraphCanvas에서 계속 중복 guard — 유지보수 비용이 채널이 늘수록 증가.
     * - Trade-offs   : currentUserId가 없으면(undefined) 필터링을 건너뜀 — 중복 방어 없이 동작.
     * - Edge Case    : currentUserId 미전달 시 이전과 동일하게 동작(하위 호환).
     */
    const handleNodeCreate = (e: WsNodeCreateEvent) => {
      // 안전망: 서버 발신자 제외가 깨진 경우에만 도달 (본인 노드는 REST 응답에서 이미 처리됨)
      if (currentUserId && e.userId === currentUserId) return;

      const newNode: Node = {
        id: e.node.nodeId,
        type: 'textUpdater',
        position: { x: e.node.position.x, y: e.node.position.y },
        data: {
          title: e.node.title,
          isMain: e.node.nodeType === 'PROJECT',
          color: e.node.data?.color ?? DEFAULT_NODE_COLOR.bg,
          textColor: e.node.data?.textColor ?? DEFAULT_NODE_COLOR.text,
        },
      };

      setNodesRef.current((prev) => [...prev, newNode]);
    };

    const handleNodeDelete = (e: WsNodeDeleteEvent) => {
      setNodesRef.current((prev) =>
        prev.filter((node) => node.id !== e.nodeId),
      );
      // 임시 처리: 서버가 NODE_DELETE만 broadcast하고 엣지별 EDGE_DELETED를 안 보내서 연결 엣지를 여기서 정리.
      // 서버가 EDGE_DELETED를 함께 broadcast하면(Aideep_backend#49) handleEdgeDelete가 처리 — 이 필터는 멱등이라 안전망으로 유지 가능
      setEdgesRef.current((prev) =>
        prev.filter(
          (edge) => edge.source !== e.nodeId && edge.target !== e.nodeId,
        ),
      );
    };

    const handleEdgeDelete = (e: WsEdgeDeletedEvent) => {
      setEdgesRef.current((prev) =>
        prev.filter((edge) => edge.id !== e.edgeId),
      );
    };

    const handleNodeUpdate = (e: WsNodeUpdateEvent) => {
      setNodesRef.current((prev) =>
        prev.map((node) => {
          if (node.id !== e.nodeId) return node;

          let updated = node;

          if (e.patch.position) {
            updated = {
              ...updated,
              position: {
                x: e.patch.position.x,
                y: e.patch.position.y,
              },
            };
          }

          if (e.patch.title !== undefined || e.patch.data) {
            updated = {
              ...updated,
              data: {
                ...updated.data,
                ...(e.patch.title !== undefined && { title: e.patch.title }),
                ...(e.patch.data?.color !== undefined && {
                  color: e.patch.data.color,
                }),
                ...(e.patch.data?.textColor !== undefined && {
                  textColor: e.patch.data.textColor,
                }),
              },
            };
          }

          return updated;
        }),
      );
    };

    const handleEdgeCreate = (e: WsEdgeCreateEvent) => {
      // 안전망: 서버 발신자 제외가 깨진 경우에만 도달 (본인 엣지는 REST 응답에서 이미 처리됨)
      if (currentUserId && e.userId === currentUserId) return;

      const newEdge: Edge = {
        id: e.edge.edgeId,
        source: e.edge.sourceId,
        target: e.edge.targetId,
        type: 'branch',
        sourceHandle: e.edge.sourceHandle,
        targetHandle: e.edge.targetHandle,
      };
      setEdgesRef.current((prev) => [...prev, newEdge]);
    };

    const handleError = (err: unknown) => {
      console.error('[useWorkspaceWS] connection error', err);
    };

    const cleanup = subscribeToWorkspace(
      workspaceId,
      userName,
      color ?? '',
      profile,
      handleEvent,
      handleError,
    );

    // 실시간 위치 이벤트 (transition 없이 즉시 적용)
    const handleLivePosition = (payload: LivePositionPayload) => {
      setNodesRef.current((prev) => {
        const target = prev.find((n) => n.id === payload.nodeId);
        if (!target) return prev;

        const deltaX = payload.x - target.position.x;
        const deltaY = payload.y - target.position.y;
        if (deltaX === 0 && deltaY === 0) return prev;

        const childIds = getDescendantIds(payload.nodeId, edgesRef.current);

        return prev.map((node) => {
          if (node.id === payload.nodeId) {
            return { ...node, position: { x: payload.x, y: payload.y } };
          }
          if (childIds.has(node.id)) {
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
    };

    const cleanupLive = onLivePosition(handleLivePosition);

    return () => {
      cleanupLive(); // off() 먼저 — cleanup()이 socket을 null로 만들기 전에
      cleanup();
    };
  }, [workspaceId, userName]);
}
