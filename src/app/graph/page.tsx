'use client';
import { useState } from 'react';
import GraphCanvas from '../../features/graph/components/GraphCanvas';
import Sidebar, { SIDEBAR_WIDTH, VISIBLE_BUTTON_WIDTH } from '@/components/layout/Sidebar';
import CheapHeader from '@/components/layout/CheapHeader';
import DropDown from '@/components/ui/DropDown';

export default function GraphPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // 기본적으로 열림
  // 사이드바가 닫혀도 버튼이 보이므로, 보이는 너비를 계산
  const sidebarWidth = isSidebarOpen ? SIDEBAR_WIDTH : VISIBLE_BUTTON_WIDTH;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* ReactFlow Canvas - 전체 화면 차지 */}
      <div className="absolute inset-0 z-0">
        <GraphCanvas />
      </div>

      {/* Sidebar - 위로 떠있음, 사이드바가 열리면 왼쪽에서 슬라이드 */}
      <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* Header - graph 위에 위치, DropDown과 같은 레이어 */}
      <CheapHeader sidebarWidth={sidebarWidth} />

      {/* Dropdown - graph 위에 위치, 좌측 하단 고정 */}
      <DropDown sidebarWidth={sidebarWidth} />
    </div>
  );
}
