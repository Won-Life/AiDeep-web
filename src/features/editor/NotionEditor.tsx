"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  $createParagraphNode,
  COMMAND_PRIORITY_LOW,
  DecoratorNode,
  type EditorState,
  type NodeKey,
  type SerializedLexicalNode,
} from "lexical";
import {
  HeadingNode,
  QuoteNode,
  $createHeadingNode,
  $isHeadingNode,
  $createQuoteNode,
  $isQuoteNode,
} from "@lexical/rich-text";
import {
  ListNode,
  ListItemNode,
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import {
  CodeNode,
  CodeHighlightNode,
  $createCodeNode,
  $isCodeNode,
} from "@lexical/code";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { TRANSFORMERS, $convertToMarkdownString } from "@lexical/markdown";
import { $setBlocksType } from "@lexical/selection";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "quote"
  | "code"
  | "bullet"
  | "number";

export interface NotionEditorProps {
  nodeId: string;
  initialContent?: string;
  onSave?: (nodeId: string, jsonBody: string, markdownBody: string) => void;
}

// ─── Image Node ───────────────────────────────────────────────────────────────

type SerializedImageNode = SerializedLexicalNode & {
  src: string;
  alt: string;
};

class ImageNode extends DecoratorNode<ReactNode> {
  __src: string;
  __alt: string;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__alt, node.__key);
  }

  static importJSON(serialized: SerializedImageNode): ImageNode {
    return new ImageNode(serialized.src, serialized.alt);
  }

  constructor(src: string, alt = "", key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__alt = alt;
  }

  exportJSON(): SerializedImageNode {
    return { type: "image", version: 1, src: this.__src, alt: this.__alt };
  }

  isInline(): boolean {
    return false;
  }

  createDOM(): HTMLElement {
    const div = document.createElement("div");
    div.style.display = "contents";
    return div;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): ReactNode {
    return (
      <img
        src={this.__src}
        alt={this.__alt}
        draggable={false}
        style={{
          maxWidth: "100%",
          borderRadius: 6,
          margin: "6px 0",
          display: "block",
        }}
      />
    );
  }
}

// ─── Mock Initial State ───────────────────────────────────────────────────────

const MOCK_INITIAL_STATE = JSON.stringify({
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: "🌌 야경",
            type: "text",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        tag: "h2",
        type: "heading",
        version: 1,
      },
      {
        type: "image",
        version: 1,
        src: "https://littledeep.com/wp-content/uploads/2019/04/littledeep_nightsky_sns.png",
        alt: "Night sky",
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: "아름다운 밤하늘 사진입니다.",
            type: "text",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
    ],
    direction: "ltr",
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
});

// ─── Debug Panel Plugin ───────────────────────────────────────────────────────

