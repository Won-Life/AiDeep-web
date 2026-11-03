import { StarIcon } from './ChatIcons';
import type { ScopeKind } from './scope';

const SUGGESTIONS: Record<ScopeKind, string[]> = {
  title: ['이번 회의에서 아직 결정 안 된 건 뭐야?', '여기서 해야 할 일만 정리해줘', '핵심 내용을 세 줄로 요약해줘'],
  project: ['이 프로젝트 진행 상황을 요약해줘', '최근 결정사항 알려줘', '미해결 질문 찾아줘'],
  node: ['이 노드 내용을 요약해줘', '이어서 정리해야 할 건 뭐야?', '해야 할 일 알려줘'],
};

interface ChatEmptyStateProps {
  title: string | null;
  kind: ScopeKind | null;
  disabled: boolean;
  onAsk: (question: string) => void;
}

export default function ChatEmptyState({ title, kind, disabled, onAsk }: ChatEmptyStateProps) {
  const questions = SUGGESTIONS[kind ?? 'project'];
  return (
    <section className="flex flex-col items-center px-1 pt-5">
      <span className="flex size-12 items-center justify-center rounded-full bg-[#E9EEFF] text-[#748DFD]"><StarIcon size={20} /></span>
      <h3 className="mt-3 text-center text-[15px] font-bold leading-[1.4] text-[#111]">
        {title ? <>&apos;{title}&apos; 노드를 바탕으로<br />궁금한 걸 물어보세요</> : <>노드를 바탕으로<br />궁금한 걸 물어보세요</>}
      </h3>
      <p className="mt-1.5 text-center text-[12px] text-[#4D4D4D]">노드 내용을 먼저 읽고, 필요하면 웹에서 더 찾아볼게요</p>
      <p className="mt-6 flex items-center gap-1.5 self-start text-[11px] text-[#A6A6A6]"><span className="size-1.5 rounded-full bg-[#C0CEFF]" aria-hidden="true" />이렇게 물어볼 수 있어요</p>
      <div className="mt-2 flex w-full flex-col gap-2">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            disabled={disabled}
            onClick={() => onAsk(question)}
            className="flex h-[42px] items-center gap-2 rounded-[20px] border border-[#748DFD] bg-white px-4 text-left text-[13px] text-[#383838] hover:bg-[#F4F6FF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <StarIcon size={10} className="shrink-0 text-[#748DFD]" />
            <span className="truncate">{question}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
