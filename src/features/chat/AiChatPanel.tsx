'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

interface AiChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// 나중에 실제 파이프라인 API로 교체
async function fetchAiResponse(_messages: Message[]): Promise<string> {
  await new Promise((r) => setTimeout(r, 1000));
  const last = _messages[_messages.length - 1];
  return `"${last.content}"에 대한 AI 응답입니다. 파이프라인 연동 후 실제 답변이 제공됩니다.`;
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{ width: 28, height: 28, background: '#6366F1' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
          <path d="M8 12h8M12 8v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div
        className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{ background: '#F3F4F6' }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block rounded-full bg-gray-400"
            style={{
              width: 6,
              height: 6,
              animation: 'chatBounce 1.2s infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div
          className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-sm text-sm text-white leading-relaxed"
          style={{ background: '#6366F1', wordBreak: 'break-word' }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 mb-3">
      <div
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{ width: 28, height: 28, background: '#6366F1' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
          <path d="M8 12h8M12 8v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div
        className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm text-gray-800 leading-relaxed"
        style={{ background: '#F3F4F6', wordBreak: 'break-word' }}
      >
        {message.content}
      </div>
    </div>
  );
}

export default function AiChatPanel({ isOpen, onClose }: AiChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    try {
      const allMessages = [...messages, userMessage];
      const responseText = await fetchAiResponse(allMessages);
      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: 'assistant', content: responseText, createdAt: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleReset = useCallback(() => {
    setMessages([]);
    setInput('');
  }, []);

  return (
    <>
      <style>{`
        @keyframes chatBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>

      {/* Backdrop — 패널 외부 클릭 시 닫기 */}
      {isOpen && (
        <div className="fixed inset-0 z-30" onClick={onClose} />
      )}

      {/* 슬라이드 패널 */}
      <div
        className="fixed right-0 bottom-0 z-40 bg-white border-l border-gray-200 flex flex-col shadow-xl"
        style={{
          top: 64,
          width: 360,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          opacity: isOpen ? 1 : 0,
          transition: 'transform 0.25s ease, opacity 0.25s ease',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-4 flex-shrink-0"
          style={{ height: 56, borderBottom: '1px solid #F0F0F0' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 28, height: 28, background: '#6366F1' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
                <path d="M8 12h8M12 8v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900" style={{ fontSize: 14 }}>
              AI 챗봇
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleReset}
              className="flex items-center justify-center rounded hover:bg-gray-100 transition-colors text-gray-500"
              style={{ width: 28, height: 28 }}
              title="대화 초기화"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-4.37" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded hover:bg-gray-100 transition-colors text-gray-500"
              style={{ width: 28, height: 28 }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1L13 13M13 1L1 13" />
              </svg>
            </button>
          </div>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 48, height: 48, background: '#EEF2FF' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#6366F1" strokeWidth="2" />
                  <path d="M8 12h8M12 8v8" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-gray-500" style={{ fontSize: 13 }}>
                무엇이든 질문해보세요
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력창 */}
        <div
          className="flex-shrink-0 px-3 py-3"
          style={{ borderTop: '1px solid #F0F0F0' }}
        >
          <div
            className="flex items-end gap-2 rounded-xl px-3 py-2"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)"
              rows={1}
              className="flex-1 bg-transparent resize-none text-sm text-gray-900 placeholder-gray-400 outline-none"
              style={{ minHeight: 24, maxHeight: 120, lineHeight: '1.5' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{
                width: 32,
                height: 32,
                background: input.trim() && !isLoading ? '#6366F1' : '#E5E7EB',
                color: input.trim() && !isLoading ? 'white' : '#9CA3AF',
                transition: 'background 0.15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="text-center mt-1.5" style={{ fontSize: 11, color: '#9CA3AF' }}>
            AI가 생성한 내용은 부정확할 수 있습니다
          </p>
        </div>
      </div>
    </>
  );
}
