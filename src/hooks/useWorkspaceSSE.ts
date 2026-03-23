"use client";
import { useEffect, useRef } from "react";
import { subscribeToWorkspace } from "@/api/sse";
import type {
  SseEvent,
  SseNodeMoveEvent,
  SseNodeCreateEvent,
  SseNodeDeleteEvent,
  SseNodeUpdateEvent,
} from "@/api/types";
import type { Node } from "@xyflow/react";
import type { Dispatch, SetStateAction } from "react";
import { DEFAULT_NODE_COLOR } from "@/features/graph/constants/colors";

interface UseWorkspaceSSEOptions {
  workspaceId: string;
  setNodes: Dispatch<SetStateAction<Node[]>>;
}

/**
 * Subscribes to workspace SSE events and applies real-time updates
 * to the React Flow node state. Side-effect only hook.
 */
export function useWorkspaceSSE({
  workspaceId,
  setNodes,
}: UseWorkspaceSSEOptions): void {
  // Use refs so the latest setNodes is always available
  // without re-subscribing on every render.
  const setNodesRef = useRef(setNodes);
  setNodesRef.current = setNodes;

  useEffect(() => {
    if (!workspaceId) return;

    const handleEvent = (event: SseEvent) => {
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
      }
    };

    const handleNodeMove = (e: SseNodeMoveEvent) => {
      setNodesRef.current((prev) =>
        prev.map((node) =>
          node.id === e.nodeId
            ? { ...node, position: { x: e.x, y: e.y } }
            : node,
        ),
      );
    };

    const handleNodeCreate = (e: SseNodeCreateEvent) => {
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

    const handleNodeDelete = (e: SseNodeDeleteEvent) => {
      setNodesRef.current((prev) =>
        prev.filter((node) => node.id !== e.nodeId),
      );
    };

    const handleNodeUpdate = (e: SseNodeUpdateEvent) => {
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
                ...(e.patch.data?.markdownBody !== undefined && {
                  body: e.patch.data.markdownBody,
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

    const handleError = (err: Event) => {
      console.error("[useWorkspaceSSE] connection error", err);
    };

    const cleanup = subscribeToWorkspace(workspaceId, handleEvent, handleError);

    return cleanup;
  }, [workspaceId]);
}
