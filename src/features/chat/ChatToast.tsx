import { StarIcon } from './ChatIcons';

interface ChatToastProps {
  message: string;
  onView: () => void;
}

/** 답변을 노드로 저장한 뒤 뜨는 안내 — 전역 토스트에는 버튼이 없어 채팅 안에서 따로 그린다 */
export default function ChatToast({ message, onView }: ChatToastProps) {
  return (
    <div role="status" className="fixed bottom-6 right-6 z-[60] flex h-[42px] max-w-[calc(100vw-48px)] items-center gap-2.5 rounded-[22px] bg-[#3F62E0] px-5 text-[13px] font-medium text-white shadow-lg">
      <StarIcon size={12} className="shrink-0" />
      <span className="truncate">{message}</span>
      <button type="button" onClick={onView} className="shrink-0 font-bold text-[#C0CEFF] hover:text-white">노드 보기</button>
    </div>
  );
}
