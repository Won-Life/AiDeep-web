"use client";
import { useEffect, useRef } from "react";
import { subscribeToWorkspace, onLivePosition } from "@/api/ws";
import type { LivePositionPayload } from "@/api/ws";
import type {
  WsEvent,
  WsNodeMoveEvent,
  WsNodeCreateEvent,
  WsNodeDeleteEvent,
  WsNodeUpdateEvent,
  WsEdgeCreateEvent,
} from "@/api/types";
import type { Node, Edge } from "@xyflow/react";
import type { Dispatch, SetStateAction, RefObject } from "react";
import { DEFAULT_NODE_COLOR } from "@/features/graph/constants/colors";
import { getDescendantIds } from "@/features/graph/utils/graphUtils";

const TRANSITION_DURATION = 300;
const MOVE_TRANSITION = `transform ${TRANSITION_DURATION}ms ease`;

interface UseWorkspaceWSOptions {
  workspaceId: string;
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
  setNodes,
  setEdges,
  edgesRef,
  isDraggingRef,
}: UseWorkspaceWSOptions): void {
  // Use refs so the latest setters are always available
  // without re-subscribing on every render.
  const setNodesRef = useRef(setNodes);
  setNodesRef.current = setNodes;
  const setEdgesRef = useRef(setEdges);
  setEdgesRef.current = setEdges;

  useEffect(() => {
    if (!workspaceId) return;

    const handleEvent = (event: WsEvent) => {
      switch (event.type) {
        case "NODE_MOVE":
          handleNodeMove(event);
          break;
        case "NODE_CREATE":
          handleNodeCreate(event);
          break;
        case "NODE_DELETE":
          handleNodeDelete(event);
          break;
        case "NODE_UPDATE":
          handleNodeUpdate(event);
          break;
        case "EDGE_CREATE":
          handleEdgeCreate(event);
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

    const handleNodeCreate = (e: WsNodeCreateEvent) => {
      const newNode: Node = {
        id: e.node.nodeId,
        type: "textUpdater",
        position: { x: e.node.position.x, y: e.node.position.y },
        data: {
          text: e.node.title,
          body: e.node.data?.markdownBody ?? "",
          isMain: e.node.nodeType === "PROJECT",
          color: e.node.data?.color ?? DEFAULT_NODE_COLOR.bg,
          textColor: e.node.data?.textColor ?? DEFAULT_NODE_COLOR.text,
        },
      };

      setNodesRef.current((prev) => {
        // Guard against duplicate inserts (e.g. if the creator already
        // added the node optimistically).
        if (prev.some((n) => n.id === newNode.id)) return prev;
        return [...prev, newNode];
      });
    };

    const handleNodeDelete = (e: WsNodeDeleteEvent) => {
      setNodesRef.current((prev) =>
        prev.filter((node) => node.id !== e.nodeId),
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
                ...(e.patch.title !== undefined && { text: e.patch.title }),
                ...(e.patch.data?.jsonBody !== undefined && {
                  content: e.patch.data.jsonBody,
                }),
                ...(e.patch.data?.markdownBody !== undefined && {
                  body: e.patch.data.markdownBody,
                }),
                ...(e.patch.data?.jsonBody !== undefined && {
                  content: e.patch.data.jsonBody,
                }),
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
      setEdgesRef.current((prev) => {
        if (prev.some((edge) => edge.id === e.edge.edgeId)) return prev;
        const newEdge: Edge = {
          id: e.edge.edgeId,
          source: e.edge.sourceId,
          target: e.edge.targetId,
          sourceHandle: e.edge.sourceHandle,
          targetHandle: e.edge.targetHandle,
        };
        return [...prev, newEdge];
      });
    };

    const handleError = (err: unknown) => {
      console.error("[useWorkspaceWS] connection error", err);
    };

    const cleanup = subscribeToWorkspace(workspaceId, handleEvent, handleError);

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
  }, [workspaceId]);
}
