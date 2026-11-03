import type { RefObject } from 'react';
import { SendIcon } from './ChatIcons';

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  /** 답변을 기다리는 중이거나 범위가 없다 */
  busy: boolean;
  /** 녹음 중인 회의라 질문을 받지 않는다 */
  blocked: boolean;
  webResearch: boolean;
  onToggleWebResearch: () => void;
  /** 남은 횟수 문구 — 서버가 알려줄 때만 넘긴다 */
  usageLabel?: string;
  hasMessages: boolean;
  onReset: () => void;
}

export default function ChatComposer({
  value, onChange, onSubmit, inputRef, busy, blocked, webResearch, onToggleWebResearch, usageLabel, hasMessages, onReset,
}: ChatComposerProps) {
  const canSend = !busy && !blocked && value.trim().length > 0;
  return (
    <footer className="shrink-0 rounded-b-[20px] bg-white px-4 pb-3 pt-3 shadow-[0_-1px_12px_rgba(0,0,0,0.13)]">
      <form
        onSubmit={(event) => { event.preventDefault(); if (canSend) onSubmit(); }}
        className={`flex h-11 items-center gap-2 rounded-[20px] border pl-4 pr-1.5 ${blocked ? 'border-[#E9EEFF] bg-[#F6F7FB]' : 'border-[#C0CEFF] bg-white focus-within:border-[#748DFD]'}`}
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={blocked}
          maxLength={500}
          aria-label="AI에게 질문"
          placeholder={blocked ? '녹음이 끝나면 물어볼 수 있어요' : '이 범위에 대해 물어보세요'}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#111] outline-none placeholder:text-[#A6A6A6] disabled:cursor-not-allowed"
        />
        <button type="submit" disabled={!canSend} aria-label="질문 보내기" className={`flex size-[30px] shrink-0 items-center justify-center rounded-full text-white ${canSend ? 'bg-[#3F62E0] hover:bg-[#3458BF]' : 'bg-[#C0CEFF]'}`}>
          <SendIcon />
        </button>
      </form>
      <div className="mt-2.5 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 text-[11px] text-[#748DFD]">
          <button
            type="button"
            role="switch"
            aria-checked={webResearch}
            aria-label="웹 리서치 포함"
            onClick={onToggleWebResearch}
            className={`relative h-3.5 w-6 rounded-full transition-colors ${webResearch ? 'bg-[#748DFD]' : 'bg-[#DFE5FF]'}`}
          >
            <span className={`absolute top-0.5 size-2.5 rounded-full bg-white transition-[left] ${webResearch ? 'left-3' : 'left-0.5'}`} />
          </button>
          웹 리서치 포함
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#A6A6A6]">
          {hasMessages && <button type="button" onClick={onReset} className="hover:text-[#383838]">새 대화</button>}
          {usageLabel && <span>{usageLabel}</span>}
        </div>
      </div>
    </footer>
  );
}