function DebugPanel() {
  const [editor] = useLexicalComposerContext();
  const [json, setJson] = useState<string>("");

  useEffect(() => {
    // Capture initial state
    editor.getEditorState().read(() => {
      setJson(JSON.stringify(editor.getEditorState().toJSON(), null, 2));
    });

    return editor.registerUpdateListener(({ editorState }) => {
      setJson(JSON.stringify(editorState.toJSON(), null, 2));
    });
  }, [editor]);

  return (
    <div
      className="nodrag nowheel shrink-0 overflow-y-auto"
      style={{
        borderTop: "1px solid #EBEBEB",
        maxHeight: 200,
        background: "#FAFAFA",
      }}
    >
      <div
        style={{
          padding: "4px 8px 2px",
          fontSize: 9,
          color: "#AAA",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        Editor State JSON
      </div>
      <pre
        style={{
          margin: 0,
          padding: "0 10px 10px",
          fontSize: 10,
          lineHeight: 1.6,
          color: "#555",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {json}
      </pre>
    </div>
  );
}

// ─── Editor Theme ─────────────────────────────────────────────────────────────
// Class names are defined in globals.css under @layer components

const EDITOR_THEME = {
  heading: { h1: "ne-h1", h2: "ne-h2", h3: "ne-h3" },
  list: {
    ul: "ne-ul",
    ol: "ne-ol",
    listitem: "ne-li",
    nested: { listitem: "ne-nested-li" },
  },
  quote: "ne-quote",
  code: "ne-code-block",
  text: {
    bold: "ne-bold",
    italic: "ne-italic",
    underline: "ne-underline",
    strikethrough: "ne-strike",
    underlineStrikethrough: "ne-underline ne-strike",
    code: "ne-inline-code",
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
];

// ─── Block type metadata ──────────────────────────────────────────────────────

const BLOCK_OPTIONS = [
  { label: "텍스트", value: "paragraph" as BlockType, icon: "T" },
  { label: "제목 1", value: "h1" as BlockType, icon: "H1" },
  { label: "제목 2", value: "h2" as BlockType, icon: "H2" },
  { label: "제목 3", value: "h3" as BlockType, icon: "H3" },
  { label: "인용", value: "quote" as BlockType, icon: "❝" },
  { label: "코드", value: "code" as BlockType, icon: "</>" },
  { label: "글머리 목록", value: "bullet" as BlockType, icon: "•" },
  { label: "번호 목록", value: "number" as BlockType, icon: "1." },
] as const;

// ─── Toolbar Plugin ───────────────────────────────────────────────────────────

function ToolbarPlugin({
  showDebug,
  onDebugToggle,
}: {
  showDebug: boolean;
  onDebugToggle: () => void;
}) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [blockType, setBlockType] = useState<BlockType>("paragraph");
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    setIsBold(selection.hasFormat("bold"));
    setIsItalic(selection.hasFormat("italic"));
    setIsUnderline(selection.hasFormat("underline"));
    setIsStrikethrough(selection.hasFormat("strikethrough"));
    setIsCode(selection.hasFormat("code"));

    const anchorNode = selection.anchor.getNode();
    const element =
      anchorNode.getKey() === "root"
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();

    if ($isListNode(element)) {
      const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
      const listType = parentList?.getListType() ?? element.getListType();
      setBlockType(listType === "bullet" ? "bullet" : "number");
    } else if ($isHeadingNode(element)) {
      setBlockType(element.getTag() as BlockType);
    } else if ($isQuoteNode(element)) {
      setBlockType("quote");
    } else if ($isCodeNode(element)) {
      setBlockType("code");
    } else {
      setBlockType("paragraph");
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

  // Close block menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowBlockMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const dispatchFormat = (
    format: "bold" | "italic" | "underline" | "strikethrough" | "code",
  ) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);

  const applyBlockType = (type: BlockType) => {
    setShowBlockMenu(false);

    if (type === "bullet") {
      editor.dispatchCommand(
        blockType === "bullet"
          ? REMOVE_LIST_COMMAND
          : INSERT_UNORDERED_LIST_COMMAND,
        undefined,
      );
      return;
    }

    if (type === "number") {
      editor.dispatchCommand(
        blockType === "number"
          ? REMOVE_LIST_COMMAND
          : INSERT_ORDERED_LIST_COMMAND,
        undefined,
      );
      return;
    }

    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      if (type === "paragraph") {
        $setBlocksType(selection, () => $createParagraphNode());
      } else if (type === "h1" || type === "h2" || type === "h3") {
        $setBlocksType(selection, () => $createHeadingNode(type));
      } else if (type === "quote") {
        $setBlocksType(selection, () => $createQuoteNode());
      } else if (type === "code") {
        $setBlocksType(selection, () => $createCodeNode());
      }
    });
  };

  const currentLabel =
    BLOCK_OPTIONS.find((b) => b.value === blockType)?.label ?? "텍스트";

  return (
    <div
      className="nodrag nowheel flex items-center gap-0.5 px-2 py-1.5 shrink-0 select-none"
      style={{ borderBottom: "1px solid #EBEBEB" }}
      onMouseDown={(e) => e.preventDefault()} // keep editor focus
    >
      {/* ── Block type dropdown ── */}
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setShowBlockMenu((v) => !v)}
          className="flex items-center gap-1 px-2 h-6 rounded cursor-pointer transition-colors hover:bg-[#F3F3F3]"
          style={{ fontSize: 11, color: "#555", fontWeight: 500 }}
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
              border: "1px solid #E8E8E8",
              width: 160,
              boxShadow: "0 4px 16px rgba(0,0,0,0.09)",
            }}
          >
            {BLOCK_OPTIONS.map(({ label, value, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => applyBlockType(value)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left cursor-pointer hover:bg-[#F5F5F5] transition-colors"
                style={{ color: blockType === value ? "#111" : "#555" }}
              >
                <span
                  className="shrink-0 flex items-center justify-center font-mono"
                  style={{ width: 18, fontSize: 10, color: "#AAA" }}
                >
                  {icon}
                </span>
                <span
                  style={{
                    fontSize: 12,
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
      <div
        style={{ width: 1, height: 14, background: "#E0E0E0", margin: "0 4px" }}
      />

      {/* ── Text format buttons ── */}
      {(
        [
          {
            format: "bold" as const,
            label: "B",
            active: isBold,
            title: "굵게 ⌘B",
            extraStyle: { fontWeight: 700 },
          },
          {
            format: "italic" as const,
            label: "I",
            active: isItalic,
            title: "기울임 ⌘I",
            extraStyle: { fontStyle: "italic" },
          },
          {
            format: "underline" as const,
            label: "U",
            active: isUnderline,
            title: "밑줄 ⌘U",
            extraStyle: { textDecoration: "underline" },
          },
          {
            format: "strikethrough" as const,
            label: "S",
            active: isStrikethrough,
            title: "취소선",
            extraStyle: { textDecoration: "line-through" },
          },
          {
            format: "code" as const,
            label: "<>",
            active: isCode,
            title: "인라인 코드",
            extraStyle: { fontFamily: "monospace", fontSize: 10 },
          },
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
            fontSize: 11,
            background: active ? "#E8E8E8" : "transparent",
            color: active ? "#1A1A1A" : "#AAAAAA",
            ...extraStyle,
          }}
          onMouseEnter={(e) => {
            if (!active)
              (e.currentTarget as HTMLElement).style.background = "#F3F3F3";
          }}
          onMouseLeave={(e) => {
            if (!active)
              (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          {label}
        </button>
      ))}

      {/* ── Debug toggle ── */}
      <div style={{ marginLeft: "auto" }}>
        <button
          type="button"
          title="데이터 구조 보기"
          onClick={onDebugToggle}
          className="flex items-center justify-center rounded cursor-pointer transition-colors font-mono"
          style={{
            width: 26,
            height: 26,
            fontSize: 9,
            background: showDebug ? "#E8E8E8" : "transparent",
            color: showDebug ? "#1A1A1A" : "#CCCCCC",
          }}
          onMouseEnter={(e) => {
            if (!showDebug)
              (e.currentTarget as HTMLElement).style.background = "#F3F3F3";
          }}
          onMouseLeave={(e) => {
            if (!showDebug)
              (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          {"{}"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NotionEditor({
  nodeId,
  initialContent,
  onSave,
}: NotionEditorProps) {
  const [showDebug, setShowDebug] = useState(false);

  const initialConfig = {
    namespace: `ne-${nodeId}`,
    theme: EDITOR_THEME,
    nodes: REGISTERED_NODES,
    onError: (error: Error) => console.error("[NotionEditor]", error),
    editorState: initialContent ?? MOCK_INITIAL_STATE,
  };

  const handleChange = useCallback(
    (editorState: EditorState) => {
      const json = JSON.stringify(editorState.toJSON(), null, 2);
      let markdown = "";
      editorState.read(() => {
        markdown = $convertToMarkdownString(TRANSFORMERS);
      });
      onSave?.(nodeId, json, markdown);
    },
    [nodeId, onSave],
  );

  return (
    // flex-1 + min-h-0: flex child가 부모의 max-height 안에서 제대로 수축되도록 함
    <div className="flex flex-col flex-1 min-h-0 bg-white rounded-b-lg">
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin
          showDebug={showDebug}
          onDebugToggle={() => setShowDebug((v) => !v)}
        />

        {/* min-h-0: flex child가 컨텐츠 크기 이하로 수축 가능 → overflow-y-auto 작동 */}
        <div className="relative flex-1 min-h-0 overflow-y-auto">
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
                style={{ color: "#C4C4C4", fontSize: 13 }}
              >
                노트를 작성하세요…&nbsp;
                <span style={{ color: "#D5D5D5" }}>(마크다운 단축키 지원)</span>
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>

        {showDebug && <DebugPanel />}

        <HistoryPlugin />
        <ListPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
      </LexicalComposer>
    </div>
  );
}
