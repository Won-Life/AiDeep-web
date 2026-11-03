'use client';

import { useEffect, useRef, useState } from 'react';
import { useWorkspaceLayout } from '@/app/workspace/context';
import { showToast } from '@/components/ui/toastStore';
import { sidebarFont } from '@/components/layout/sidebar/SidebarParts';
import { insertChildMdNode } from '@/features/graph/api/insertChildMdNode';
import { answerNodeBody, answerNodeTitle } from './answerNode';
import ChatComposer from './ChatComposer';
import ChatEmptyState from './ChatEmptyState';
import { GripIcon, StarIcon } from './ChatIcons';
import ChatMessageBubble from './ChatMessageBubble';
import { RecordingNotice, ScopeChangeNotice } from './ChatNotices';
import ChatScopeBar from './ChatScopeBar';
import ChatToast from './ChatToast';
import type { ChatMessage } from './types';
import { useChat } from './useChat';
import { useChatScope } from './useChatScope';
import { useFloatingWindow } from './useFloatingWindow';

const WINDOW_WIDTH = 380;
const WINDOW_HEIGHT = 660;
const TOAST_MS = 4500;
// 사이드바 오른쪽 끝에서 띄우는 간격과 위쪽 여백 — Figma 시안 기준
const WINDOW_GAP_X = 46;
const WINDOW_TOP = 70;

interface AiChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface SavedToast { nodeId: string; title: string }

/*
 * CONTEXT
 * - Problem      : 오른쪽 고정 패널은 캔버스를 밀어 좁히고, 질문 범위(어느 노드까지 읽는지)가 화면에 드러나지 않았다.
 * - Why          : 시안(Figma 10)대로 캔버스 위에 뜨는 플로팅 창으로 바꾸고, 범위를 창 맨 위에 항상 보여 준다.
 * - Alternatives : 오른쪽 고정 유지(#120) → 시안과 다르고 캔버스 폭을 잃는다.
 * - Trade-offs   : 창이 캔버스를 가리므로 헤더로 옮기고 접을 수 있게 했다. 닫아도 마운트를 유지해 대화가 남는다.
 * - Edge Case    : 웹 리서치 토글 · 출처 카드 · 남은 횟수는 서버 기능이 없어 화면만 있다(토글은 전송에 쓰지 않고, 출처 · 횟수는 값이 있을 때만 그린다).
 */
