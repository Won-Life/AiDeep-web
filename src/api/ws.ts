import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './client';
import type { SseEvent } from './types';

export type WsEventHandler = (event: SseEvent) => void;
export type WsErrorHandler = (error: unknown) => void;

let socket: Socket | null = null;

export function subscribeToWorkspace(
  workspaceId: string,
  onEvent: WsEventHandler,
  onError?: WsErrorHandler,
): () => void {
  // 기존 소켓이 남아 있으면 정리 (좀비 소켓 방지)
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const token = getAccessToken();

  const wsOrigin = process.env.NEXT_PUBLIC_WS_ORIGIN ?? '';
  socket = io(`${wsOrigin}/workspace`, {
    path: '/socket.io',
    auth: { token: token ?? '' },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    socket!.emit('join_workspace', { workspaceId });
  });

  socket.on('workspace_event', (event: SseEvent) => {
    onEvent(event);
  });

  socket.on('connect_error', (err) => {
    onError?.(err);
  });

  return () => {
    socket?.disconnect();
    socket = null;
  };
}

export interface LivePositionPayload {
  workspaceId: string;
  nodeId: string;
  x: number;
  y: number;
}

export function emitLivePosition(
  workspaceId: string,
  nodeId: string,
  x: number,
  y: number,
): void {
  socket?.emit('node_position_live', { workspaceId, nodeId, x, y });
}

export function onLivePosition(
  handler: (payload: LivePositionPayload) => void,
): () => void {
  if (!socket) return () => {};
  socket.on('node_position_live', handler);
  return () => {
    socket?.off('node_position_live', handler);
  };
}
