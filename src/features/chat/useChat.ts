'use client';

import { useCallback, useState } from 'react';
import { DEMO_CHAT_LIMITS } from './demoChatConfig';
import { requestDemoChat } from './api/demoChat';
import type { ChatMessage, ChatStatus } from './types';

interface UseChatOptions {
  workspaceId: string | null;
}

interface ChatRequest {
  question: string;
  nodeIds: string[];
}

export function useChat({ workspaceId }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('empty');
  const [lastRequest, setLastRequest] = useState<ChatRequest | null>(null);

  const sendMessage = useCallback(async (rawQuestion: string, nodeIds: string[]) => {
    const question = rawQuestion.trim();
    if (!question || status === 'sending') return;
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', content: question }]);
    setStatus('sending');
    setLastRequest({ question, nodeIds });
    try {
      if (!workspaceId) throw new Error('Workspace is unavailable');
      const answer = await requestDemoChat(workspaceId, question, nodeIds);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: answer,
          question,
          rootId: nodeIds[0],
          nodeCount: Math.min(nodeIds.length, DEMO_CHAT_LIMITS.maxNodes),
        },
      ]);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [status, workspaceId]);

  /** 실패한 질문을 다시 보낸다 — 마지막 사용자 말풍선은 새로 만들어지므로 먼저 걷어 낸다 */
  const retry = useCallback(() => {
    if (!lastRequest) return;
    setMessages((current) => current.slice(0, -1));
    setStatus('ready');
    void sendMessage(lastRequest.question, lastRequest.nodeIds);
  }, [lastRequest, sendMessage]);

  /** 마지막 답변을 같은 질문 · 같은 범위로 다시 받는다 */
  const regenerate = useCallback(() => {
    if (!lastRequest || status === 'sending') return;
    setMessages((current) => current.slice(0, -2));
    setStatus('ready');
    void sendMessage(lastRequest.question, lastRequest.nodeIds);
  }, [lastRequest, sendMessage, status]);

  const markSaved = useCallback((messageId: string, nodeId: string) => {
    setMessages((current) => current.map((message) => (message.id === messageId ? { ...message, savedNodeId: nodeId } : message)));
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setStatus('empty');
    setLastRequest(null);
  }, []);

  return { messages, status, sendMessage, retry, regenerate, markSaved, reset };
}
