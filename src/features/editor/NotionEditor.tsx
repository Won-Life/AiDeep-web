'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import {
  LexicalTypeaheadMenuPlugin,
  useBasicTypeaheadTriggerMatch,
  MenuOption,
  SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $getNodeByKey,
  $insertNodes,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  KEY_DOWN_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $createParagraphNode,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_NORMAL,
  DecoratorNode,
  createCommand,
  type LexicalEditor,
  type NodeKey,
  type SerializedLexicalNode,
} from 'lexical';
import {
  HeadingNode,
  QuoteNode,
  $createHeadingNode,
  $isHeadingNode,
  $createQuoteNode,
  $isQuoteNode,
} from '@lexical/rich-text';
import {
  ListNode,
  ListItemNode,
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list';
import {
  CodeNode,
  CodeHighlightNode,
  $createCodeNode,
  $isCodeNode,
} from '@lexical/code';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { TableNode, TableRowNode, TableCellNode, INSERT_TABLE_COMMAND } from '@lexical/table';
import { TRANSFORMERS, $convertToMarkdownString } from '@lexical/markdown';
import { MarkdownPastePlugin } from './plugins/MarkdownPastePlugin';
import { $setBlocksType } from '@lexical/selection';
import { $getNearestNodeOfType, mergeRegister } from '@lexical/utils';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalCollaboration } from '@lexical/react/LexicalCollaborationContext';
import * as Y from 'yjs';
import type { SocketIoYjsProvider } from '@/lib/SocketIoYjsProvider';
import { Tooltip } from '@/components/ui/Tooltip';

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'quote'
  | 'code'
  | 'bullet'
  | 'number'
  | 'check';

export interface NotionEditorProps {
  nodeId: string;
  collabProvider: SocketIoYjsProvider | null;
  username?: string;
  cursorColor?: string;
  onFirstLineChange?: (text: string) => void;
  onContentChange?: (content: { markdownBody: string; jsonBody: string }) => void;
  toolbarSlot?: ReactNode;
  noMediaDrop?: boolean;
  autoGrow?: boolean;
  minHeight?: number;
  extraBottomPadding?: boolean;
}

// ─── Media Commands ───────────────────────────────────────────────────────────

const INSERT_IMAGE_COMMAND = createCommand<{ src: string; caption?: string }>('INSERT_IMAGE');
const INSERT_FILE_COMMAND = createCommand<{ name: string; size: number; dataUrl: string }>('INSERT_FILE');

// ─── Image Caption Editor ─────────────────────────────────────────────────────

function ImageCaptionEditor({ nodeKey, caption }: { nodeKey: NodeKey; caption: string }) {
  const [editor] = useLexicalComposerContext();
  const [local, setLocal] = useState(caption);

  const save = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (node instanceof ImageNode) {
        node.getWritable().__caption = local;
      }
    });
  }, [editor, nodeKey, local]);

  return (
    <input
      className="nodrag nowheel"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      placeholder="사진 설명"
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'center',
        fontSize: 13,
        color: 'rgb(var(--muted))',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        padding: '4px 0 6px',
        cursor: 'text',
      }}
    />
  );
}

// ─── Image Node ───────────────────────────────────────────────────────────────

type SerializedImageNode = SerializedLexicalNode & {
  src: string;
  caption: string;
};

class ImageNode extends DecoratorNode<ReactNode> {
  __src: string;
  __caption: string;

  static getType(): string { return 'image'; }
  static clone(node: ImageNode): ImageNode { return new ImageNode(node.__src, node.__caption, node.__key); }
  static importJSON(s: SerializedImageNode): ImageNode { return new ImageNode(s.src, s.caption ?? ''); }

  constructor(src: string, caption = '', key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__caption = caption;
  }

  exportJSON(): SerializedImageNode {
    return { type: 'image', version: 1, src: this.__src, caption: this.__caption };
  }

  isInline(): boolean { return false; }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.style.display = 'contents';
    return div;
  }

  updateDOM(): false { return false; }

  decorate(): ReactNode {
    return (
      <figure style={{ margin: '6px 0', padding: 0 }} contentEditable={false}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={this.__src}
          alt={this.__caption}
          draggable={false}
          style={{ maxWidth: '100%', borderRadius: 6, display: 'block' }}
        />
        <ImageCaptionEditor nodeKey={this.__key} caption={this.__caption} />
      </figure>
    );
  }
}

