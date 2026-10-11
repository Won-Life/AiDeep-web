'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BUBBLE_MARKDOWN_COMPONENTS } from './chatMarkdown';

interface ChatMessageBubbleProps {
  role: 'assistant' | 'user';
  content: string;
}

export default function ChatMessageBubble({ role, content }: ChatMessageBubbleProps) {
  const isUser = role === 'user';
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
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
