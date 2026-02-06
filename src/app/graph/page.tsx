"use client";
import { useState } from "react";
import GraphCanvas from "../../features/graph/components/GraphCanvas";
import Sidebar, {
  SIDEBAR_WIDTH,
  VISIBLE_BUTTON_WIDTH,
} from "@/components/layout/Sidebar";
import CheapHeader from "@/components/layout/CheapHeader";
import DropDown from "@/components/ui/DropDown";

export default function GraphPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // 기본적으로 열림
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  const sidebarWidth = isSidebarOpen ? SIDEBAR_WIDTH : VISIBLE_BUTTON_WIDTH;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div className="absolute inset-0 z-0">
        <GraphCanvas focusedNodeId={focusedNodeId} />
      </div>

      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <CheapHeader sidebarWidth={sidebarWidth} onNodeFocus={setFocusedNodeId} />

      <DropDown sidebarWidth={sidebarWidth} />
    </div>
  );
}
