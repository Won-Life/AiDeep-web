'use client';

import { type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react';
import { useWorkspaceLayout } from '@/app/workspace/context';
import AnswerPreviewModal from './AnswerPreviewModal';
import ChatMessageBubble from './ChatMessageBubble';
import {
  ERROR_DISPLAY_MS,
  SAVED_DISPLAY_MS,
  useAnswerImageExport,
} from './export/useAnswerImageExport';
import { COPIED_DISPLAY_MS, useAnswerShareLink } from './export/useAnswerShareLink';
import { PLAYLIST_PROMPT_CARET, PLAYLIST_PROMPT_TEMPLATE, SUGGESTED_QUESTIONS } from './types';
import { useChat } from './useChat';

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

export default function AiChatPanel({ isOpen, onToggle }: AiChatPanelProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const exportCardRef = useRef<HTMLDivElement>(null);
  const { workspaceId } = useWorkspaceLayout();
  const { messages, status, sendMessage, retry, reset } = useChat({ workspaceId });
  const isEmpty = messages.length === 0 && status !== 'sending';

  // 우클릭한 AI 답변. null이면 미리보기가 닫힌 상태.
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [exportedAt, setExportedAt] = useState<Date | null>(null);
  const { state: exportState, exportNode, resetState: resetExport } = useAnswerImageExport();
  const { state: shareState, copyLink, resetState: resetShare } = useAnswerShareLink();

  const closeAnswerPreview = () => {
    setPreviewContent(null);
    setExportedAt(null);
    resetExport();
    resetShare();
  };

  const openAnswerPreview = (content: string) => (event: ReactMouseEvent<HTMLDivElement>) => {
    if (status === 'sending') return;
    event.preventDefault();
    // 카드에 찍히는 날짜는 우클릭 시점으로 고정한다 — 저장·복사 시각에 따라 달라지지 않도록.
    setExportedAt(new Date());
    setPreviewContent(content);
  };

  // 저장·복사 후에도 미리보기는 열어둔다. 둘 다 하고 싶은 경우가 많고, 결과 문구를
  // 그 자리에서 보여줄 수 있다.
  const runExport = async () => {
    const node = exportCardRef.current;
    if (!node || !exportedAt) return;
    const succeeded = await exportNode(node, exportedAt);
    window.setTimeout(resetExport, succeeded ? SAVED_DISPLAY_MS : ERROR_DISPLAY_MS);
  };

  const runShare = async () => {
    if (previewContent === null || !exportedAt) return;
    const succeeded = await copyLink(previewContent, exportedAt);
    window.setTimeout(resetShare, succeeded ? COPIED_DISPLAY_MS : ERROR_DISPLAY_MS);
  };

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, status]);

  // 템플릿을 입력란에 채우고 첫 빈칸으로 커서를 옮긴다(전송은 사용자가 직접).
  const fillPlaylistPrompt = () => {
    if (status === 'sending') return;
    setInput(PLAYLIST_PROMPT_TEMPLATE);
    requestAnimationFrame(() => {
      const textarea = inputRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(PLAYLIST_PROMPT_CARET, PLAYLIST_PROMPT_CARET);
    });
  };

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
              {messages.map((message) => (
                <ChatMessageBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  onContextMenu={message.role === 'assistant' ? openAnswerPreview(message.content) : undefined}
                />
              ))}
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
          <div className="mb-2 flex">
            <button
              type="button"
              onClick={fillPlaylistPrompt}
              disabled={status === 'sending'}
              className="inline-flex items-center gap-1 rounded-full bg-sub-purple px-3 py-1.5 text-[12px] font-medium text-text-purple transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              🎧 플리 추천받기
            </button>
          </div>
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

      {previewContent !== null && exportedAt && (
        <AnswerPreviewModal
          content={previewContent}
          exportedAt={exportedAt}
          exportState={exportState}
          shareState={shareState}
          cardRef={exportCardRef}
          onExport={() => void runExport()}
          onShare={() => void runShare()}
          onClose={closeAnswerPreview}
        />
      )}
    </aside>
  );
}
