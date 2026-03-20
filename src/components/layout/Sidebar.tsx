"use client";
import { useState } from "react";

export const SIDEBAR_WIDTH = 260;
export const VISIBLE_BUTTON_WIDTH = 40;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  isEditing?: boolean;
}

interface ResourceSubItem {
  id: string;
  name: string;
  isEditing?: boolean;
}

interface Resource {
  id: string;
  name: string;
  subItems: ResourceSubItem[];
  isEditing?: boolean;
}

// ─── Initial Data ─────────────────────────────────────────────────────────────

const INITIAL_PROJECTS: Project[] = [
  { id: "p1", name: "Project 1" },
  { id: "p2", name: "Project 2" },
  { id: "p3", name: "Project 3" },
  { id: "p4", name: "Project 4" },
];

const INITIAL_RESOURCES: Resource[] = [
  {
    id: "r1",
    name: "Resource n",
    subItems: [
      { id: "r1-1", name: "Resource n-1" },
      { id: "r1-2", name: "Resource n-2" },
      { id: "r1-3", name: "Resource n-3" },
    ],
  },
  { id: "r2", name: "Resource n", subItems: [] },
  {
    id: "r3",
    name: "Resource n",
    subItems: [
      { id: "r3-1", name: "Resource n-1" },
      { id: "r3-2", name: "Resource n-2" },
      { id: "r3-3", name: "Resource n-3" },
    ],
  },
  {
    id: "r4",
    name: "Resource n",
    subItems: [
      { id: "r4-1", name: "Resource n-1" },
      { id: "r4-2", name: "Resource n-2" },
      { id: "r4-3", name: "Resource n-3" },
    ],
  },
];

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
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
            style={{ width: 18, height: 18, background: "rgb(var(--ds-gray-700))" }}
          />
          {project.isEditing ? (
            <input
              autoFocus
              placeholder="이름 입력..."
              defaultValue={project.name}
              className="sidebar-new-input bg-transparent border-none outline-none"
              style={{ fontSize: 14, color: "rgb(var(--foreground))", flex: 1, minWidth: 0 }}
              onBlur={(e) => onSaveName(project.id, e.target.value.trim())}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
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
              {project.name || <span style={{ color: "rgb(var(--ds-gray-500))" }}>이름 입력...</span>}
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
        return (
          <div key={item.id} className="flex items-center" style={{ height: ITEM_H }}>
            <svg width="20" height={ITEM_H} style={{ flexShrink: 0 }}>
              {isLast ? (
                <path
                  d={`M ${VX} 0 L ${VX} ${ITEM_H / 2 - R} Q ${VX} ${ITEM_H / 2} ${VX + R} ${ITEM_H / 2} L 20 ${ITEM_H / 2}`}
                  fill="none"
                  stroke="rgb(var(--ds-black))"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
              ) : (
                <>
                  <line x1={VX} y1="0" x2={VX} y2={ITEM_H} stroke="rgb(var(--ds-black))" strokeWidth="1" strokeLinecap="round" />
                  <line x1={VX} y1={ITEM_H / 2} x2="20" y2={ITEM_H / 2} stroke="rgb(var(--ds-black))" strokeWidth="1" strokeLinecap="round" />
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
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              />
            ) : (
              <span
                className="rounded-full px-3 py-1"
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
              >
                {item.name || <span style={{ color: "rgb(var(--ds-gray-500))" }}>내용을 입력하세요</span>}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ResourceList ─────────────────────────────────────────────────────────────

// Resource pill ~ 트리 연결: ml-3(12px) + VX(8px) = 20px
const BRIDGE_LEFT = 20;
const BRIDGE_H = 8;

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
  onSaveSubItemName: (resourceId: string, subItemId: string, name: string) => void;
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
                onClick={() => !resource.isEditing && hasSubItems && onToggleExpand(resource.id)}
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
                    style={{ fontSize: 13, color: "rgb(var(--foreground))", flex: 1, minWidth: 0 }}
                    onBlur={(e) => onSaveResourceName(resource.id, e.target.value.trim())}
                    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                  />
                ) : (
                  <span
                    style={{
                      cursor: "text",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    onClick={(e) => { e.stopPropagation(); onStartEditResource(resource.id); }}
                  >
                    {resource.name || <span style={{ color: "rgb(var(--ds-gray-500))" }}>이름 입력...</span>}
                  </span>
                )}
                {hasSubItems && (
                  <svg
                    width="10" height="10" viewBox="0 0 10 10"
                    fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"
                    style={{ flexShrink: 0 }}
                  >
                    {isExpanded
                      ? <path d="M2 6.5L5 3.5L8 6.5" />
                      : <path d="M2 3.5L5 6.5L8 3.5" />
                    }
                  </svg>
                )}
              </button>

              {/* Resource n 옆 + 버튼 (서브 아이템 추가) */}
              <button
                onClick={() => onAddSubItem(resource.id)}
                className="flex items-center justify-center cursor-pointer"
                style={{ fontSize: 18, color: "rgb(var(--ds-gray-400))", background: "transparent", flexShrink: 0 }}
              >
                +
              </button>
            </div>

            {/* Resource pill → 트리 연결선 (브릿지) */}
            {isExpanded && hasSubItems && (
              <div style={{ marginLeft: BRIDGE_LEFT, width: 1, height: BRIDGE_H, background: "rgb(var(--ds-black))" }} />
            )}

            {/* 서브 아이템 트리 */}
            {isExpanded && (
              <ResourceTree
                subItems={resource.subItems}
                onSaveName={(subItemId, name) => onSaveSubItemName(resource.id, subItemId, name)}
                onStartEdit={(subItemId) => onStartEditSubItem(resource.id, subItemId)}
              />
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
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [resources, setResources] = useState<Resource[]>(INITIAL_RESOURCES);
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(INITIAL_RESOURCES.filter((r) => r.subItems.length > 0).map((r) => r.id)),
  );

  // ── Project handlers ──────────────────────────────────────────────────────

  const addProject = () => {
    setProjects((prev) => [...prev, { id: makeId(), name: "", isEditing: true }]);
  };

  const saveProjectName = (id: string, name: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name, isEditing: false } : p)),
    );
  };

  // ── Resource handlers ─────────────────────────────────────────────────────

  const addResource = () => {
    setResources((prev) => [...prev, { id: makeId(), name: "", subItems: [], isEditing: true }]);
  };

  const saveResourceName = (id: string, name: string) => {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, name, isEditing: false } : r)),
    );
  };

  const addSubItem = (resourceId: string) => {
    setResources((prev) =>
      prev.map((r) =>
        r.id === resourceId
          ? { ...r, subItems: [...r.subItems, { id: makeId(), name: "", isEditing: true }] }
          : r,
      ),
    );
    // 서브 아이템 추가 시 자동으로 펼치기
    setExpanded((prev) => new Set([...prev, resourceId]));
  };

  const startEditProject = (id: string) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, isEditing: true } : p)));
  };

  const startEditResource = (id: string) => {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, isEditing: true } : r)));
  };

  const startEditSubItem = (resourceId: string, subItemId: string) => {
    setResources((prev) =>
      prev.map((r) =>
        r.id === resourceId
          ? { ...r, subItems: r.subItems.map((s) => (s.id === subItemId ? { ...s, isEditing: true } : s)) }
          : r,
      ),
    );
  };

  const saveSubItemName = (resourceId: string, subItemId: string, name: string) => {
    setResources((prev) =>
      prev.map((r) =>
        r.id === resourceId
          ? {
              ...r,
              subItems: r.subItems.map((s) =>
                s.id === subItemId ? { ...s, name, isEditing: false } : s,
              ),
            }
          : r,
      ),
    );
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
              <span style={{ fontSize: 18, fontWeight: 700, color: "rgb(var(--foreground))" }}>
                Project
              </span>
              <button
                onClick={addProject}
                style={{ fontSize: 22, color: "rgb(var(--ds-black))", lineHeight: 1 }}
                className="cursor-pointer"
              >
                +
              </button>
            </div>
            <button
              onClick={onToggle}
              className="cursor-pointer"
              style={{ fontSize: 20, color: "rgb(var(--ds-gray-500))", fontWeight: 600 }}
            >
              {isOpen ? "«" : "»"}
            </button>
          </div>

          <ProjectList projects={projects} onSaveName={saveProjectName} onStartEdit={startEditProject} />
        </div>

        {/* Resource 섹션 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span style={{ fontSize: 18, fontWeight: 700, color: "rgb(var(--foreground))" }}>
              Resource
            </span>
            <button
              onClick={addResource}
              style={{ fontSize: 22, color: "rgb(var(--ds-black))", lineHeight: 1 }}
              className="cursor-pointer"
            >
              +
            </button>
          </div>

          <ResourceList
            resources={resources}
            expanded={expanded}
            onToggleExpand={toggleExpand}
            onAddSubItem={addSubItem}
            onSaveResourceName={saveResourceName}
            onSaveSubItemName={saveSubItemName}
            onStartEditResource={startEditResource}
            onStartEditSubItem={startEditSubItem}
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
          style={{ width: 24, height: 24, fontSize: 13, color: "rgb(var(--ds-gray-500))", border: "1.5px solid rgb(var(--ds-gray-600))" }}
        >
          ?
        </button>
        <button
          className="flex items-center justify-center cursor-pointer"
          style={{ color: "rgb(var(--ds-gray-500))" }}
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
