'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $getNodeByKey,
  $insertNodes,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  $createParagraphNode,
  COMMAND_PRIORITY_LOW,
  DecoratorNode,
  createCommand,
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
import { TableNode, TableRowNode, TableCellNode } from '@lexical/table';
import { TRANSFORMERS, $convertToMarkdownString } from '@lexical/markdown';
import { MarkdownPastePlugin } from './plugins/MarkdownPastePlugin';
import { $setBlocksType } from '@lexical/selection';
import { $getNearestNodeOfType, mergeRegister } from '@lexical/utils';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { LexicalCollaboration } from '@lexical/react/LexicalCollaborationContext';
import * as Y from 'yjs';
import type { SocketIoYjsProvider } from '@/lib/SocketIoYjsProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'quote'
  | 'code'
  | 'bullet'
  | 'number';

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
        color: '#999',
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
          border: '1px solid #EBEBEB',
          background: '#FAFAFA',
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
            fill="#F0F0F0"
            stroke="#CCCCCC"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path d="M9 1V7H15" stroke="#CCCCCC" strokeWidth="1" strokeLinejoin="round" />
        </svg>
        <span
          style={{
            flex: 1,
            fontSize: 14,
            color: '#333',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {__name}
        </span>
        <span style={{ fontSize: 13, color: '#AAA', flexShrink: 0 }}>{sizeLabel}</span>
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

const BLOCK_OPTIONS = [
  { label: '텍스트', value: 'paragraph' as BlockType, icon: 'T' },
  { label: '제목 1', value: 'h1' as BlockType, icon: 'H1' },
  { label: '제목 2', value: 'h2' as BlockType, icon: 'H2' },
  { label: '제목 3', value: 'h3' as BlockType, icon: 'H3' },
  { label: '인용', value: 'quote' as BlockType, icon: '❝' },
  { label: '코드', value: 'code' as BlockType, icon: '</>' },
  { label: '글머리 목록', value: 'bullet' as BlockType, icon: '•' },
  { label: '번호 목록', value: 'number' as BlockType, icon: '1.' },
] as const;

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
      setBlockType(listType === 'bullet' ? 'bullet' : 'number');
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

  const applyBlockType = (type: BlockType) => {
    setShowBlockMenu(false);

    if (type === 'bullet') {
      editor.dispatchCommand(
        blockType === 'bullet' ? REMOVE_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND,
        undefined,
      );
      return;
    }

    if (type === 'number') {
      editor.dispatchCommand(
        blockType === 'number' ? REMOVE_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
        undefined,
      );
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
      style={{ borderBottom: '1px solid #EBEBEB' }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageInput} />
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileInput} />

      {/* ── Block type dropdown ── */}
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setShowBlockMenu((v) => !v)}
          className="flex items-center gap-1 px-2 h-6 rounded cursor-pointer transition-colors hover:bg-[#F3F3F3]"
          style={{ fontSize: 12, color: '#555', fontWeight: 500 }}
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
            className="absolute top-full left-0 mt-0.5 bg-white rounded-lg py-1 z-[9999]"
            style={{
              border: '1px solid #E8E8E8',
              width: 160,
              boxShadow: '0 4px 16px rgba(0,0,0,0.09)',
            }}
          >
            {BLOCK_OPTIONS.map(({ label, value, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => applyBlockType(value)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left cursor-pointer hover:bg-[#F5F5F5] transition-colors"
                style={{ color: blockType === value ? '#111' : '#555' }}
              >
                <span
                  className="shrink-0 flex items-center justify-center font-mono"
                  style={{ width: 18, fontSize: 11, color: '#AAA' }}
                >
                  {icon}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: blockType === value ? 600 : 400,
                  }}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ width: 1, height: 14, background: '#E0E0E0', margin: '0 4px' }} />

      {/* ── Text format buttons ── */}
      {(
        [
          { format: 'bold' as const, label: 'B', active: isBold, title: '굵게 ⌘B', extraStyle: { fontWeight: 700 } },
          { format: 'italic' as const, label: 'I', active: isItalic, title: '기울임 ⌘I', extraStyle: { fontStyle: 'italic' } },
          { format: 'underline' as const, label: 'U', active: isUnderline, title: '밑줄 ⌘U', extraStyle: { textDecoration: 'underline' } },
          { format: 'strikethrough' as const, label: 'S', active: isStrikethrough, title: '취소선', extraStyle: { textDecoration: 'line-through' } },
          { format: 'code' as const, label: '<>', active: isCode, title: '인라인 코드', extraStyle: { fontFamily: 'monospace', fontSize: 11 } },
        ] as const
      ).map(({ format, label, active, title, extraStyle }) => (
        <button
          key={format}
          type="button"
          title={title}
          onClick={() => dispatchFormat(format)}
          className="flex items-center justify-center rounded cursor-pointer transition-colors"
          style={{
            width: 26,
            height: 26,
            fontSize: 12,
            background: active ? '#E8E8E8' : 'transparent',
            color: active ? '#1A1A1A' : '#AAAAAA',
            ...extraStyle,
          }}
          onMouseEnter={(e) => {
            if (!active) (e.currentTarget as HTMLElement).style.background = '#F3F3F3';
          }}
          onMouseLeave={(e) => {
            if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          {label}
        </button>
      ))}

      {/* ── Divider ── */}
      <div style={{ width: 1, height: 14, background: '#E0E0E0', margin: '0 4px' }} />

      {/* ── Media buttons ── */}
      <button
        type="button"
        title="이미지 삽입"
        onClick={() => imageInputRef.current?.click()}
        className="flex items-center justify-center rounded cursor-pointer transition-colors"
        style={{ width: 26, height: 26, color: '#AAAAAA' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F3F3F3'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="0.7" y="0.7" width="11.6" height="11.6" rx="1.5" />
          <circle cx="4" cy="4" r="1" fill="currentColor" stroke="none" />
          <path d="M0.7 8.5l2.8-2.8 2 2 2.5-3.2 4.3 5" />
        </svg>
      </button>

      <button
        type="button"
        title="파일 첨부"
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center justify-center rounded cursor-pointer transition-colors"
        style={{ width: 26, height: 26, color: '#AAAAAA' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F3F3F3'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <svg width="11" height="13" viewBox="0 0 11 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.5 5.5L4.5 10.5a2.5 2.5 0 01-3.535-3.536L5.5 2.43a1.5 1.5 0 012.121 2.121L3.086 9.086a.5.5 0 01-.707-.707L7 3.76" />
        </svg>
      </button>
    </div>
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
    <div className={autoGrow ? 'flex flex-col bg-white rounded-b-lg' : 'flex flex-col flex-1 min-h-0 bg-white rounded-b-lg'}>
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
                  className="ne-root nodrag nowheel px-4 py-3"
                  spellCheck
                />
              }
              placeholder={
                <div
                  className="absolute top-3 left-4 pointer-events-none select-none"
                  style={{ color: '#C4C4C4', fontSize: 14 }}
                >
                  {isSynced ? '노트를 작성하세요…' : '로딩 중…'}
                  <span className="ml-1" style={{ color: '#D5D5D5' }}>
                    (마크다운 단축키 지원)
                  </span>
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>

          <TablePlugin />
          <ListPlugin />
          <CheckListPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <MarkdownPastePlugin />
          <MediaPlugin />
          {!noMediaDrop && <DragDropPlugin />}

          {onFirstLineChange && (
            <TitleTrackerPlugin onChange={onFirstLineChange} />
          )}
          {onContentChange && (
            <ContentExportPlugin onChange={onContentChange} />
          )}

          {collabProvider && (
            <CollaborationPlugin
              id={`yjs-${nodeId}`}
              providerFactory={providerFactory}
              shouldBootstrap={false}
              username={username}
              cursorColor={cursorColor}
            />
          )}
        </LexicalComposer>
      </LexicalCollaboration>
    </div>
  );
}
