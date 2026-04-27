/*
 * CONTEXT
 * - Problem      : $convertFromMarkdownString는 multiline-element 트랜스포머로 표를 처리할 수 없음.
 *                  모든 행이 |...|로 동일하게 생겨 '종료 줄'을 구분선(2번째 행)으로 잘못 인식하기 때문.
 *                  또한 $convertFromMarkdownString 내부에서 root.clear()가 호출되면 Lexical이
 *                  anchor 노드 제거를 감지하고 선택 위치를 root:0으로 자동 리셋한다.
 * - Why          : 텍스트를 table/text 세그먼트로 분리하여, 표 세그먼트는 직접 TableNode를 생성하고
 *                  나머지는 기존 $convertFromMarkdownString에 위임하는 방식으로 해결.
 *                  커서 선택 위치 리셋 문제는 root 조작 전에 anchor/focus를 스냅샷으로 저장하고,
 *                  노드 수집 후 $createRangeSelection으로 새 선택을 복원한 뒤 삽입해 해결.
 * - Alternatives : multiline-element 트랜스포머 (기각 — 위 이유로 행 단위 파싱 불가).
 * - Trade-offs   : 세그먼트 분리 로직이 추가되지만, 표/일반 마크다운이 혼합된 텍스트도 정확히 처리 가능.
 * - Edge Case    : 구분선 없는 줄(가짜 표), 빈 셀, 셀 수가 행마다 다른 경우 모두 허용.
 */
'use client';

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  PASTE_COMMAND,
  COMMAND_PRIORITY_LOW,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  $createRangeSelection,
  $setSelection,
  type LexicalNode,
} from 'lexical';
import { $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import {
  $createTableNode,
  $createTableRowNode,
  $createTableCellNode,
  TableCellHeaderStates,
} from '@lexical/table';

const MARKDOWN_PATTERNS = [
  /^#{1,6}\s.+/m, // 제목: # H1          (0)
  /^```[\s\S]*?```$/m, // 코드 블록            (1)
  /^\[[ x]\]\s/im, // 체크리스트: [ ] [x] (2)
  /\*\*[^*\n]+\*\*/, // 볼드: **text**      (3)
  /\[[^\]\n]+\]\([^)\n]+\)/, // 링크: [text](url)  (4)
  /^[-*+]\s.+/m, // 순서 없는 목록       (5)
  /^\d+\.\s.+/m, // 순서 있는 목록       (6)
  /^>\s.+/m, // 인용                 (7)
  /^\|.+\|/m, // 표: | col | col |   (8)
];

const STRONG_PATTERN_INDICES = new Set([0, 1, 2, 8]); // heading, code block, checklist, table

function isMarkdown(text: string): boolean {
  const matched = MARKDOWN_PATTERNS.map((p, i) => ({
    i,
    hit: p.test(text),
  })).filter((m) => m.hit);
  const hasStrong = matched.some((m) => STRONG_PATTERN_INDICES.has(m.i));
  return hasStrong || matched.length >= 2;
}

// ─── Table helpers ────────────────────────────────────────────────────────────

type Segment = { type: 'table' | 'text'; lines: string[] };

const SEPARATOR_RE = /^\|[\s\-|:]+\|$/;

function splitSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let current: Segment | null = null;

  for (const line of text.split('\n')) {
    const type: 'table' | 'text' = /^\|.+\|/.test(line.trim())
      ? 'table'
      : 'text';
    if (!current || current.type !== type) {
      if (current) segments.push(current);
      current = { type, lines: [] };
    }
    current.lines.push(line);
  }
  if (current) segments.push(current);
  return segments;
}

function parseTableCells(line: string): string[] {
  return line
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());
}

function $buildTableNode(lines: string[]): LexicalNode {
  // 구분선이 없으면 진짜 표가 아니므로 단락으로 fallback
  if (lines.length < 2 || !SEPARATOR_RE.test(lines[1].trim())) {
    const para = $createParagraphNode();
    para.append($createTextNode(lines.join('\n')));
    return para;
  }

  const tableNode = $createTableNode();
  // lines[0]: 헤더, lines[1]: 구분선(건너뜀), lines[2+]: 데이터 행
  const rowLines = [lines[0], ...lines.slice(2)];

  rowLines.forEach((line, rowIndex) => {
    const row = $createTableRowNode();
    parseTableCells(line).forEach((cellText) => {
      const cell = $createTableCellNode(
        rowIndex === 0
          ? TableCellHeaderStates.ROW
          : TableCellHeaderStates.NO_STATUS,
      );
      const para = $createParagraphNode();
      para.append($createTextNode(cellText));
      cell.append(para);
      row.append(cell);
    });
    tableNode.append(row);
  });

  return tableNode;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export function MarkdownPastePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const text = clipboardData.getData('text/plain');
        if (!text || !isMarkdown(text)) return false;

        event.preventDefault();
        editor.update(() => {
          const selection = $getSelection();
          const root = $getRoot();

          // root.clear() 호출 시 Lexical이 anchor 노드 제거를 감지하고 선택을
          // root:0으로 자동 리셋한다. 조작 전에 key/offset을 스냅샷으로 저장한다.
          type SavedPoint = {
            key: string;
            offset: number;
            type: 'text' | 'element';
          };
          let savedAnchor: SavedPoint | null = null;
          let savedFocus: SavedPoint | null = null;

          if ($isRangeSelection(selection)) {
            savedAnchor = {
              key: selection.anchor.key,
              offset: selection.anchor.offset,
              type: selection.anchor.type,
            };
            savedFocus = {
              key: selection.focus.key,
              offset: selection.focus.offset,
              type: selection.focus.type,
            };
          }

          const existingChildren = [...root.getChildren()];
          const segments = splitSegments(text);
          const allNodes: LexicalNode[] = [];

          for (const segment of segments) {
            if (segment.type === 'table') {
              allNodes.push($buildTableNode(segment.lines));
            } else {
              const segmentText = segment.lines.join('\n').trim();
              if (!segmentText) continue;

              $convertFromMarkdownString(segmentText, TRANSFORMERS);
              allNodes.push(...root.getChildren());

              // 다음 세그먼트 처리를 위해 root를 원래 내용으로 복구
              root.clear();
              for (const child of existingChildren) root.append(child);
            }
          }

          if (savedAnchor !== null && savedFocus !== null) {
            const newSel = $createRangeSelection();
            newSel.anchor.set(
              savedAnchor.key,
              savedAnchor.offset,
              savedAnchor.type,
            );
            newSel.focus.set(
              savedFocus.key,
              savedFocus.offset,
              savedFocus.type,
            );
            $setSelection(newSel);
            newSel.insertNodes(allNodes);
          } else {
            for (const node of allNodes) root.append(node);
          }
        });
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  return null;
}
