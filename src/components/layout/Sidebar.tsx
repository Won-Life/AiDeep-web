"use client";

export const SIDEBAR_WIDTH = 260;
export const VISIBLE_BUTTON_WIDTH = 40;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  isEditing?: boolean;
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
              background: "rgb(var(--ds-gray-700))",
            }}
          />
          {project.isEditing ? (
            <input
              autoFocus
              placeholder="이름 입력..."
              defaultValue={project.name}
              className="sidebar-new-input bg-transparent border-none outline-none"
              style={{
                fontSize: 14,
                color: "rgb(var(--foreground))",
                flex: 1,
                minWidth: 0,
              }}
              onBlur={(e) => onSaveName(project.id, e.target.value.trim())}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
          ) : (
            <span
              style={{
                fontSize: 14,
                color: "rgb(var(--foreground))",
                cursor: "text",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
              onClick={() => onStartEdit(project.id)}
            >
              {project.name || (
                <span style={{ color: "rgb(var(--ds-gray-500))" }}>
                  이름 입력...
                </span>
              )}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

// ─── ResourceTree ─────────────────────────────────────────────────────────────

function ResourceTree({
  subItems,
  onSaveName,
  onStartEdit,
}: {
  subItems: ResourceSubItem[];
  onSaveName: (id: string, name: string) => void;
  onStartEdit: (id: string) => void;
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
        return (
          <div
            key={item.id}
            className="flex items-center"
            style={{ height: ITEM_H }}
          >
            <svg
              width="20"
              height={ITEM_H}
              style={{ flexShrink: 0, overflow: "visible" }}
            >
              {isLast ? (
                <path
                  d={`M ${VX} ${-topExtend} L ${VX} ${ITEM_H / 2 - R} Q ${VX} ${ITEM_H / 2} ${VX + R} ${ITEM_H / 2} L 20 ${ITEM_H / 2}`}
                  fill="none"
                  stroke="rgb(var(--ds-black))"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
              ) : (
                <>
                  <line
                    x1={VX}
                    y1={-topExtend}
                    x2={VX}
                    y2={ITEM_H}
                    stroke="rgb(var(--ds-black))"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                  <line
                    x1={VX}
                    y1={ITEM_H / 2}
                    x2="20"
                    y2={ITEM_H / 2}
                    stroke="rgb(var(--ds-black))"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                </>
              )}
            </svg>

            {item.isEditing ? (
              <input
                autoFocus
                placeholder="내용을 입력하세요"
                defaultValue={item.name}
                className="sidebar-new-input rounded-full px-3 py-1 border-none outline-none"
                style={{
                  fontSize: 13,
                  background: "rgb(var(--ds-gray-800))",
                  color: "rgb(var(--foreground))",
                  width: "90%",
                  display: "inline-block",
                }}
                onBlur={(e) => onSaveName(item.id, e.target.value.trim())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
              />
            ) : (
              <span
                className="rounded-full px-3 py-1"
                draggable
                style={{
                  fontSize: 13,
                  background: "rgb(var(--ds-gray-800))",
                  color: "rgb(var(--foreground))",
                  cursor: "text",
                  maxWidth: "90%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "inline-block",
                }}
                onClick={() => onStartEdit(item.id)}
                onDragStart={(event) => {
                  const dragPreview = document.createElement("div");
                  dragPreview.textContent = item.name || " ";
                  dragPreview.style.padding = "4px 12px";
                  dragPreview.style.fontSize = "13px";
                  dragPreview.style.borderRadius = "9999px";
                  dragPreview.style.background = "rgb(var(--ds-gray-800))";
                  dragPreview.style.color = "rgb(var(--foreground))";
                  dragPreview.style.border = "1px solid rgba(0,0,0,0)";
                  dragPreview.style.position = "absolute";
                  dragPreview.style.top = "-9999px";
                  dragPreview.style.left = "-9999px";
                  document.body.appendChild(dragPreview);

                  event.dataTransfer.setData(
                    "application/resource-subitem",
                    JSON.stringify({ id: item.id, name: item.name }),
                  );
                  event.dataTransfer.effectAllowed = "copy";
                  event.dataTransfer.setDragImage(dragPreview, 10, 10);

                  requestAnimationFrame(() => {
                    document.body.removeChild(dragPreview);
                  });
                }}
              >
                {item.name || (
                  <span style={{ color: "rgb(var(--ds-gray-500))" }}>
                    내용을 입력하세요
                  </span>
                )}
              </span>
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
  onToggleExpand,
  onAddSubItem,
  onSaveResourceName,
  onSaveSubItemName,
  onStartEditResource,
  onStartEditSubItem,
}: {
  resources: Resource[];
  expanded: Set<string>;
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
                  fontSize: 13,
                  color: "rgb(var(--foreground))",
                  borderColor: "rgb(var(--ds-black))",
                  background: "transparent",
                  maxWidth: "90%",
                  minWidth: 0,
                  width: resource.isEditing ? "90%" : undefined,
                }}
              >
                {resource.isEditing ? (
                  <input
                    autoFocus
                    placeholder="이름 입력..."
                    defaultValue={resource.name}
                    className="sidebar-new-input bg-transparent border-none outline-none"
                    style={{
                      fontSize: 13,
                      color: "rgb(var(--foreground))",
                      flex: 1,
                      minWidth: 0,
                    }}
                    onBlur={(e) =>
                      onSaveResourceName(resource.id, e.target.value.trim())
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                  />
                ) : (
                  <span
                    style={{
                      cursor: "text",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartEditResource(resource.id);
                    }}
                  >
                    {resource.name || (
                      <span style={{ color: "rgb(var(--ds-gray-500))" }}>
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
                  fontSize: 18,
                  color: "rgb(var(--ds-gray-400))",
                  background: "transparent",
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
                  onSaveName={(subItemId, name) =>
                    onSaveSubItemName(resource.id, subItemId, name)
                  }
                  onStartEdit={(subItemId) =>
                    onStartEditSubItem(resource.id, subItemId)
                  }
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
  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-50"
      style={{
        width: SIDEBAR_WIDTH,
        background: "rgb(var(--surface))",
        transform: isOpen
          ? "translateX(0)"
          : `translateX(calc(-100% + ${VISIBLE_BUTTON_WIDTH}px))`,
        transition: "transform 300ms ease",
        overflow: "visible",
      }}
    >
      {/* ── 스크롤 영역 ── */}
      <div
        className="scrollbar-hide flex-1 overflow-y-auto px-4 pt-5 pb-4"
        style={{ overflow: isOpen ? undefined : "hidden" }}
      >
        {/* Project 섹션 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "rgb(var(--foreground))",
                }}
              >
                Project
              </span>
              <button
                onClick={onAddProject}
                style={{
                  fontSize: 22,
                  color: "rgb(var(--ds-black))",
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
                fontSize: 20,
                color: "rgb(var(--ds-gray-500))",
                fontWeight: 600,
              }}
            >
              {isOpen ? "«" : "»"}
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
                fontSize: 18,
                fontWeight: 700,
                color: "rgb(var(--foreground))",
              }}
            >
              Resource
            </span>
            <button
              onClick={onAddResource}
              style={{
                fontSize: 22,
                color: "rgb(var(--ds-black))",
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
            onToggleExpand={onToggleExpand}
            onAddSubItem={onAddSubItem}
            onSaveResourceName={onSaveResourceName}
            onSaveSubItemName={onSaveSubItemName}
            onStartEditResource={onStartEditResource}
            onStartEditSubItem={onStartEditSubItem}
          />
        </div>
      </div>

      {/* ── 하단 아이콘 바 ── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3"
        style={{ borderTop: "1px solid rgb(var(--border))" }}
      >
        <button
          className="flex items-center justify-center rounded-full cursor-pointer"
          style={{
            width: 24,
            height: 24,
            fontSize: 13,
            color: "rgb(var(--ds-gray-500))",
            border: "1.5px solid rgb(var(--ds-gray-600))",
          }}
        >
          ?
        </button>
        <button
          className="flex items-center justify-center cursor-pointer"
          style={{ color: "rgb(var(--ds-gray-500))" }}
          title="레이아웃"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect
              x="1"
              y="1"
              width="7"
              height="4"
              rx="1"
              stroke="currentColor"
              strokeWidth="1"
            />
            <rect
              x="1"
              y="7"
              width="7"
              height="4"
              rx="1"
              stroke="currentColor"
              strokeWidth="1"
            />
            <rect
              x="1"
              y="13"
              width="7"
              height="4"
              rx="1"
              stroke="currentColor"
              strokeWidth="1"
            />
            <rect
              x="10"
              y="1"
              width="7"
              height="4"
              rx="1"
              stroke="currentColor"
              strokeWidth="1"
            />
            <rect
              x="10"
              y="7"
              width="7"
              height="4"
              rx="1"
              stroke="currentColor"
              strokeWidth="1"
            />
            <rect
              x="10"
              y="13"
              width="7"
              height="4"
              rx="1"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </button>
      </div>
    </aside>
  );
}
