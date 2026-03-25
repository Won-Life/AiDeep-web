"use client";
import { useEffect, useRef, useState } from "react";
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
import { toFlowNode, toFlowEdge } from "@/features/graph/api/mappers";
import { useWorkspaceWS } from "@/hooks/useWorkspaceWS";
import { getWorkspaces } from "@/api/workspace";

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
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
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
  const [synced, setSynced] = useState(false);

  // edgesRef: useWorkspaceWS에 전달 (재구독 방지)
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

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

  // 1) 워크스페이스 목록 조회 → 첫 번째 자동 선택
  useEffect(() => {
    getWorkspaces()
      .then((list) => {
        if (list.length === 0) {
          console.warn("[GraphPage] 소속된 워크스페이스가 없습니다.");
          return;
        }
        setWorkspaceId(list[0].workspaceId);
      })
      .catch((error) => {
        console.error("[getWorkspaces] failed", error);
      });
  }, []);

  // 2) workspaceId 확보 후 노드/엣지 동기화
  useEffect(() => {
    if (!workspaceId) return;
    getNodes(workspaceId)
      .then((data) => {
        if (data.nodes?.length) {
          setNodes(data.nodes.map(toFlowNode));
        }
        if (data.edges?.length) {
          setEdges(data.edges.map(toFlowEdge));
        }
        setSynced(true);
      })
      .catch((error) => {
        console.error("[getNodes] failed, using mock data", error);
        setSynced(true);
      });
  }, [workspaceId]);

  useWorkspaceWS({ workspaceId: workspaceId ?? "", setNodes, setEdges, edgesRef });

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div className="absolute inset-0 z-0">
        {!workspaceId ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            워크스페이스를 불러오는 중...
          </div>
        ) : (
        <GraphCanvas
          workspaceId={workspaceId}
          focusedNodeId={focusedNodeId}
          onFocusComplete={() => setFocusedNodeId(null)}
          nodes={nodes}
          edges={edges}
          setNodes={setNodes}
          setEdges={setEdges}
        />
        )}
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
