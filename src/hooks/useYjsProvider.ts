"use client";

/*
 * CONTEXT
 * - Problem      : nodeId가 바뀔 때마다 Y.Doc과 Provider를 정확히 해제하고 새로 만들어야 함.
 * - Why          : Provider 생성/해제를 nodeId 단위로 격리해 zombie provider 방지.
 *                  소켓 미연결 시 setInterval로 재시도 → 연결되면 즉시 provider 생성.
 * - Alternatives : doc.on('update')로 Y.XmlText delta 파싱 (기각 —
 *                  Lexical은 블록을 Y.XmlElement로 저장하므로 최상위 delta에
 *                  string insert가 없어 항상 빈 문자열을 반환함).
 *                  라벨 동기화는 NotionEditor 내부 TitleTrackerPlugin으로 이관.
 * - Trade-offs   : 라벨 업데이트 경로가 editor.registerUpdateListener 기반이므로
 *                  에디터가 마운트된 경우에만 동작함 (에디터 없이는 라벨 갱신 없음).
 * - Edge Case    : nodeId가 빠르게 바뀌는 경우 cleanup이 먼저 실행되어 안전.
 *                  소켓 미연결 시 provider = null 반환 → 에디터에서 로딩 처리.
 */

import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/api/ws";
import { SocketIoYjsProvider } from "@/lib/SocketIoYjsProvider";

interface UseYjsProviderOptions {
  nodeId: string | null;
  userName: string;
  userColor: string;
}

interface UseYjsProviderResult {
  provider: SocketIoYjsProvider | null;
  isSynced: boolean;
}

export function useYjsProvider({
  nodeId,
  userName,
  userColor,
}: UseYjsProviderOptions): UseYjsProviderResult {
  const [provider, setProvider] = useState<SocketIoYjsProvider | null>(null);
  const [isSynced, setIsSynced] = useState(false);
  const optsRef = useRef({ userName, userColor });
  optsRef.current = { userName, userColor };

  useEffect(() => {
    if (!nodeId) return;
    let cancelled = false;
    let retryId: number | null = null;
    let p: SocketIoYjsProvider | null = null;

    const initProvider = () => {
      if (cancelled || p) return;
      const socket = getSocket();
      if (!socket?.connected) return;

      p = new SocketIoYjsProvider(socket, {
        nodeId,
        userName: optsRef.current.userName,
        userColor: optsRef.current.userColor,
      });

      p.on("sync", (synced: unknown) => {
        setIsSynced(synced as boolean);
      });

      setProvider(p);
      setIsSynced(false);

      if (retryId !== null) {
        window.clearInterval(retryId);
        retryId = null;
      }
    };

    initProvider();

    if (!p) {
      retryId = window.setInterval(initProvider, 200);
    }

    return () => {
      cancelled = true;
      if (retryId !== null) {
        window.clearInterval(retryId);
      }
      p?.destroy();
      setProvider(null);
      setIsSynced(false);
    };
  }, [nodeId]);

  return { provider, isSynced };
}