// ─── File Node ────────────────────────────────────────────────────────────────

type SerializedFileNode = SerializedLexicalNode & {
  name: string;
  size: number;
  dataUrl: string;
};

class FileNode extends DecoratorNode<ReactNode> {
  __name: string;
  __size: number;
  __dataUrl: string;

  static getType(): string { return 'file'; }
  static clone(node: FileNode): FileNode { return new FileNode(node.__name, node.__size, node.__dataUrl, node.__key); }
  static importJSON(s: SerializedFileNode): FileNode { return new FileNode(s.name, s.size, s.dataUrl ?? ''); }

  constructor(name: string, size: number, dataUrl: string, key?: NodeKey) {
    super(key);
    this.__name = name;
    this.__size = size;
    this.__dataUrl = dataUrl;
  }

  exportJSON(): SerializedFileNode {
    return { type: 'file', version: 1, name: this.__name, size: this.__size, dataUrl: this.__dataUrl };
  }

  isInline(): boolean { return false; }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.style.display = 'contents';
    return div;
  }

  updateDOM(): false { return false; }

  decorate(): ReactNode {
    const { __name, __size, __dataUrl } = this;
    const sizeLabel =
      __size < 1024 * 1024
        ? `${Math.round(__size / 1024)}kb`
        : `${(__size / 1024 / 1024).toFixed(1)}mb`;

    return (
      <div
        contentEditable={false}
        className="nodrag nowheel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid rgb(var(--border))',
          background: 'rgb(var(--surface))',
          margin: '6px 0',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => {
          if (!__dataUrl) return;
          const a = document.createElement('a');
          a.href = __dataUrl;
          a.download = __name;
          a.click();
        }}
      >
        <svg width="15" height="18" viewBox="0 0 15 18" fill="none">
          <path
            d="M9 1H2C1.46957 1 0.960859 1.21071 0.585786 1.58579C0.210714 1.96086 0 2.46957 0 3V15C0 15.5304 0.210714 16.0391 0.585786 16.4142C0.960859 16.7893 1.46957 17 2 17H13C13.5304 17 14.0391 16.7893 14.4142 16.4142C14.7893 16.0391 15 15.5304 15 15V7L9 1Z"
            fill="rgb(var(--surface))"
            stroke="rgb(var(--ds-gray-700))"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path d="M9 1V7H15" stroke="rgb(var(--ds-gray-700))" strokeWidth="1" strokeLinejoin="round" />
        </svg>
        <span
          style={{
            flex: 1,
            fontSize: 14,
            color: 'rgb(var(--foreground))',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {__name}
        </span>
        <span style={{ fontSize: 13, color: 'rgb(var(--muted))', flexShrink: 0 }}>{sizeLabel}</span>
      </div>
    );
  }
}

// ─── Editor Theme ─────────────────────────────────────────────────────────────

const EDITOR_THEME = {
  heading: { h1: 'ne-h1', h2: 'ne-h2', h3: 'ne-h3' },
  list: {
    ul: 'ne-ul',
    ol: 'ne-ol',
    listitem: 'ne-li',
    listitemChecked: 'ne-li-checked',
    listitemUnchecked: 'ne-li-unchecked',
    nested: { listitem: 'ne-nested-li' },
  },
  quote: 'ne-quote',
  code: 'ne-code-block',
  table: 'ne-table',
  tableCell: 'ne-table-cell',
  tableCellHeader: 'ne-table-cell-header',
  text: {
    bold: 'ne-bold',
    italic: 'ne-italic',
    underline: 'ne-underline',
    strikethrough: 'ne-strike',
    underlineStrikethrough: 'ne-underline ne-strike',
    code: 'ne-inline-code',
  },
  link: 'ne-link',
};

const REGISTERED_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  CodeHighlightNode,
  LinkNode,
  AutoLinkNode,
  ImageNode,
  FileNode,
  TableNode,
  TableRowNode,
  TableCellNode,
];

