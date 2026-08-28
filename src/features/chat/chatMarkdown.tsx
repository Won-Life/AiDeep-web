'use client';

import type { Components } from 'react-markdown';

/**
 * 채팅 버블 안에서만 쓰는 축소 스타일 — 문서 전체용 typography 프리셋 대신
 * 13px 버블 톤(margin 0, 좁은 gap)에 맞춘 최소 오버라이드.
 */
export const BUBBLE_MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="[&:not(:first-child)]:mt-2">{children}</p>,
  ul: ({ children }) => <ul className="my-1 list-disc space-y-0.5 pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="my-1 list-decimal space-y-0.5 pl-4">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-main underline underline-offset-2 hover:opacity-80">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  blockquote: ({ children }) => <blockquote className="my-1 border-l-2 border-border pl-2 text-muted">{children}</blockquote>,
  hr: () => <hr className="my-2 border-border" />,
  pre: ({ children }) => <pre className="my-1 overflow-x-auto rounded-lg bg-surface-hover p-2 text-[12px] leading-4">{children}</pre>,
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className ?? '');
    if (isBlock) return <code className={`font-mono ${className ?? ''}`}>{children}</code>;
    return <code className="rounded bg-surface-hover px-1 py-0.5 font-mono text-[12px]">{children}</code>;
  },
  table: ({ children }) => <div className="my-1 overflow-x-auto"><table className="border-collapse text-[12px]">{children}</table></div>,
  th: ({ children }) => <th className="border border-border px-2 py-1 text-left">{children}</th>,
  td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
};
