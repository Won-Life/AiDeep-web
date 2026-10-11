'use client';

import { useCallback, useState } from 'react';
import { requestDemoChat } from './api/demoChat';
import type { ChatMessage, ChatStatus } from './types';

interface UseChatOptions {
  workspaceId: string | null;
}

export function useChat({ workspaceId }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('empty');
  const [retryQuestion, setRetryQuestion] = useState<string | null>(null);

  const sendMessage = useCallback(async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || status === 'sending') return;
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', content: question }]);
    setStatus('sending');
    setRetryQuestion(question);
    try {
      if (!workspaceId) throw new Error('Workspace is unavailable');
      const answer = await requestDemoChat(workspaceId, question);
      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: 'assistant', content: answer },
      ]);
      setStatus('ready');
      setRetryQuestion(null);
    } catch {
      setStatus('error');
    }
  }, [status, workspaceId]);

  const retry = useCallback(() => {
    if (!retryQuestion) return;
    setMessages((current) => current.slice(0, -1));
    setStatus('ready');
    void sendMessage(retryQuestion);
  }, [retryQuestion, sendMessage]);

  const reset = useCallback(() => {
    setMessages([]);
    setStatus('empty');
    setRetryQuestion(null);
  }, []);

  return { messages, status, sendMessage, retry, reset };
}