// ─── Block type metadata ──────────────────────────────────────────────────────

// shortcut: 노션과 동일한 조합(⌘⌥N) — 노션에 대응 단축키가 없는 항목(텍스트/인용)은 undefined
const BLOCK_OPTIONS = [
  { label: '텍스트', value: 'paragraph' as BlockType, icon: 'T', shortcut: undefined as string | undefined },
  { label: '제목 1', value: 'h1' as BlockType, icon: 'H1', shortcut: '⌘⌥1' },
  { label: '제목 2', value: 'h2' as BlockType, icon: 'H2', shortcut: '⌘⌥2' },
  { label: '제목 3', value: 'h3' as BlockType, icon: 'H3', shortcut: '⌘⌥3' },
  { label: '인용', value: 'quote' as BlockType, icon: '❝', shortcut: undefined as string | undefined },
  { label: '코드', value: 'code' as BlockType, icon: '</>', shortcut: '⌘⌥8' },
  { label: '글머리 목록', value: 'bullet' as BlockType, icon: '•', shortcut: '⌘⌥5' },
  { label: '번호 목록', value: 'number' as BlockType, icon: '1.', shortcut: '⌘⌥6' },
  { label: '체크리스트', value: 'check' as BlockType, icon: '☑', shortcut: '⌘⌥4' },
] as const;

// 알파벳/문자 단축키는 event.key, 숫자(Option 조합 시 문자가 바뀌는 키보드 레이아웃 대비)는
// event.code로 매칭 — 노션과 동일 조합
const BLOCK_SHORTCUT_CODES: Partial<Record<string, BlockType>> = {
  Digit1: 'h1',
  Digit2: 'h2',
  Digit3: 'h3',
  Digit4: 'check',
  Digit5: 'bullet',
  Digit6: 'number',
  Digit8: 'code',
};

// ─── Shared block/insert actions (토글바 + 슬래시 메뉴 공용) ──────────────────

function applyBlockType(editor: LexicalEditor, type: BlockType, isActive: boolean) {
  if (type === 'bullet' || type === 'number' || type === 'check') {
    const insertCommand =
      type === 'bullet'
        ? INSERT_UNORDERED_LIST_COMMAND
        : type === 'number'
          ? INSERT_ORDERED_LIST_COMMAND
          : INSERT_CHECK_LIST_COMMAND;
    editor.dispatchCommand(isActive ? REMOVE_LIST_COMMAND : insertCommand, undefined);
    return;
  }

  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    if (type === 'paragraph') {
      $setBlocksType(selection, () => $createParagraphNode());
    } else if (type === 'h1' || type === 'h2' || type === 'h3') {
      $setBlocksType(selection, () => $createHeadingNode(type));
    } else if (type === 'quote') {
      $setBlocksType(selection, () => $createQuoteNode());
    } else if (type === 'code') {
      $setBlocksType(selection, () => $createCodeNode());
    }
  });
}

// ToolbarPlugin의 updateToolbar와 동일한 판별 로직 — 키보드 단축키·슬래시 메뉴처럼
// blockType React state가 없는 곳에서도 editor.getEditorState().read() 안에서 호출해
// applyBlockType에 정확한 isActive를 넘기기 위함
function getBlockTypeFromSelection(): BlockType | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;

  const anchorNode = selection.anchor.getNode();
  const element =
    anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow();

  if ($isListNode(element)) {
    const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
    const listType = parentList?.getListType() ?? element.getListType();
    return listType === 'bullet' ? 'bullet' : listType === 'check' ? 'check' : 'number';
  }
  if ($isHeadingNode(element)) return element.getTag() as BlockType;
  if ($isQuoteNode(element)) return 'quote';
  if ($isCodeNode(element)) return 'code';
  return 'paragraph';
}

const MAX_TABLE_DIMENSION = 20; // ponytail: 큰 표는 동기 삽입 시 에디터가 멈출 수 있어 상한선을 둠

