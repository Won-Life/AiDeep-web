'use client';

import type { MouseEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BUBBLE_MARKDOWN_COMPONENTS } from './chatMarkdown';

interface ChatMessageBubbleProps {
  role: 'assistant' | 'user';
  content: string;
  /** AI 답변에만 전달된다. 내 질문 말풍선은 브라우저 기본 우클릭 메뉴를 유지한다. */
  onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void;
}

export default function ChatMessageBubble({ role, content, onContextMenu }: ChatMessageBubbleProps) {
  const isUser = role === 'user';
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        onContextMenu={onContextMenu}
        className={`min-w-0 break-words ${isUser
          ? 'max-w-[85%] rounded-2xl rounded-br-md bg-main px-3 py-2 text-[13px] leading-5 text-white'
          : 'max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-surface px-3 py-2 text-[13px] leading-5 text-foreground'}`}
      >
        {isUser ? (
          content
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={BUBBLE_MARKDOWN_COMPONENTS}>
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
