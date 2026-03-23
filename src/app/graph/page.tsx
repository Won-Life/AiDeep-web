"use client";
import { useEffect, useState } from "react";
import { type Edge, type Node } from "@xyflow/react";
import GraphCanvas from "../../features/graph/components/GraphCanvas";
import Sidebar, {
  type Project,
  type Resource,
  SIDEBAR_WIDTH,
  VISIBLE_BUTTON_WIDTH,
} from "@/components/layout/Sidebar";
import DropDown from "@/components/ui/DropDown";
import ChipHeader from "@/components/layout/ChipHeader";
import { initialEdges, initialNodes } from "@/mock/mindmap";
import { getNodes } from "@/features/graph/api/getNodes";

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

export default function GraphPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [resources, setResources] = useState<Resource[]>(INITIAL_RESOURCES);
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(
      INITIAL_RESOURCES.filter((r) => r.subItems.length > 0).map((r) => r.id),
    ),
  );
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const sidebarWidth = isSidebarOpen ? SIDEBAR_WIDTH : VISIBLE_BUTTON_WIDTH;

  const addProject = () => {
    setProjects((prev) => [
      ...prev,
      { id: makeId(), name: "", isEditing: true },
    ]);
  };

  const saveProjectName = (id: string, name: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name, isEditing: false } : p)),
    );
  };

  const startEditProject = (id: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isEditing: true } : p)),
    );
  };

  const addResource = () => {
    setResources((prev) => [
      ...prev,
      { id: makeId(), name: "", subItems: [], isEditing: true },
    ]);
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
          ? {
              ...r,
              subItems: [
                ...r.subItems,
                { id: makeId(), name: "", isEditing: true },
              ],
            }
          : r,
      ),
    );
    setExpanded((prev) => new Set([...prev, resourceId]));
  };

  const startEditResource = (id: string) => {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isEditing: true } : r)),
    );
  };

  const startEditSubItem = (resourceId: string, subItemId: string) => {
    setResources((prev) =>
      prev.map((r) =>
        r.id === resourceId
          ? {
              ...r,
              subItems: r.subItems.map((s) =>
                s.id === subItemId ? { ...s, isEditing: true } : s,
              ),
            }
          : r,
      ),
    );
  };

  const saveSubItemName = (
    resourceId: string,
    subItemId: string,
    name: string,
  ) => {
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

  useEffect(() => {
    const workspaceId = "550e8400-e29b-41d4-a716-446655440001";
    getNodes(workspaceId)
      .then((res) => {
        console.log("[getNodes]", res);
      })
      .catch((error) => {
        console.error("[getNodes] failed", error);
      });
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div className="absolute inset-0 z-0">
        <GraphCanvas
          focusedNodeId={focusedNodeId}
          onFocusComplete={() => setFocusedNodeId(null)}
          nodes={nodes}
          edges={edges}
          setNodes={setNodes}
          setEdges={setEdges}
        />
      </div>

      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        projects={projects}
        resources={resources}
        expanded={expanded}
        onAddProject={addProject}
        onSaveProjectName={saveProjectName}
        onStartEditProject={startEditProject}
        onAddResource={addResource}
        onSaveResourceName={saveResourceName}
        onAddSubItem={addSubItem}
        onSaveSubItemName={saveSubItemName}
        onStartEditResource={startEditResource}
        onStartEditSubItem={startEditSubItem}
        onToggleExpand={toggleExpand}
      />

      <ChipHeader
        sidebarWidth={sidebarWidth}
        onNodeFocus={setFocusedNodeId}
        activeProjectId={focusedNodeId}
      />

      <DropDown sidebarWidth={sidebarWidth} />
    </div>
  );
}
