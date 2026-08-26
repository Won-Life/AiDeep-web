"use client";

import { useEffect, useRef, useState } from "react";

const FESTIVAL_POPUP_SEEN_KEY = "aideep_festival_popup_seen";
const FESTIVAL_GUEST_PREFIX = "게스트-";
const REQUIRED_VISITED_NODE_COUNT = 2;
const POPUP_DELAY_MS = 2_000;

function getSeenKey(userId: string) {
  return `${FESTIVAL_POPUP_SEEN_KEY}:${userId}`;
}

/*
 * CONTEXT
 * - Problem      : 플리마켓 QR 게스트는 그래프를 조금 탐색한 뒤 부스로 전환되어야 하지만,
 *                  일반 사용자에게 행사 안내를 노출하거나 같은 세션에 반복 노출하면 안 된다.
 * - Why          : 그래프 데이터와 무관한 일회성 UI 상태이므로, 사용자별 sessionStorage와
 *                  클라이언트 Set으로만 방문 노드를 추적한다. 서버·인증 로직은 변경하지 않는다.
 * - Alternatives : DB에 방문 이력을 저장하는 방식은 행사성 기능에 과도하고, 단순 클릭 횟수는
 *                  같은 노드를 두 번 눌러도 노출되는 문제가 있다.
 * - Trade-offs   : 탭을 닫으면 다시 볼 수 있지만, 요구 범위인 동일 세션 반복 노출은 막는다.
 * - Edge Case    : storage 접근 실패, 사용자 전환, 노드 2개 클릭 뒤 화면 이탈 시 타이머를
 *                  안전하게 정리하며, 게스트가 아닌 경우에는 어떤 상태도 기록하지 않는다.
 */
export function useFestivalPopup(
  username: string | undefined,
  userId: string | undefined,
) {
  const [openForUserId, setOpenForUserId] = useState<string | null>(null);
  const visitedNodeIdsRef = useRef(new Set<string>());
  const hasScheduledRef = useRef(false);
  const hasBeenShownRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFestivalGuest = Boolean(username?.startsWith(FESTIVAL_GUEST_PREFIX) && userId);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    visitedNodeIdsRef.current.clear();
    hasScheduledRef.current = false;
    hasBeenShownRef.current = false;
    if (!isFestivalGuest || !userId) return;

    try {
      hasBeenShownRef.current = sessionStorage.getItem(getSeenKey(userId)) === "true";
    } catch {
      // 스토리지가 제한된 환경에서는 현재 페이지 생명주기 안에서만 중복을 막는다.
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isFestivalGuest, userId]);

  const handleNodeVisited = (nodeId: string) => {
    if (
      !isFestivalGuest ||
      !userId ||
      hasBeenShownRef.current ||
      hasScheduledRef.current
    ) {
      return;
    }

    visitedNodeIdsRef.current.add(nodeId);
    if (visitedNodeIdsRef.current.size < REQUIRED_VISITED_NODE_COUNT) return;

    hasScheduledRef.current = true;
    timerRef.current = setTimeout(() => {
      hasBeenShownRef.current = true;

      try {
        sessionStorage.setItem(getSeenKey(userId), "true");
      } catch {
        // storage가 막혀도 현재 탭에서는 hasBeenShownRef로 반복 노출을 방지한다.
      }

      setOpenForUserId(userId);
      timerRef.current = null;
    }, POPUP_DELAY_MS);
  };

  return {
    isOpen: isFestivalGuest && openForUserId === userId,
    close: () => setOpenForUserId(null),
    handleNodeVisited,
  };
}