function insertTable(editor: LexicalEditor) {
  const rowsInput = window.prompt('행 개수', '3');
  if (rowsInput === null) return;
  const colsInput = window.prompt('열 개수', '3');
  if (colsInput === null) return;

  const rows = Math.min(MAX_TABLE_DIMENSION, Math.max(1, parseInt(rowsInput, 10) || 3));
  const columns = Math.min(MAX_TABLE_DIMENSION, Math.max(1, parseInt(colsInput, 10) || 3));

  // window.prompt()가 뜨는 동안 contentEditable이 blur되어 선택 영역이 끊긴다 —
  // dispatch 전에 focus()로 에디터 선택을 복원해야 삽입이 실제로 반영된다.
  editor.focus(() => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, { rows: String(rows), columns: String(columns) });
  });
}

// ─── Media helpers ────────────────────────────────────────────────────────────

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

// ─── Media Plugin ─────────────────────────────────────────────────────────────

function MediaPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        INSERT_IMAGE_COMMAND,
        ({ src, caption = '' }) => {
          editor.update(() => {
            $insertNodes([new ImageNode(src, caption)]);
          });
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        INSERT_FILE_COMMAND,
        ({ name, size, dataUrl }) => {
          editor.update(() => {
            $insertNodes([new FileNode(name, size, dataUrl)]);
          });
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor]);

  return null;
}

// ─── Drag Drop Plugin ─────────────────────────────────────────────────────────

function DragDropPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handleDragOver = (e: Event) => {
      const de = e as DragEvent;
      if (de.dataTransfer?.types.includes('Files')) {
        de.preventDefault();
        if (de.dataTransfer) de.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = async (e: Event) => {
      const de = e as DragEvent;
      const file = de.dataTransfer?.files[0];
      if (!file) return;
      de.preventDefault();
      de.stopPropagation();
      const dataUrl = await readFileAsDataUrl(file);
      if (file.type.startsWith('image/')) {
        editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src: dataUrl });
      } else {
        editor.dispatchCommand(INSERT_FILE_COMMAND, { name: file.name, size: file.size, dataUrl });
      }
    };

    return editor.registerRootListener((root, prev) => {
      prev?.removeEventListener('dragover', handleDragOver);
      prev?.removeEventListener('drop', handleDrop);
      root?.addEventListener('dragover', handleDragOver);
      root?.addEventListener('drop', handleDrop);
    });
  }, [editor]);

  return null;
}

// ─── Keyboard Shortcuts Plugin (노션과 동일 조합) ──────────────────────────────

function EditorShortcutsPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        const mod = event.metaKey || event.ctrlKey;
        if (!mod) return false;

        if (event.altKey) {
          const type = BLOCK_SHORTCUT_CODES[event.code];
          if (!type) return false;
          event.preventDefault();
          const isActive = editor.getEditorState().read(() => getBlockTypeFromSelection() === type);
          applyBlockType(editor, type, isActive);
          return true;
        }

        if (!event.shiftKey && event.key.toLowerCase() === 'e') {
          event.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
          return true;
        }

        if (event.shiftKey && event.key.toLowerCase() === 's') {
          event.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_NORMAL,
    );
  }, [editor]);

  return null;
}

