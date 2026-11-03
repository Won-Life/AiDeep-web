'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BUBBLE_MARKDOWN_COMPONENTS } from './chatMarkdown';
import { CheckIcon, StarIcon } from './ChatIcons';
import type { ChatMessage } from './types';

const WEB_PREVIEW_COUNT = 2;

interface ChatMessageBubbleProps {
  message: ChatMessage;
  /** 마지막 답변에만 저장 · 복사 · 다시 답변 버튼을 붙인다 */
  showActions: boolean;
  onSave: () => void;
  onRegenerate: () => void;
}

function metaText(message: ChatMessage): string | null {
  const nodeCount = message.sources?.nodes.length ?? message.nodeCount;
  const webCount = message.sources?.webs.length ?? 0;
  if (!nodeCount && !webCount) return null;
  const parts = [nodeCount ? `노드 ${nodeCount}개` : null, webCount ? `웹 ${webCount}곳` : null].filter(Boolean);
  return `${parts.join(' · ')}${webCount ? '을' : '를'} 참고했어요`;
}

function SourceList({ message }: { message: ChatMessage }) {
  const [expanded, setExpanded] = useState(false);
  const nodes = message.sources?.nodes ?? [];
  const webs = message.sources?.webs ?? [];
  if (!nodes.length && !webs.length) return null;
  const shownWebs = expanded ? webs : webs.slice(0, WEB_PREVIEW_COUNT);
  return (
    <div className="mt-3 flex flex-col gap-2">
      {nodes.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-[#111]">내 노드</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {nodes.map((node) => (
              <span key={node.id} className="rounded-md bg-[#E9EEFF] px-2 py-1 text-[11px] font-medium text-[#3F62E0]">{node.title}</span>
            ))}
          </div>
        </div>
      )}
      {webs.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-[#111]">웹</p>
          <div className="mt-1 flex flex-col gap-1.5">
            {shownWebs.map((web) => (
              <a key={web.url} href={web.url} target="_blank" rel="noopener noreferrer" className="flex h-[49px] items-center gap-2 rounded-lg border border-[#E9EEFF] px-3 hover:bg-[#F4F6FF]">
                <span className="size-3.5 shrink-0 rounded-full bg-[#E9EEFF]" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-medium text-[#383838]">{web.title}</span>
                  <span className="block truncate text-[10px] text-[#A6A6A6]">{web.host}</span>
                </span>
              </a>
            ))}
          </div>
          {webs.length > WEB_PREVIEW_COUNT && !expanded && (
            <button type="button" onClick={() => setExpanded(true)} className="mt-1.5 text-[11px] font-medium text-[#748DFD]">+ {webs.length - WEB_PREVIEW_COUNT}곳 더 보기</button>
          )}
        </div>
      )}
    </div>
  );
}

function AnswerActions({ message, onSave, onRegenerate }: Pick<ChatMessageBubbleProps, 'message' | 'onSave' | 'onRegenerate'>) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  const outline = 'h-8 rounded-lg border border-[#DFE5FF] bg-white px-3 text-[12px] text-[#383838] hover:bg-[#F4F6FF]';
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {message.savedNodeId ? (
        <span className="inline-flex h-[30px] items-center gap-1 rounded-lg bg-[#E9EEFF] px-3 text-[12px] font-medium text-[#3F62E0]"><CheckIcon /> 노드로 저장됨</span>
      ) : (
        <button type="button" onClick={onSave} className="h-[30px] rounded-lg bg-[#3F62E0] px-3 text-[12px] font-medium text-white hover:bg-[#3458BF]">노드로 저장</button>
      )}
      <button type="button" onClick={() => void copy()} className={outline}>{copied ? '복사됨' : '복사'}</button>
      <button type="button" onClick={onRegenerate} className={outline}>다시 답변</button>
    </div>
  );
}

export default function ChatMessageBubble({ message, showActions, onSave, onRegenerate }: ChatMessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[260px] min-w-0 break-words rounded-[18px] rounded-br-md bg-[#3F62E0] px-4 py-2.5 text-[13px] leading-5 text-white">{message.content}</div>
      </div>
    );
  }
  const meta = metaText(message);
  return (
    <div className="min-w-0">
      {meta && (
        <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-[#748DFD]"><StarIcon size={10} /> {meta}</p>
      )}
      <div className="break-words text-[13px] leading-[1.5] text-[#383838]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={BUBBLE_MARKDOWN_COMPONENTS}>{message.content}</ReactMarkdown>
      </div>
      <SourceList message={message} />
      {showActions && <AnswerActions message={message} onSave={onSave} onRegenerate={onRegenerate} />}
    </div>
  );
}
