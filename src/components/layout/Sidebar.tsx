'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaceLayout } from '@/app/workspace/context';
import { useYjsProvider } from '@/hooks/useYjsProvider';
import { NodeEditorPanel } from '@/features/editor/NodeEditorPanel';
import { getCursorColor } from '@/utils/cursorColor';

export const SIDEBAR_WIDTH = 260;
export const VISIBLE_BUTTON_WIDTH = 40;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  isEditing?: boolean;
  isPersonal?: boolean; // 멤버 1명 == 개인 워크스페이스 → 자물쇠 표시
}

export interface ResourceSubItem {
  id: string;
  name: string;
  isEditing?: boolean;
}

export interface Resource {
  id: string;
  name: string;
  subItems: ResourceSubItem[];
  isEditing?: boolean;
}

// ─── ProjectList ──────────────────────────────────────────────────────────────

function ProjectList({
  projects,
  onSaveName,
  onStartEdit,
}: {
  projects: Project[];
  onSaveName: (id: string, name: string) => void;
  onStartEdit: (id: string) => void;
}) {
  return (
    <ul className="space-y-1">
      {projects.map((project) => (
        <li
          key={project.id}
          className="flex items-center gap-2.5 px-1 py-1 rounded-md"
        >
          <span
            className="shrink-0 rounded-sm"
            style={{
              width: 18,
              height: 18,
              background: 'rgb(var(--ds-gray-700))',
            }}
          />
          {project.isEditing ? (
            <input
              autoFocus
              placeholder="이름 입력..."
              defaultValue={project.name}
              className="sidebar-new-input bg-transparent border-none outline-none"
              style={{
                fontSize: 15,
                color: 'rgb(var(--foreground))',
                flex: 1,
                minWidth: 0,
              }}
              onBlur={(e) => onSaveName(project.id, e.target.value.trim())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
            />
          ) : (
            <span
              style={{
                fontSize: 15,
                color: 'rgb(var(--foreground))',
                cursor: 'text',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
              onClick={() => onStartEdit(project.id)}
            >
              {project.name || (
                <span style={{ color: 'rgb(var(--ds-gray-500))' }}>
                  이름 입력...
                </span>
              )}
            </span>
          )}
          {project.isPersonal && (
            <svg
              width={13}
              height={13}
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgb(var(--ds-gray-400))"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
        </li>
      ))}
    </ul>
  );
}

// ─── ResourceTree ─────────────────────────────────────────────────────────────

function ResourceTree({
  subItems,
  selectedSubItemId,
  onSelectSubItem,
  onSaveName,
  onStartEdit,
  collabProvider,
  userName,
  cursorColor,
  onContentChange,
  onDragStart,
  onExpandSubItem,
  selectedUpdatedAt,
}: {
  subItems: ResourceSubItem[];
  selectedSubItemId: string | null;
  onSelectSubItem: (id: string | null) => void;
  onSaveName: (id: string, name: string) => void;
  onStartEdit: (id: string) => void;
  collabProvider: import('@/lib/SocketIoYjsProvider').SocketIoYjsProvider | null;
  userName: string;
  cursorColor: string;
  onContentChange: (content: { markdownBody: string; jsonBody: string }) => void;
  onDragStart: (event: React.DragEvent<HTMLSpanElement>, item: ResourceSubItem) => void;
  onExpandSubItem: (id: string) => void;
  selectedUpdatedAt?: string;
}) {
  if (subItems.length === 0) return null;

  const ITEM_H = 38;
  const VX = 8;
  const R = 6;

  return (
    <div className="ml-3">
      {subItems.map((item, idx) => {
        const isLast = idx === subItems.length - 1;
        const isFirst = idx === 0;
        const topExtend = isFirst ? BRIDGE_H : 0;
        const isSelected = selectedSubItemId === item.id;

        return (
          <div key={item.id} style={{ position: 'relative' }}>
            {/* 수직 스파인: wrapper 높이(행 + 인라인 에디터)를 자동으로 채워
                에디터 오픈 시에도 선이 끊기지 않는다 */}
            {!isLast && (
              <div
                style={{
                  position: 'absolute',
                  left: VX,
                  top: isFirst ? -BRIDGE_H : 0,
                  bottom: 0,
                  width: 1,
                  background: 'rgb(var(--ds-black))',
                }}
              />
            )}

            <div
              className="flex items-center"
              style={{ height: ITEM_H }}
            >
              <div
                style={{
                  width: 20,
                  height: ITEM_H,
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                {isLast ? (
                  /* L커브: 스파인·수평선과 같은 CSS 프리미티브로 그려야
                     서브픽셀이 정확히 맞는다 (SVG stroke는 중심선 기준이라 0.5px 어긋남) */
                  <div
                    style={{
                      position: 'absolute',
                      left: VX,
                      right: 0,
                      top: -topExtend,
                      height: ITEM_H / 2 + 1 + topExtend,
                      borderLeft: '1px solid rgb(var(--ds-black))',
                      borderBottom: '1px solid rgb(var(--ds-black))',
                      borderBottomLeftRadius: R,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: 'absolute',
                      left: VX,
                      right: 0,
                      top: ITEM_H / 2,
                      height: 1,
                      background: 'rgb(var(--ds-black))',
                    }}
                  />
                )}
              </div>

              {item.isEditing ? (
                <input
                  autoFocus
                  placeholder="내용을 입력하세요"
                  defaultValue={item.name}
                  className="sidebar-new-input rounded-full px-3 py-1 border-none outline-none"
                  style={{
                    fontSize: 14,
                    background: 'rgb(var(--ds-gray-800))',
                    color: 'rgb(var(--foreground))',
                    width: '90%',
                    display: 'inline-block',
                  }}
                  onBlur={(e) => onSaveName(item.id, e.target.value.trim())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                />
              ) : (
                <span
                  className="rounded-full px-3 py-1"
                  draggable
                  style={{
                    fontSize: 14,
                    background: isSelected ? 'rgb(var(--foreground))' : 'rgb(var(--ds-gray-800))',
                    color: isSelected ? 'rgb(var(--background))' : 'rgb(var(--foreground))',
                    cursor: 'pointer',
                    maxWidth: '90%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'inline-block',
                  }}
                  onClick={() =>
                    onSelectSubItem(isSelected ? null : item.id)
                  }
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onSelectSubItem(null);
                    onStartEdit(item.id);
                  }}
                  onDragStart={(e) => onDragStart(e, item)}
                >
                  {item.name || (
                    <span style={{ color: 'rgb(var(--ds-gray-500))' }}>
                      내용을 입력하세요
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* 선택된 서브 아이템 아래 인라인 에디터.
                아래 간격은 margin이 아니라 padding이어야 함 — margin은 wrapper
                밖으로 빠져나가 스파인(top:0~bottom:0)이 그 구간을 못 덮는다 */}
            {isSelected && (
              <div style={{ marginLeft: 20, paddingBottom: 8 }}>
                <NodeEditorPanel
                  nodeId={item.id}
                  inline
                  collabProvider={collabProvider}
                  username={userName}
                  cursorColor={cursorColor}
                  onContentChange={onContentChange}
                  onExpandClick={() => onExpandSubItem(item.id)}
                  updatedAt={selectedUpdatedAt}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ResourceList ─────────────────────────────────────────────────────────────

const BRIDGE_H = 8; // 첫 번째 트리 아이템 수직선 위쪽 연장 길이

function ResourceList({
  resources,
  expanded,
  selectedSubItemId,
  onSelectSubItem,
  onToggleExpand,
  onAddSubItem,
  onSaveResourceName,
  onSaveSubItemName,
  onStartEditResource,
  onStartEditSubItem,
  collabProvider,
  userName,
  cursorColor,
  onContentChange,
  onSubItemDragStart,
  onExpandSubItem,
  selectedUpdatedAt,
}: {
  resources: Resource[];
  expanded: Set<string>;
  selectedSubItemId: string | null;
  onSelectSubItem: (id: string | null) => void;
  onToggleExpand: (id: string) => void;
  onAddSubItem: (resourceId: string) => void;
  onSaveResourceName: (id: string, name: string) => void;
  onSaveSubItemName: (
    resourceId: string,
    subItemId: string,
    name: string,
  ) => void;
  onStartEditResource: (id: string) => void;
  onStartEditSubItem: (resourceId: string, subItemId: string) => void;
  collabProvider: import('@/lib/SocketIoYjsProvider').SocketIoYjsProvider | null;
  userName: string;
  cursorColor: string;
  onContentChange: (content: { markdownBody: string; jsonBody: string }) => void;
  onSubItemDragStart: (event: React.DragEvent<HTMLSpanElement>, item: ResourceSubItem) => void;
  onExpandSubItem: (id: string) => void;
  selectedUpdatedAt?: string;
}) {
  return (
    <div className="space-y-3">
      {resources.map((resource) => {
        const isExpanded = expanded.has(resource.id);
        const hasSubItems = resource.subItems.length > 0;

        return (
          <div key={resource.id}>
            <div className="flex items-center gap-2">
              {/* Resource 토글 버튼 */}
              <button
                onClick={() =>
                  !resource.isEditing &&
                  hasSubItems &&
                  onToggleExpand(resource.id)
                }
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer"
                style={{
                  fontSize: 14,
                  color: 'rgb(var(--foreground))',
                  borderColor: 'rgb(var(--ds-black))',
                  background: 'transparent',
                  maxWidth: '90%',
                  minWidth: 0,
                  width: resource.isEditing ? '90%' : undefined,
                }}
              >
                {resource.isEditing ? (
                  <input
                    autoFocus
                    placeholder="이름 입력..."
                    defaultValue={resource.name}
                    className="sidebar-new-input bg-transparent border-none outline-none"
                    style={{
                      fontSize: 14,
                      color: 'rgb(var(--foreground))',
                      flex: 1,
                      minWidth: 0,
                    }}
                    onBlur={(e) =>
                      onSaveResourceName(resource.id, e.target.value.trim())
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                  />
                ) : (
                  <span
                    style={{
                      cursor: 'text',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartEditResource(resource.id);
                    }}
                  >
                    {resource.name || (
                      <span style={{ color: 'rgb(var(--ds-gray-500))' }}>
                        이름 입력...
                      </span>
                    )}
                  </span>
                )}
                {hasSubItems && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    style={{ flexShrink: 0 }}
                  >
                    {isExpanded ? (
                      <path d="M2 6.5L5 3.5L8 6.5" />
                    ) : (
                      <path d="M2 3.5L5 6.5L8 3.5" />
                    )}
                  </svg>
                )}
              </button>

              {/* Resource n 옆 + 버튼 (서브 아이템 추가) */}
              <button
                onClick={() => onAddSubItem(resource.id)}
                className="flex items-center justify-center cursor-pointer"
                style={{
                  fontSize: 19,
                  color: 'rgb(var(--ds-gray-400))',
                  background: 'transparent',
                  flexShrink: 0,
                }}
              >
                +
              </button>
            </div>

            {/* 서브 아이템 트리 */}
            {isExpanded && (
              <div style={{ marginTop: BRIDGE_H }}>
                <ResourceTree
                  subItems={resource.subItems}
                  selectedSubItemId={selectedSubItemId}
                  onSelectSubItem={onSelectSubItem}
                  onSaveName={(subItemId, name) =>
                    onSaveSubItemName(resource.id, subItemId, name)
                  }
                  onStartEdit={(subItemId) =>
                    onStartEditSubItem(resource.id, subItemId)
                  }
                  collabProvider={collabProvider}
                  userName={userName}
                  cursorColor={cursorColor}
                  onContentChange={onContentChange}
                  onDragStart={onSubItemDragStart}
                  onExpandSubItem={onExpandSubItem}
                  selectedUpdatedAt={selectedUpdatedAt}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  projects: Project[];
  resources: Resource[];
  expanded: Set<string>;
  onAddProject: () => void;
  onSaveProjectName: (id: string, name: string) => void;
  onStartEditProject: (id: string) => void;
  onAddResource: () => void;
  onSaveResourceName: (id: string, name: string) => void;
  onAddSubItem: (resourceId: string) => void;
  onSaveSubItemName: (
    resourceId: string,
    subItemId: string,
    name: string,
  ) => void;
  onStartEditResource: (id: string) => void;
  onStartEditSubItem: (resourceId: string, subItemId: string) => void;
  onToggleExpand: (id: string) => void;
}

export default function Sidebar({
  isOpen,
  onToggle,
  projects,
  resources,
  expanded,
  onAddProject,
  onSaveProjectName,
  onStartEditProject,
  onAddResource,
  onSaveResourceName,
  onAddSubItem,
  onSaveSubItemName,
  onStartEditResource,
  onStartEditSubItem,
  onToggleExpand,
}: SidebarProps) {
  const [selectedSubItemId, setSelectedSubItemId] = useState<string | null>(null);
  const [selectedUpdatedAt, setSelectedUpdatedAt] = useState<string | undefined>(undefined);
  const editorContentRef = useRef<{ markdownBody: string; jsonBody: string } | null>(null);

  const router = useRouter();
  const { userMe, workspaceId } = useWorkspaceLayout();
  const userName = userMe?.username ?? 'Anonymous';
  const cursorColor = getCursorColor(userMe?.userId ?? '');

  const { provider: collabProvider } = useYjsProvider({
    nodeId: selectedSubItemId,
    userName,
    userColor: cursorColor,
  });

  const handleSelectSubItem = useCallback((id: string | null) => {
    setSelectedSubItemId(id);
    setSelectedUpdatedAt(id ? new Date().toISOString() : undefined);
    editorContentRef.current = null;
  }, []);

  const handleContentChange = useCallback(
    (content: { markdownBody: string; jsonBody: string }) => {
      editorContentRef.current = content;
      setSelectedUpdatedAt(new Date().toISOString());
    },
    [],
  );

  const handleExpandSubItem = useCallback(
    (id: string) => {
      router.push(`/workspace/node/${id}${workspaceId ? `?workspaceId=${workspaceId}` : ''}`);
    },
    [router, workspaceId],
  );

  const handleSubItemDragStart = useCallback(
    (event: React.DragEvent<HTMLSpanElement>, item: ResourceSubItem) => {
      const isSelected = selectedSubItemId === item.id;
      const content = isSelected ? editorContentRef.current : null;

      const dragPreview = document.createElement('div');
      dragPreview.textContent = item.name || ' ';
      dragPreview.style.padding = '4px 12px';
      dragPreview.style.fontSize = '14px';
      dragPreview.style.borderRadius = '9999px';
      dragPreview.style.background = 'rgb(var(--ds-gray-800))';
      dragPreview.style.color = 'rgb(var(--foreground))';
      dragPreview.style.position = 'absolute';
      dragPreview.style.top = '-9999px';
      dragPreview.style.left = '-9999px';
      document.body.appendChild(dragPreview);

      event.dataTransfer.setData(
        'application/resource-subitem',
        JSON.stringify({
          id: item.id,
          name: item.name,
          markdownBody: content?.markdownBody ?? '',
          jsonBody: content?.jsonBody ?? '',
        }),
      );
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setDragImage(dragPreview, 10, 10);

      requestAnimationFrame(() => {
        document.body.removeChild(dragPreview);
      });
    },
    [selectedSubItemId],
  );

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-50"
      style={{
        width: SIDEBAR_WIDTH,
        background: 'rgb(var(--surface))',
        transform: isOpen
          ? 'translateX(0)'
          : `translateX(calc(-100% + ${VISIBLE_BUTTON_WIDTH}px))`,
        transition: 'transform 300ms ease',
        overflow: 'visible',
      }}
    >
      {/* ── 스크롤 영역 ── */}
      <div
        className="scrollbar-hide flex-1 overflow-y-auto px-4 pt-5 pb-4"
        style={{ overflow: isOpen ? undefined : 'hidden' }}
      >
        {/* Workspaces 섹션 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  color: 'rgb(var(--foreground))',
                }}
              >
                Workspaces
              </span>
              <button
                onClick={onAddProject}
                style={{
                  fontSize: 23,
                  color: 'rgb(var(--ds-black))',
                  lineHeight: 1,
                }}
                className="cursor-pointer"
              >
                +
              </button>
            </div>
            <button
              onClick={onToggle}
              className="cursor-pointer"
              style={{
                fontSize: 21,
                color: 'rgb(var(--ds-gray-500))',
                fontWeight: 600,
              }}
            >
              {isOpen ? '«' : '»'}
            </button>
          </div>

          <ProjectList
            projects={projects}
            onSaveName={onSaveProjectName}
            onStartEdit={onStartEditProject}
          />
        </div>

        {/* Resource 섹션 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: 'rgb(var(--foreground))',
              }}
            >
              Resource
            </span>
            <button
              onClick={onAddResource}
              style={{
                fontSize: 23,
                color: 'rgb(var(--ds-black))',
                lineHeight: 1,
              }}
              className="cursor-pointer"
            >
              +
            </button>
          </div>

          <ResourceList
            resources={resources}
            expanded={expanded}
            selectedSubItemId={selectedSubItemId}
            onSelectSubItem={handleSelectSubItem}
            onToggleExpand={onToggleExpand}
            onAddSubItem={onAddSubItem}
            onSaveResourceName={onSaveResourceName}
            onSaveSubItemName={onSaveSubItemName}
            onStartEditResource={onStartEditResource}
            onStartEditSubItem={onStartEditSubItem}
            collabProvider={collabProvider}
            userName={userName}
            cursorColor={cursorColor}
            onContentChange={handleContentChange}
            onSubItemDragStart={handleSubItemDragStart}
            onExpandSubItem={handleExpandSubItem}
            selectedUpdatedAt={selectedUpdatedAt}
          />
        </div>
      </div>

      {/* ── 하단 아이콘 바 ── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3"
        style={{ borderTop: '1px solid rgb(var(--border))' }}
      >
        <button
          className="flex items-center justify-center rounded-full cursor-pointer"
          style={{
            width: 24,
            height: 24,
            fontSize: 14,
            color: 'rgb(var(--ds-gray-500))',
            border: '1.5px solid rgb(var(--ds-gray-600))',
          }}
        >
          ?
        </button>
        <button
          className="flex items-center justify-center cursor-pointer"
          style={{ color: 'rgb(var(--ds-gray-500))' }}
          title="레이아웃"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="1" width="7" height="4" rx="1" stroke="currentColor" strokeWidth="1" />
            <rect x="1" y="7" width="7" height="4" rx="1" stroke="currentColor" strokeWidth="1" />
            <rect x="1" y="13" width="7" height="4" rx="1" stroke="currentColor" strokeWidth="1" />
            <rect x="10" y="1" width="7" height="4" rx="1" stroke="currentColor" strokeWidth="1" />
            <rect x="10" y="7" width="7" height="4" rx="1" stroke="currentColor" strokeWidth="1" />
            <rect x="10" y="13" width="7" height="4" rx="1" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
