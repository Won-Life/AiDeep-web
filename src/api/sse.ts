import { getAccessToken } from './client';
import type { SseEvent } from './types';

export type SseEventHandler = (event: SseEvent) => void;
export type SseErrorHandler = (error: Event) => void;

/**
 * Opens an SSE connection to the workspace stream.
 * Returns a cleanup function that closes the connection.
 *
 * Note: Native EventSource does not support custom headers.
 * The token is passed as a query parameter and the backend
 * proxy (`/api`) forwards it to the upstream server.
 */
export function subscribeToWorkspace(
  workspaceId: string,
  onEvent: SseEventHandler,
  onError?: SseErrorHandler,
): () => void {
  const token = getAccessToken();
  const params = new URLSearchParams({ workspaceId });
  if (token) params.set('token', token);

  const url = `/api/workspace/stream?${params.toString()}`;
  const source = new EventSource(url);

  source.onmessage = (msg: MessageEvent) => {
    try {
      const parsed: SseEvent = JSON.parse(msg.data);
      onEvent(parsed);
    } catch {
      // Silently ignore malformed events
    }
  };

  source.onerror = (err: Event) => {
    onError?.(err);
  };

  return () => {
    source.close();
  };
}
