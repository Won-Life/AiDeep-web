'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useWorkspaceLayout } from '@/app/workspace/context';
import { SUGGESTED_QUESTIONS } from './types';
import { useChat } from './useChat';

// 채팅 버블 안에서만 쓰는 축소 스타일 — 문서 전체용 typography 프리셋 대신
// 13px 버블 톤(margin 0, 좁은 gap)에 맞춘 최소 오버라이드.
const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="[&:not(:first-child)]:mt-2">{children}</p>,
  ul: ({ children }) => <ul className="my-1 list-disc space-y-0.5 pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="my-1 list-decimal space-y-0.5 pl-4">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-main underline underline-offset-2 hover:opacity-80">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  blockquote: ({ children }) => <blockquote className="my-1 border-l-2 border-border pl-2 text-muted">{children}</blockquote>,
  hr: () => <hr className="my-2 border-border" />,
  pre: ({ children }) => <pre className="my-1 overflow-x-auto rounded-lg bg-surface-hover p-2 text-[12px] leading-4">{children}</pre>,
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className ?? '');
    if (isBlock) return <code className={`font-mono ${className ?? ''}`}>{children}</code>;
    return <code className="rounded bg-surface-hover px-1 py-0.5 font-mono text-[12px]">{children}</code>;
  },
  table: ({ children }) => <div className="my-1 overflow-x-auto"><table className="border-collapse text-[12px]">{children}</table></div>,
  th: ({ children }) => <th className="border border-border px-2 py-1 text-left">{children}</th>,
  td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
};

export const AI_CHAT_PANEL_WIDTH = 416;
// 닫힌 상태에서는 패널 본문을 완전히 화면 밖으로 보내고, 탭만 살짝 남긴다.
export const AI_CHAT_HANDLE_WIDTH = 0;

const SUGGESTION_STYLES = [
  'bg-sub-blue text-text-blue hover:opacity-85',
  'bg-sub-yellow text-text-yellow hover:opacity-85',
  'bg-sub-green text-text-green hover:opacity-85',
  'bg-sub-purple text-text-purple hover:opacity-85',
];

interface AiChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 12V3M8 3 4.5 6.5M8 3l3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChatMessageBubble({ role, content }: { role: 'assistant' | 'user'; content: string }) {
  const isUser = role === 'user';
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div className={`min-w-0 break-words ${isUser
        ? 'max-w-[85%] rounded-2xl rounded-br-md bg-main px-3 py-2 text-[13px] leading-5 text-white'
        : 'max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-surface px-3 py-2 text-[13px] leading-5 text-foreground'}`}>
        {isUser ? (
          content
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function AiChatPanel({ isOpen, onToggle }: AiChatPanelProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const { workspaceId } = useWorkspaceLayout();
  const { messages, status, sendMessage, retry, reset } = useChat({ workspaceId });
  const isEmpty = messages.length === 0 && status !== 'sending';

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, status]);

  const submit = () => {
    if (!input.trim() || status === 'sending') return;
    void sendMessage(input);
    setInput('');
  };

  return (
    <aside
      aria-label="AiDeep Chat"
      className="fixed right-0 top-0 z-40 h-screen transition-transform duration-200 ease-out"
      style={{
        width: AI_CHAT_PANEL_WIDTH,
        transform: isOpen ? 'translateX(0)' : `translateX(${AI_CHAT_PANEL_WIDTH}px)`,
      }}
    >
      <button
        type="button"
        aria-label={isOpen ? 'AiDeep Chat 닫기' : 'AiDeep Chat 열기'}
        onClick={onToggle}
        className="absolute -left-5 top-1/2 z-10 flex h-20 w-10 -translate-y-1/2 items-center justify-center rounded-l-2xl rounded-r-none bg-surface text-muted shadow-md transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <span className="text-xl leading-none">{isOpen ? '›' : '‹'}</span>
      </button>

      <div className="flex h-full min-w-0 flex-col overflow-hidden border-l border-border bg-background px-5 pb-4 pt-5 shadow-[-8px_0_20px_rgba(0,0,0,0.06)] dark:shadow-[-8px_0_20px_rgba(0,0,0,0.2)]" style={{ borderRadius: '16px 0 0 16px' }}>
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="typo-h1">AiDeep Chat</h2>
            <p className="mt-1 typo-cap2 text-muted">프로젝트에 대해 무엇이든 물어보세요.</p>
          </div>
          <button type="button" onClick={onToggle} className="-mt-1 flex size-8 items-center justify-center rounded-md text-xl text-muted transition-colors hover:bg-surface hover:text-foreground" aria-label="AiDeep Chat 닫기">×</button>
        </header>

        <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
          {isEmpty ? (
            <section>
              <p className="typo-sub1">추천 질문</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {SUGGESTED_QUESTIONS.map((question, index) => (
                  <button key={question} type="button" onClick={() => void sendMessage(question)} className={`min-h-20 rounded-xl px-3 text-left text-[13px] leading-5 transition-opacity ${SUGGESTION_STYLES[index]}`}>
                    {question}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="flex flex-col gap-3">
              {messages.map((message) => <ChatMessageBubble key={message.id} role={message.role} content={message.content} />)}
              {status === 'sending' && (
                <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-border bg-surface px-3 py-2 text-[13px] text-muted">AiDeep이 답변을 정리하고 있어요...</div></div>
              )}
              {status === 'error' && (
                <div className="rounded-xl border border-border bg-surface px-3 py-3">
                  <p className="typo-cap2 text-muted">답변을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
                  <button type="button" onClick={retry} className="mt-2 rounded-md bg-surface-hover px-2 py-1 text-xs text-foreground transition-colors hover:bg-surface-active">다시 시도</button>
                </div>
              )}
              <div ref={messageEndRef} />
            </section>
          )}
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 focus-within:border-gray-500">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); }
              }}
              disabled={status === 'sending'}
              rows={1}
              placeholder="메시지를 입력하세요..."
              className="max-h-24 min-h-8 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-foreground outline-none placeholder:text-muted disabled:cursor-not-allowed"
            />
            <button type="button" onClick={submit} disabled={!input.trim() || status === 'sending'} aria-label="메시지 보내기" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-main text-white transition-colors hover:bg-main/90 disabled:cursor-not-allowed disabled:opacity-40">
              <SendIcon />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={reset} className="typo-cap2 inline-flex items-center gap-1 text-muted transition-colors hover:text-foreground">↻ 새 대화</button>
            <span className="typo-cap3 text-muted">그래프 기록을 바탕으로 답변합니다.</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
