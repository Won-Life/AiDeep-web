'use client';

import { useRef, useState } from 'react';
import { useWorkspaceLayout } from '@/app/workspace/context';
import { useDismissable } from '@/hooks/useDismissable';
import { CaretIcon, CheckIcon } from './ChatIcons';
import { nodeTitleOf, sameScope, scopeForNode, summarizeScope, type ChatScope } from './scope';
import type { useChatScope } from './useChatScope';

type ScopeState = ReturnType<typeof useChatScope>;

const PICKER_LIMIT = 8;

function MenuRow({ title, detail, selected, disabled, onClick }: {
  title: string; detail: string; selected?: boolean; disabled?: boolean; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={`relative flex min-h-[46px] w-full items-center justify-between gap-2 px-5 py-1.5 text-left ${selected ? 'bg-[#E9EEFF]' : disabled ? 'cursor-default' : 'hover:bg-[#F4F6FF]'}`}
    >
      {selected && <span className="absolute left-0 top-0 h-full w-1.5 bg-[#748DFD]" aria-hidden="true" />}
      <span className="min-w-0">
        <span className={`block truncate text-[13px] ${disabled ? 'font-medium text-[#C4C4C4]' : 'font-bold text-[#111]'}`}>{title}</span>
        <span className={`block truncate text-[11px] ${disabled ? 'text-[#D6D6D6]' : 'text-[#A6A6A6]'}`}>{detail}</span>
      </span>
      {selected && <CheckIcon className="shrink-0 text-[#3F62E0]" />}
    </button>
  );
}

function NodePicker({ onPick }: { onPick: (scope: ChatScope) => void }) {
  const { nodes, edges } = useWorkspaceLayout();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = nodes
    .filter((node) => !q || nodeTitleOf(node).toLowerCase().includes(q))
    .slice(0, PICKER_LIMIT);
  return (
    <div className="px-4 pb-3 pt-2">
      <input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="노드 이름으로 찾기"
        className="h-8 w-full rounded-full border border-[#C0CEFF] px-3 text-[12px] text-[#111] outline-none placeholder:text-[#A6A6A6] focus:border-[#748DFD]"
      />
      <ul className="mt-1.5 max-h-40 overflow-y-auto">
        {matches.map((node) => (
          <li key={node.id}>
            <button
              type="button"
              onClick={() => { const scope = scopeForNode(node.id, nodes, edges); if (scope) onPick(scope); }}
              className="w-full truncate rounded-lg px-2 py-1.5 text-left text-[12px] text-[#383838] hover:bg-[#F4F6FF]"
            >
              {nodeTitleOf(node)}
            </button>
          </li>
        ))}
        {matches.length === 0 && <li className="px-2 py-1.5 text-[12px] text-[#A6A6A6]">찾는 노드가 없어요</li>}
      </ul>
    </div>
  );
}

function ScopeMenu({ scope, onClose }: { scope: ScopeState; onClose: () => void }) {
  const { nodes, edges } = useWorkspaceLayout();
  const [picking, setPicking] = useState(false);
  const choose = (next: ChatScope) => { scope.pick(next); onClose(); };
  return (
    <div role="menu" className="absolute left-0 top-9 z-10 w-[300px] overflow-hidden rounded-[20px] border border-[#E9EEFF] bg-white pb-2 pt-3 shadow-[0_3px_27px_rgba(51,64,153,0.19)]">
      <p className="px-5 pb-1.5 text-[11px] font-medium text-[#3458BF]">어디까지 보고 답할까요?</p>
      {scope.options.map((option) => {
        const summary = summarizeScope(option, nodes, edges);
        return (
          <MenuRow
            key={`${option.kind}:${option.rootId}`}
            title={summary.label}
            detail={summary.detail}
            selected={Boolean(scope.current && sameScope(option, scope.current))}
            onClick={() => choose(option)}
          />
        );
      })}
      <div className="mx-5 my-1.5 h-px bg-[#3458BF]/20" />
      <MenuRow title="다른 노드 고르기…" detail="캔버스에서 클릭하거나 이름으로 찾기" onClick={() => setPicking((value) => !value)} />
      {picking && <NodePicker onPick={choose} />}
      <MenuRow title="워크스페이스 전체" detail="추후 지원 예정" disabled />
    </div>
  );
}

export default function ChatScopeBar({ scope }: { scope: ScopeState }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useDismissable({ open, onClose: () => setOpen(false), rootRef, restoreFocusRef: triggerRef });
  const recording = scope.blockedByRecording;
  const chip = scope.summary ? (recording ? `${scope.rootTitle} · 녹음 중` : scope.summary.chip) : '범위 없음';

  return (
    <div className="flex h-7 items-center gap-2">
      <span className="text-[11px] text-[#A6A6A6]">범위</span>
      <div ref={rootRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={!scope.summary}
          onClick={() => setOpen((value) => !value)}
          className={`flex h-7 max-w-[190px] items-center gap-1.5 rounded-full px-3 text-[12px] ${recording ? 'bg-[#FCEDED] font-bold text-[#D14040]' : 'bg-[#E9EEFF] font-medium text-[#3F62E0]'}`}
        >
          <span className={`size-1.5 shrink-0 rounded-full ${recording ? 'bg-[#D14040]' : 'bg-[#748DFD]'}`} aria-hidden="true" />
          <span className="truncate">{chip}</span>
          <CaretIcon className="shrink-0" />
        </button>
        {open && <ScopeMenu scope={scope} onClose={() => setOpen(false)} />}
      </div>
      <button
        type="button"
        aria-pressed={scope.follow}
        onClick={scope.followSelection}
        className={`ml-auto h-[27px] shrink-0 rounded-[14px] border border-[#DFE5FF] px-3 text-[11px] text-[#748DFD] ${scope.follow ? 'bg-[#F4F6FF]' : 'bg-white hover:bg-[#F4F6FF]'}`}
      >
        선택 따라가기
      </button>
    </div>
  );
}