// ─── Toolbar Plugin ───────────────────────────────────────────────────────────

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [blockType, setBlockType] = useState<BlockType>('paragraph');
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    setIsBold(selection.hasFormat('bold'));
    setIsItalic(selection.hasFormat('italic'));
    setIsUnderline(selection.hasFormat('underline'));
    setIsStrikethrough(selection.hasFormat('strikethrough'));
    setIsCode(selection.hasFormat('code'));

    const anchorNode = selection.anchor.getNode();
    const element =
      anchorNode.getKey() === 'root'
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();

    if ($isListNode(element)) {
      const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
      const listType = parentList?.getListType() ?? element.getListType();
      setBlockType(listType === 'bullet' ? 'bullet' : listType === 'check' ? 'check' : 'number');
    } else if ($isHeadingNode(element)) {
      setBlockType(element.getTag() as BlockType);
    } else if ($isQuoteNode(element)) {
      setBlockType('quote');
    } else if ($isCodeNode(element)) {
      setBlockType('code');
    } else {
      setBlockType('paragraph');
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(updateToolbar);
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, updateToolbar]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowBlockMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const dispatchFormat = (
    format: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code',
  ) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);

  const handleApplyBlockType = (type: BlockType) => {
    setShowBlockMenu(false);
    applyBlockType(editor, type, blockType === type);
  };

  const handleImageInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const src = await readFileAsDataUrl(file);
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src });
    e.target.value = '';
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    editor.dispatchCommand(INSERT_FILE_COMMAND, { name: file.name, size: file.size, dataUrl });
    e.target.value = '';
  };

  const currentLabel =
    BLOCK_OPTIONS.find((b) => b.value === blockType)?.label ?? '텍스트';

  return (
    <div
      className="nodrag nowheel flex items-center gap-0.5 px-2 py-1.5 shrink-0 select-none"
      style={{ borderBottom: '1px solid rgb(var(--border))' }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageInput} />
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileInput} />

      {/* ── Undo/Redo ── */}
      <Tooltip label="실행 취소" shortcut="⌘Z">
        <button
          type="button"
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
          className="flex items-center justify-center rounded cursor-pointer transition-colors"
          style={{ width: 26, height: 26, color: 'rgb(var(--muted))' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgb(var(--surface))'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3.5H8.5a3.5 3.5 0 010 7H5" />
            <path d="M3 1.2L1 3.5l2 2.3" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip label="다시 실행" shortcut="⌘⇧Z">
        <button
          type="button"
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
          className="flex items-center justify-center rounded cursor-pointer transition-colors"
          style={{ width: 26, height: 26, color: 'rgb(var(--muted))' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgb(var(--surface))'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'scaleX(-1)' }}>
            <path d="M3 3.5H8.5a3.5 3.5 0 010 7H5" />
            <path d="M3 1.2L1 3.5l2 2.3" />
          </svg>
        </button>
      </Tooltip>

      {/* ── Divider ── */}
      <div style={{ width: 1, height: 14, background: 'rgb(var(--border))', margin: '0 4px' }} />

      {/* ── Block type dropdown ── */}
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setShowBlockMenu((v) => !v)}
          className="flex items-center gap-1 px-2 h-6 rounded cursor-pointer transition-colors hover:bg-surface"
          style={{ fontSize: 12, color: 'rgb(var(--muted))', fontWeight: 500 }}
        >
          {currentLabel}
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M1.5 3L4 5.5L6.5 3" />
          </svg>
        </button>

        {showBlockMenu && (
          <div
            className="absolute top-full left-0 mt-0.5 bg-background rounded-lg py-1 z-[9999]"
            style={{
              border: '1px solid rgb(var(--border))',
              width: 190,
              boxShadow: '0 4px 16px rgba(0,0,0,0.09)',
            }}
          >
            {BLOCK_OPTIONS.map(({ label, value, icon, shortcut }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleApplyBlockType(value)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left cursor-pointer hover:bg-surface transition-colors"
                style={{ color: blockType === value ? 'rgb(var(--foreground))' : 'rgb(var(--muted))' }}
              >
                <span
                  className="shrink-0 flex items-center justify-center font-mono"
                  style={{ width: 18, fontSize: 11, color: 'rgb(var(--muted))' }}
                >
                  {icon}
                </span>
                <span
                  className="flex-1"
                  style={{
                    fontSize: 13,
                    fontWeight: blockType === value ? 600 : 400,
                  }}
                >
                  {label}
                </span>
                {shortcut && (
                  <span className="shrink-0" style={{ fontSize: 11, color: 'rgb(var(--muted))' }}>
                    {shortcut}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ width: 1, height: 14, background: 'rgb(var(--border))', margin: '0 4px' }} />

      {/* ── Text format buttons ── */}
      {(
        [
          { format: 'bold' as const, label: 'B', active: isBold, name: '굵게', shortcut: '⌘B', extraStyle: { fontWeight: 700 } },
          { format: 'italic' as const, label: 'I', active: isItalic, name: '기울임', shortcut: '⌘I', extraStyle: { fontStyle: 'italic' } },
          { format: 'underline' as const, label: 'U', active: isUnderline, name: '밑줄', shortcut: '⌘U', extraStyle: { textDecoration: 'underline' } },
          { format: 'strikethrough' as const, label: 'S', active: isStrikethrough, name: '취소선', shortcut: '⌘⇧S', extraStyle: { textDecoration: 'line-through' } },
          { format: 'code' as const, label: '<>', active: isCode, name: '인라인 코드', shortcut: '⌘E', extraStyle: { fontFamily: 'monospace', fontSize: 11 } },
        ] as const
      ).map(({ format, label, active, name, shortcut, extraStyle }) => (
        <Tooltip key={format} label={name} shortcut={shortcut}>
          <button
            type="button"
            onClick={() => dispatchFormat(format)}
            className="flex items-center justify-center rounded cursor-pointer transition-colors"
            style={{
              width: 26,
              height: 26,
              fontSize: 12,
              background: active ? 'rgb(var(--surface-hover))' : 'transparent',
              color: active ? 'rgb(var(--foreground))' : 'rgb(var(--muted))',
              ...extraStyle,
            }}
            onMouseEnter={(e) => {
              if (!active) (e.currentTarget as HTMLElement).style.background = 'rgb(var(--surface))';
            }}
            onMouseLeave={(e) => {
              if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            {label}
          </button>
        </Tooltip>
      ))}

      {/* ── Divider ── */}
      <div style={{ width: 1, height: 14, background: 'rgb(var(--border))', margin: '0 4px' }} />

      {/* ── Media buttons ── */}
      <Tooltip label="이미지 삽입">
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="flex items-center justify-center rounded cursor-pointer transition-colors"
          style={{ width: 26, height: 26, color: 'rgb(var(--muted))' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgb(var(--surface))'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="0.7" y="0.7" width="11.6" height="11.6" rx="1.5" />
            <circle cx="4" cy="4" r="1" fill="currentColor" stroke="none" />
            <path d="M0.7 8.5l2.8-2.8 2 2 2.5-3.2 4.3 5" />
          </svg>
        </button>
      </Tooltip>

      <Tooltip label="파일 첨부">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center rounded cursor-pointer transition-colors"
          style={{ width: 26, height: 26, color: 'rgb(var(--muted))' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgb(var(--surface))'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <svg width="11" height="13" viewBox="0 0 11 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 5.5L4.5 10.5a2.5 2.5 0 01-3.535-3.536L5.5 2.43a1.5 1.5 0 012.121 2.121L3.086 9.086a.5.5 0 01-.707-.707L7 3.76" />
          </svg>
        </button>
      </Tooltip>

      <Tooltip label="표 삽입">
        <button
          type="button"
          onClick={() => insertTable(editor)}
          className="flex items-center justify-center rounded cursor-pointer transition-colors"
          style={{ width: 26, height: 26, color: 'rgb(var(--muted))' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgb(var(--surface))'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
            <rect x="0.8" y="0.8" width="11.4" height="11.4" rx="1.2" />
            <path d="M0.8 4.5H12.2M0.8 8.5H12.2M4.5 0.8V12.2M8.5 0.8V12.2" />
          </svg>
        </button>
      </Tooltip>
    </div>
  );
}

// ─── Slash Command Plugin ─────────────────────────────────────────────────────

class SlashMenuOption extends MenuOption {
  title: string;
  glyph: string;
  kind: 'action' | 'image' | 'file';
  shortcut: string | undefined;
  onSelect: () => void;

  constructor(
    title: string,
    glyph: string,
    kind: 'action' | 'image' | 'file',
    onSelect: () => void,
    shortcut?: string,
  ) {
    super(title);
    this.title = title;
    this.glyph = glyph;
    this.kind = kind;
    this.onSelect = onSelect;
    this.shortcut = shortcut;
  }
}

function SlashCommandPlugin() {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', { minLength: 0 });

  useEffect(() => {
    return editor.registerCommand(
      SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND,
      ({ option }) => {
        option.ref?.current?.scrollIntoView({ block: 'nearest' });
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  // 이미지/파일은 ref.current.click()이 필요한데, react-hooks/refs가 옵션 배열 생성
  // 시점(렌더 중)의 ref 접근을 막는다 — kind만 담아두고 실제 클릭은 onSelectOption
  // 핸들러(렌더 이후 실행)에서 수행한다.
  //
  // useMemo로 인스턴스를 고정하는 이유(성능이 아니라 정확성): SlashMenuOption마다
  // Lexical이 채워주는 .ref가 실제 DOM 노드를 가리켜야 자동 스크롤(SCROLL_TYPEAHEAD_
  // OPTION_INTO_VIEW_COMMAND)이 방금 하이라이트된 옵션으로 정확히 스크롤된다. 메모 없이
  // 매 렌더 새 인스턴스를 만들면 그 사이 옵션의 .ref가 null로 리셋되는 순간이 생겨,
  // 자동 스크롤이 하이라이트보다 한 박자 늦게(엉뚱한 위치로) 움직이는 것처럼 보였다.
  const allOptions = useMemo(
    () => [
      ...BLOCK_OPTIONS.map(
        ({ label, value, icon, shortcut }) =>
          new SlashMenuOption(
            label,
            icon,
            'action',
            () => {
              const isActive = editor.getEditorState().read(() => getBlockTypeFromSelection() === value);
              applyBlockType(editor, value, isActive);
            },
            shortcut,
          ),
      ),
      new SlashMenuOption('표', '⊞', 'action', () => insertTable(editor)),
      new SlashMenuOption('이미지', '🖼', 'image', () => {}),
      new SlashMenuOption('파일', '📎', 'file', () => {}),
    ],
    [editor],
  );

  const options = queryString
    ? allOptions.filter((option) => option.title.toLowerCase().includes(queryString.toLowerCase()))
    : allOptions;

  const handleImageInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const src = await readFileAsDataUrl(file);
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src });
    e.target.value = '';
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    editor.dispatchCommand(INSERT_FILE_COMMAND, { name: file.name, size: file.size, dataUrl });
    e.target.value = '';
  };

  return (
    <>
      <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageInput} />
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileInput} />
      <LexicalTypeaheadMenuPlugin<SlashMenuOption>
        onQueryChange={setQueryString}
        onSelectOption={(option, textNodeContainingQuery, closeMenu) => {
          editor.update(() => {
            textNodeContainingQuery?.remove();
          });
          if (option.kind === 'image') imageInputRef.current?.click();
          else if (option.kind === 'file') fileInputRef.current?.click();
          else option.onSelect();
          closeMenu();
        }}
        triggerFn={checkForTriggerMatch}
        options={options}
        menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) =>
          anchorElementRef.current && options.length > 0
            ? createPortal(
                <div
                  className="nodrag nowheel"
                  style={{
                    background: 'rgb(var(--background))',
                    border: '1px solid rgb(var(--border))',
                    borderRadius: 8,
                    padding: '4px 0',
                    width: 210,
                    maxHeight: 280,
                    overflowY: 'auto',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.09)',
                    zIndex: 9999,
                  }}
                >
                  {options.map((option, index) => (
                    <div
                      key={option.key}
                      ref={option.setRefElement}
                      className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer"
                      style={{ background: selectedIndex === index ? 'rgb(var(--surface))' : 'transparent' }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => selectOptionAndCleanUp(option)}
                    >
                      <span
                        className="shrink-0 flex items-center justify-center font-mono"
                        style={{ width: 18, fontSize: 12, color: 'rgb(var(--muted))' }}
                      >
                        {option.glyph}
                      </span>
                      <span className="flex-1" style={{ fontSize: 13, color: 'rgb(var(--foreground))' }}>{option.title}</span>
                      {option.shortcut && (
                        <span className="shrink-0" style={{ fontSize: 11, color: 'rgb(var(--muted))' }}>
                          {option.shortcut}
                        </span>
                      )}
                    </div>
                  ))}
                </div>,
                anchorElementRef.current,
              )
            : null
        }
      />
    </>
  );
}

// ─── Title Tracker Plugin ─────────────────────────────────────────────────────

function ContentExportPlugin({
  onChange,
}: {
  onChange: (content: { markdownBody: string; jsonBody: string }) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        editorState.read(() => {
          const markdownBody = $convertToMarkdownString(TRANSFORMERS);
          const jsonBody = JSON.stringify(editorState.toJSON());
          onChange({ markdownBody, jsonBody });
        });
      }, 500);
    });
  }, [editor, onChange]);

  return null;
}

function TitleTrackerPlugin({
  onChange,
}: {
  onChange: (text: string) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const prevTitleRef = useRef<string | null>('');

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const firstChild = $getRoot().getFirstChild();
        const title = firstChild ? firstChild.getTextContent().trim() : '';
        if (title !== prevTitleRef.current) {
          prevTitleRef.current = title;
          onChange(title);
        }
      });
    });
  }, [editor, onChange]);

  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NotionEditor({
  nodeId,
  collabProvider,
  username,
  cursorColor,
  onFirstLineChange,
  onContentChange,
  toolbarSlot,
  noMediaDrop = false,
  autoGrow = false,
  minHeight,
  extraBottomPadding = false,
}: NotionEditorProps) {
  // provider의 'sync' 이벤트에서 동기화 여부를 직접 구독 — on()이 등록 즉시
  // 현재 상태를 replay하므로 늦게 마운트돼도 값이 맞는다 (prop 중계 불필요)
  // provider null이면 렌더 시 파생값으로 false 처리 — effect 본문 동기 setState 금지(lint error)
  const [providerSynced, setProviderSynced] = useState(false);
  useEffect(() => {
    if (!collabProvider) return;
    const onSync = (synced: unknown) => setProviderSynced(synced as boolean);
    collabProvider.on('sync', onSync);
    return () => collabProvider.off('sync', onSync);
  }, [collabProvider]);
  const isSynced = collabProvider ? providerSynced : false;

  const initialConfig = {
    namespace: `ne-${nodeId}`,
    theme: EDITOR_THEME,
    nodes: REGISTERED_NODES,
    onError: (error: Error) => console.error('[NotionEditor]', error),
    editorState: null,
  };

  const providerFactory = useCallback(
    (id: string, yjsDocMap: Map<string, Y.Doc>) => {
      if (!collabProvider) return null as never;
      yjsDocMap.set(id, collabProvider.doc);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return collabProvider as any;
    },
    [collabProvider],
  );

  return (
    <div className={autoGrow ? 'flex flex-col bg-background rounded-b-lg' : 'flex flex-col flex-1 min-h-0 bg-background rounded-b-lg'}>
      <LexicalCollaboration>
        <LexicalComposer initialConfig={initialConfig}>
          {toolbarSlot}

          <div
            className={autoGrow ? 'relative' : 'relative flex-1 min-h-0 overflow-y-auto scrollbar-hide'}
            style={autoGrow ? { minHeight: minHeight ?? 80 } : undefined}
          >
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className={`ne-root nodrag nowheel px-4 pt-3 ${extraBottomPadding ? 'pb-32' : 'pb-3'}`}
                  spellCheck
                />
              }
              placeholder={
                <div
                  className="absolute top-3 left-4 pointer-events-none select-none"
                  style={{ color: 'rgb(var(--muted))', fontSize: 14 }}
                >
                  {isSynced ? '노트를 작성하세요…' : '로딩 중…'}
                  <br />
                  <span className="ml-1" style={{ color: 'rgb(var(--muted))' }}>
                    (마크다운 단축키 지원, &apos;/&apos;로 메뉴 열기)
                  </span>
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>

          <TablePlugin />
          <ListPlugin />
          <CheckListPlugin />
          <LinkPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <MarkdownPastePlugin />
          <MediaPlugin />
          <SlashCommandPlugin />
          <EditorShortcutsPlugin />
          {!noMediaDrop && <DragDropPlugin />}

          {onFirstLineChange && (
            <TitleTrackerPlugin onChange={onFirstLineChange} />
          )}
          {onContentChange && (
            <ContentExportPlugin onChange={onContentChange} />
          )}

          {collabProvider ? (
            <CollaborationPlugin
              id={`yjs-${nodeId}`}
              providerFactory={providerFactory}
              shouldBootstrap={false}
              username={username}
              cursorColor={cursorColor}
            />
          ) : (
            // collabProvider 없을 땐 undo/redo 핸들러가 CollaborationPlugin 대신 필요하다
            <HistoryPlugin />
          )}
        </LexicalComposer>
      </LexicalCollaboration>
    </div>
  );
}
