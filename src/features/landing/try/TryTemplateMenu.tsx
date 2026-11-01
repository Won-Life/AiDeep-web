const TEMPLATES = [
  { id: 'free', title: '바로 쓰기', description: '빈 콘텐츠에서 바로 입력해요', active: true },
  { id: 'lecture', title: '강의 필기', description: '핵심 개념 · 자세한 설명 · 헷갈린 점', active: false },
  { id: 'meeting', title: '회의 메모', description: '결정 사항 · 논의 내용 · 할 일', active: false },
] as const;

/** "콘텐츠 노드 만들기" 템플릿 메뉴 그림 */
export default function TryTemplateMenu({ left, top }: { left: number; top: number }) {
  return (
    <div
      className="absolute flex w-[250px] flex-col items-start overflow-hidden rounded-[14px] border border-[var(--landing-menu-border)] bg-white py-[10px]"
      style={{ left, top }}
    >
      <p className="px-4 pt-1 pb-2 text-[11px] leading-[1.5] whitespace-nowrap text-[var(--landing-text-muted)]">콘텐츠 노드 만들기</p>
      {TEMPLATES.map((template) => (
        <div
          key={template.id}
          className={`flex w-full flex-col items-start gap-[2px] px-4 py-2 leading-[1.5] whitespace-nowrap ${
            template.active ? 'bg-[var(--landing-menu-active)]' : ''
          }`}
        >
          <p className="text-[13px] font-bold text-[var(--landing-text)]">{template.title}</p>
          <p className="text-[11px] text-[var(--landing-text-muted)]">{template.description}</p>
        </div>
      ))}
    </div>
  );
}
