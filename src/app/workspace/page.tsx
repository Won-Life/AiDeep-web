"use client";

import { useEffect, useState } from "react";
import GraphCanvas from "../../features/graph/components/GraphCanvas";
import FestivalPopup from "@/features/festival/components/FestivalPopup";
import MeetingBotWidget from "@/features/meeting-bot/MeetingBotWidget";
import { useFestivalPopup } from "@/features/festival/useFestivalPopup";
import WorkspaceLoading from "@/components/ui/WorkspaceLoading";
import { useWorkspaceLayout } from "./context";

/*
 * CONTEXT
 * - Problem      : synced는 "REST 데이터 도착" 시점이라, 그 직후 GraphCanvas 첫 렌더
 *                  (전 노드 마운트 + React Flow 측정 + fitView)가 도는 수 초 동안
 *                  로딩 화면이 사라지고 흰 화면이 노출됐다.
 * - Why          : 로딩 화면을 언마운트하지 않고 캔버스 위 오버레이로 유지하다가,
 *                  GraphCanvas가 첫 프레임을 실제로 그린 뒤(onFirstPaint:
 *                  useNodesInitialized + rAF 2회) 페이드아웃으로 걷는다. 블로킹 중에도
 *                  이전 프레임(로딩 화면)이 남고 펄스는 컴포지터에서 계속 돈다.
 * - Alternatives : 첫 렌더 비용 자체를 줄이는 최적화 — 근본 해법이지만 별도 작업.
 *                  이 오버레이는 그것과 무관하게 유효해서 선행 적용.
 * - Trade-offs   : 메인 스레드 블로킹은 그대로다(가려질 뿐) — unresponsive 경고는
 *                  렌더 비용 최적화로만 없어진다.
 * - Edge Case    : 빈 워크스페이스(노드 0개) — nodesInitialized가 안 오므로
 *                  FirstPaintSignal이 즉시 신호. 페이드 중 상호작용 — pointer-events-none.
 */
export default function WorkspacePage() {
  const {
    focusedNodeId, setFocusedNodeId,
    userMe,
    workspaceId,
    workspaceRole,
    nodes, setNodes,
    edges, setEdges,
    synced,
  } = useWorkspaceLayout();

  const currentUserId = userMe?.userId ?? "";
  const currentUserName = userMe?.username ?? "Anonymous";
  const festivalPopup = useFestivalPopup(userMe?.username, userMe?.userId);

  const [canvasPainted, setCanvasPainted] = useState(false);
  const [overlayGone, setOverlayGone] = useState(false);

  // 페이드아웃(300ms)이 끝난 뒤 오버레이를 실제로 언마운트
  useEffect(() => {
    if (!canvasPainted) return;
    const timer = setTimeout(() => setOverlayGone(true), 350);
    return () => clearTimeout(timer);
  }, [canvasPainted]);

  if (!workspaceId || !synced) {
    return <WorkspaceLoading />;
  }

  return (
    <div className="relative h-full w-full">
      <GraphCanvas
        workspaceId={workspaceId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserRole={workspaceRole ?? 'VIEWER'}
        focusedNodeId={focusedNodeId}
        onFocusComplete={() => setFocusedNodeId(null)}
        nodes={nodes}
        edges={edges}
        setNodes={setNodes}
        setEdges={setEdges}
        onFirstPaint={() => setCanvasPainted(true)}
        onNodeVisited={festivalPopup.handleNodeVisited}
      />
      <FestivalPopup isOpen={festivalPopup.isOpen} onClose={festivalPopup.close} />
      <MeetingBotWidget workspaceId={workspaceId} />
      {!overlayGone && (
        <div
          className={`absolute inset-0 z-50 transition-opacity duration-300 ${
            canvasPainted ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <WorkspaceLoading />
        </div>
      )}
    </div>
  );
}
