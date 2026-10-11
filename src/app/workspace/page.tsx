"use client";

import { useEffect, useState } from "react";
import GraphCanvas from "../../features/graph/components/GraphCanvas";
import MeetingBotWidget from "@/features/meeting-bot/MeetingBotWidget";
import { getMeetingTargetForNode } from "@/features/meeting-bot/meetingTargets";
import { useMeetingView } from "@/features/meeting-bot/useMeetingView";
import { inviteMeetingBot } from "@/api/meeting";
import WorkspaceLoading from "@/components/ui/WorkspaceLoading";
import GraphLoadError from "@/components/ui/GraphLoadError";
import WorkspaceUnavailable from "@/features/workspace/WorkspaceUnavailable";
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
    synced, setSynced,
    syncError, setSyncError,
    meetings,
  } = useWorkspaceLayout();

  const currentUserId = userMe?.userId ?? "";
  const currentUserName = userMe?.username ?? "Anonymous";

  // 타이틀 노드의 "회의 녹음 시작"을 누른 노드 — 값이 있으면 회의 봇 추가 모달이 그 노드 대상으로 열린다
  const [meetingNodeId, setMeetingNodeId] = useState<string | null>(null);
  // 진행 중인 회의가 붙은 노드는 수정이 잠기고, 화면 우하단에는 가장 최근 회의 상태가 보인다
  const meetingView = useMeetingView(meetings, meetingNodeId);
  const [canvasPainted, setCanvasPainted] = useState(false);
  const [overlayGone, setOverlayGone] = useState(false);

  // 페이드아웃(300ms)이 끝난 뒤 오버레이를 실제로 언마운트
  useEffect(() => {
    if (!canvasPainted) return;
    const timer = setTimeout(() => setOverlayGone(true), 350);
    return () => clearTimeout(timer);
  }, [canvasPainted]);

  // L2: 최초 로드 실패 → 에러 화면. "다시 시도"는 syncError 해제로 sync effect 재실행,
  // "닫기"는 빈 캔버스로 계속(synced=true).
  if (syncError) {
    return (
      <GraphLoadError
        onRetry={() => setSyncError(false)}
        onDismiss={() => {
          setSyncError(false);
          setSynced(true);
        }}
      />
    );
  }

  // 불러오는 중이면 로딩, 불러왔는데 워크스페이스가 없으면(신규 사용자) 첫 프로젝트 만들기 빈 상태
  if (!workspaceId || !synced) {
    return <WorkspaceUnavailable synced={synced} onCreated={() => setSynced(false)} />;
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
        onStartMeeting={setMeetingNodeId}
        meetingLockedNodeIds={meetingView.lockedNodeIds}
      />
      <MeetingBotWidget
        workspaceId={workspaceId}
        target={meetingNodeId ? getMeetingTargetForNode(nodes, edges, meetingNodeId) : null}
        status={meetingView.targetStatus}
        failureReason={meetingView.failureReason}
        badgeStatus={meetingView.badgeStatus}
        requestMeetingBot={inviteMeetingBot}
        onClose={() => setMeetingNodeId(null)}
      />
      {!overlayGone && nodes.length > 0 && (
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