export default function AiChatPanel({ isOpen, onToggle }: AiChatPanelProps) {
  const { workspaceId, sidebarWidth, nodes, edges, setNodes, setEdges, setFocusedNodeId } = useWorkspaceLayout();
  const { messages, status, sendMessage, retry, regenerate, markSaved, reset } = useChat({ workspaceId });
  const scope = useChatScope();
  const [input, setInput] = useState('');
  const [webResearch, setWebResearch] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [toast, setToast] = useState<SavedToast | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const { position, dragHandlers } = useFloatingWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    initial: { x: sidebarWidth + WINDOW_GAP_X, y: WINDOW_TOP },
  });

  const sending = status === 'sending';
  const lastAssistantId = [...messages].reverse().find((message) => message.role === 'assistant')?.id;
  const isEmpty = messages.length === 0 && !sending;

  useEffect(() => {
    if (isOpen && !minimized) inputRef.current?.focus();
  }, [isOpen, minimized]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, status]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const ask = (text: string) => {
    const question = text.trim();
    if (!question || sending || scope.blockedByRecording || !scope.current) return;
    scope.lockCurrent();
    scope.clearSwitchedTo();
    void sendMessage(question, scope.nodeIdsToAsk);
    setInput('');
  };

  const save = async (message: ChatMessage) => {
    const parentId = message.rootId ?? scope.current?.rootId;
    if (!workspaceId || !parentId || message.savedNodeId) return;
    const title = answerNodeTitle(message.question ?? '');
    try {
      const nodeId = await insertChildMdNode({
        workspaceId, parentId, title, body: answerNodeBody(message.content), nodes, edges, setNodes, setEdges,
      });
      markSaved(message.id, nodeId);
      setToast({ nodeId, title });
    } catch (error) {
      console.error('[chat save node] failed', error);
      showToast('답변을 노드로 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
    }
  };

  const viewSavedNode = () => {
    if (toast) setFocusedNodeId(toast.nodeId);
    setToast(null);
  };

  return (
    <>
      <aside
        aria-label="AI에게 묻기"
        className={`${sidebarFont.className} fixed z-40 flex flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_1px_6px_rgba(0,0,0,0.19)] ${isOpen ? '' : 'hidden'}`}
        style={{ left: position.x, top: position.y, width: WINDOW_WIDTH, height: minimized ? 'auto' : WINDOW_HEIGHT, maxHeight: 'calc(100vh - 16px)' }}
      >
        <header
          {...dragHandlers}
          className="flex h-[46px] shrink-0 cursor-grab touch-none select-none items-center gap-2 px-4 active:cursor-grabbing"
        >
          <span className="text-[#C0CEFF]"><GripIcon /></span>
          <StarIcon size={12} className="text-[#748DFD]" />
          <h2 className="flex-1 text-[14px] font-bold tracking-[0.02em] text-[#111]">AI에게 묻기</h2>
          <button type="button" aria-label={minimized ? '펼치기' : '접기'} onClick={() => setMinimized((value) => !value)} className="flex size-6 items-center justify-center text-[15px] text-[#C0CEFF] hover:text-[#748DFD]">—</button>
          <button type="button" aria-label="AI에게 묻기 닫기" onClick={onToggle} className="flex size-6 items-center justify-center text-[14px] text-[#C0CEFF] hover:text-[#748DFD]">✕</button>
        </header>

        {!minimized && (
          <>
            <div className="shrink-0 border-b-2 border-[#E9EEFF] px-4 pb-2">
              <ChatScopeBar scope={scope} />
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-3">
              {scope.switchedTo && (
                <p role="status" className="text-center text-[11px] text-[#A6A6A6]">&apos;{scope.switchedTo}&apos; 범위로 바뀌었어요</p>
              )}
              {scope.pendingChange && scope.pendingChangeSummary && scope.summary && (
                <ScopeChangeNotice
                  pinnedTitle={scope.rootTitle}
                  nextTitle={scope.pendingChangeSummary.label}
                  onApply={scope.applyPendingChange}
                  onKeep={scope.keepPinned}
                />
              )}
              {scope.blockedByRecording && (
                <RecordingNotice
                  projectTitle={scope.recordingProjectSummary?.label ?? null}
                  onAskProject={() => scope.recordingProject && scope.pick(scope.recordingProject)}
                />
              )}
              {isEmpty ? (
                <ChatEmptyState
                  title={scope.current ? scope.rootTitle : null}
                  kind={scope.current?.kind ?? null}
                  disabled={!scope.current || scope.blockedByRecording}
                  onAsk={ask}
                />
              ) : (
                <>
                  {messages.map((message) => (
                    <ChatMessageBubble
                      key={message.id}
                      message={message}
                      showActions={message.id === lastAssistantId && !sending}
                      onSave={() => void save(message)}
                      onRegenerate={regenerate}
                    />
                  ))}
                  {sending && <p className="text-[12px] text-[#A6A6A6]">노드를 읽고 답을 정리하고 있어요…</p>}
                  {status === 'error' && (
                    <div className="rounded-xl border border-[#E9EEFF] bg-[#F6F7FB] px-3 py-3">
                      <p className="text-[12px] text-[#6B6B6B]">답변을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
                      <button type="button" onClick={retry} className="mt-2 h-7 rounded-full border border-[#DFE5FF] bg-white px-3 text-[11px] text-[#383838] hover:bg-[#F4F6FF]">다시 시도</button>
                    </div>
                  )}
                </>
              )}
              <div ref={endRef} />
            </div>

            <ChatComposer
              value={input}
              onChange={setInput}
              onSubmit={() => ask(input)}
              inputRef={inputRef}
              busy={sending || !scope.current}
              blocked={scope.blockedByRecording}
              webResearch={webResearch}
              onToggleWebResearch={() => setWebResearch((value) => !value)}
              hasMessages={messages.length > 0}
              onReset={reset}
            />
          </>
        )}
      </aside>
      {toast && <ChatToast message={`답변을 '${toast.title}' 아래 노드로 저장했어요`} onView={viewSavedNode} />}
    </>
  );
}
