interface ScopeChangeNoticeProps {
  pinnedTitle: string;
  nextTitle: string;
  onApply: () => void;
  onKeep: () => void;
}

export function ScopeChangeNotice({ pinnedTitle, nextTitle, onApply, onKeep }: ScopeChangeNoticeProps) {
  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-[20px] border border-[#748DFD] bg-[#F3F6FF] px-4 py-3">
      <div className="min-w-0">
        <p className="break-words text-[13px] font-bold text-[#3F62E0]">범위가 {pinnedTitle}에 고정돼 있어요</p>
        <p className="mt-0.5 break-words text-[12px] text-[#6B6B6B]">지금 선택한 &apos;{nextTitle}&apos; 기준으로 바꿀까요?</p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button type="button" onClick={onApply} className="h-7 rounded-full bg-[#3F62E0] px-3 text-[10px] font-medium text-white hover:bg-[#3458BF]">바꾸기</button>
        <button type="button" onClick={onKeep} className="h-7 rounded-full border border-[#DFE5FF] bg-white px-3 text-[10px] text-[#383838] hover:bg-[#F4F6FF]">그대로 두기</button>
      </div>
    </div>
  );
}

interface RecordingNoticeProps {
  /** 더 넓게 물을 프로젝트 이름 — 없으면 버튼을 그리지 않는다 */
  projectTitle: string | null;
  onAskProject: () => void;
}

export function RecordingNotice({ projectTitle, onAskProject }: RecordingNoticeProps) {
  return (
    <div role="status" className="rounded-[20px] border border-[#F6CCCC] bg-[#FFF5F5] px-4 py-3.5">
      <p className="text-[13px] font-bold text-[#D64545]">녹음 중인 회의는 끝난 뒤 물어볼 수 있어요</p>
      <p className="mt-1 text-[12px] leading-[1.5] text-[#6B6B6B]">지금은 노드가 계속 만들어지고 있어서 답이 정확하지 않을 수 있어요. 녹음이 끝나면 바로 질문할 수 있게 알려드릴게요.</p>
      {projectTitle && (
        <>
          <button type="button" onClick={onAskProject} className="mt-2.5 h-8 rounded-full border border-[#DFE5FF] bg-white px-4 text-[11px] text-[#383838] hover:bg-[#F4F6FF]">{projectTitle} 전체로 묻기</button>
          <p className="mt-1.5 text-[11px] text-[#A6A6A6]">프로젝트 전체로 물으면 이 회의를 뺀 이전 회의 노드만 참고해요</p>
        </>
      )}
    </div>
  );
}
