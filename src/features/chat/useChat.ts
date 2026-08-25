'use client';

import { useCallback, useState } from 'react';
import { getMockChatReply } from './mockChat';
import type { ChatMessage, ChatStatus } from './types';

export function useChat() {
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
      const reply = await getMockChatReply(question);
      setMessages((current) => [...current, reply]);
      setStatus('ready');
      setRetryQuestion(null);
    } catch {
      setStatus('error');
    }
  }, [status]);

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
