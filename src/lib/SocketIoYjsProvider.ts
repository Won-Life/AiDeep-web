/*
 * CONTEXT
 * - Problem      : CollaborationPlugin은 소켓 생성 방법을 모른 채 Provider 인터페이스만 호출함.
 *                  데모의 SocketYjsProvider는 내부에서 소켓을 직접 생성하므로,
 *                  기존 ws.ts 싱글턴과 충돌해 두 개의 소켓 연결이 생김.
 * - Why          : 기존 소켓을 생성자에서 주입받아 재사용. yjs:join만 추가로 emit하면 되므로
 *                  join_workspace 핸드셰이크를 중복으로 하지 않아도 됨.
 * - Alternatives : 소켓을 별도로 생성 (기각 — 연결 2개, 토큰 갱신 처리 중복)
 * - Trade-offs   : 소켓이 null인 상태(WS 연결 전)에 connect()가 호출될 수 있음.
 *                  → connected 가드로 처리.
 * - Edge Case    : connect() 중복 호출, 빠른 unmount 시 cleanup 순서 보장
 */

import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { Observable } from "lib0/observable";
import type { Socket } from "socket.io-client";
import type { ProviderAwareness } from "@lexical/yjs";

const YJS_EVENT = {
  JOIN: "yjs:join",
  LEAVE: "yjs:leave",
  SYNC: "yjs:sync",
  AWARENESS: "yjs:awareness",
} as const;

export interface YjsProviderOptions {
  nodeId: string;
  userName: string;
  userColor: string;
}

export class SocketIoYjsProvider extends Observable<string> {
  readonly doc: Y.Doc;
  readonly awareness: awarenessProtocol.Awareness;

  private socket: Socket | null = null;
  private _synced = false;
  private _connected = false;
  private _syncError = false;
  private _syncTimer: ReturnType<typeof setTimeout> | null = null;
  private _attempt = 0;

  private readonly nodeId: string;
  private readonly userName: string;
  private readonly userColor: string;

  constructor(socket: Socket, opts: YjsProviderOptions) {
    super();
    this.socket = socket;
    this.nodeId = opts.nodeId;
    this.userName = opts.userName;
    this.userColor = opts.userColor;

    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);

    // awareness 변경 시 서버에 전송
    this.awareness.on(
      "update",
      ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
        if (!this.socket?.connected) return;
        const changedClients = [...added, ...updated, ...removed];
        const enc = encoding.createEncoder();
        encoding.writeVarUint8Array(
          enc,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
        );
        this.socket.emit(YJS_EVENT.AWARENESS, {
          nodeId: this.nodeId,
          data: Array.from(encoding.toUint8Array(enc)),
        });
      }
    );

    // 로컬 doc 변경 시 서버에 전송 (서버발 업데이트는 재전송 방지)
    this.doc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === this) return;
      if (!this.socket?.connected) return;

      const encoder = encoding.createEncoder();
      syncProtocol.writeUpdate(encoder, update);
      this.socket.emit(YJS_EVENT.SYNC, {
        nodeId: this.nodeId,
        data: Array.from(encoding.toUint8Array(encoder)),
      });
    });
  }

  // ─── CollaborationPlugin 인터페이스 ──────────────────────────────────────

  /*
   * CONTEXT
   * - Problem      : 서버의 첫 SyncStep1만 기다리면 응답 누락·재연결 시 로딩이 끝나지 않는다.
   * - Why          : join 성공 시 직접 동기화를 요청하고, 10초 제한과 재시도로 복구한다.
   * - Alternatives : 빈 문서를 즉시 완료 처리하면 아직 도착하지 않은 원격 내용을 놓친다.
   * - Trade-offs   : 양쪽에서 Step1이 오면 응답이 중복되지만 Yjs 업데이트는 멱등적이다.
   * - Edge Case    : 늦은 ack, unmount, 빈 문서, 소켓 재연결에서도 기존 Doc을 유지한다.
   */
  connect(): void {
    if (this._connected) return;
    this._connected = true;
    this._registerSocketListeners();
    this.socket?.on("connect", this._join);
    this.socket?.on("disconnect", this._handleDisconnect);
    this._join();
  }

  retry(): void {
    this.disconnect();
    this.connect();
  }

  private _clearSyncTimer(): void {
    if (this._syncTimer !== null) clearTimeout(this._syncTimer);
    this._syncTimer = null;
  }

  private _setSyncError(failed: boolean): void {
    this._syncError = failed;
    this.emit("sync-error", [failed]);
  }

  private _join = (): void => {
    if (!this._connected) return;
    const attempt = ++this._attempt;
    this._clearSyncTimer();
    this._synced = false;
    this.emit("sync", [false]);
    this._setSyncError(false);
    this.emit("status", [{ status: "connecting" }]);
    this._syncTimer = setTimeout(() => {
      this._syncTimer = null;
      this._setSyncError(true);
    }, 10_000);
    if (!this.socket?.connected) return;

    this.socket.emit(
      YJS_EVENT.JOIN,
      { nodeId: this.nodeId },
      (res?: { ok: boolean; readOnly?: boolean; error?: string }) => {
        if (!this._connected || attempt !== this._attempt) return;
        if (!res?.ok) {
          this._clearSyncTimer();
          this._setSyncError(true);
          this.emit("status", [{ status: "disconnected" }]);
          return;
        }
        this.emit("status", [{ status: "connected" }]);
        this.awareness.setLocalStateField("user", {
          name: this.userName,
          color: this.userColor,
          colorLight: this.userColor + "40",
        });
        // 빈 문서도 SyncStep2를 받아 내용 유무와 동기화 상태를 구분한다.
        const encoder = encoding.createEncoder();
        syncProtocol.writeSyncStep1(encoder, this.doc);
        this.socket?.emit(YJS_EVENT.SYNC, {
          nodeId: this.nodeId,
          data: Array.from(encoding.toUint8Array(encoder)),
        });
      }
    );
  };

  private _handleDisconnect = (): void => {
    ++this._attempt;
    this._clearSyncTimer();
    this._synced = false;
    this.emit("sync", [false]);
    this._setSyncError(true);
    this.emit("status", [{ status: "disconnected" }]);
  };

  /** CollaborationPlugin 언마운트 시 호출됨. */
  disconnect(): void {
    if (!this._connected) return;
    ++this._attempt;
    this._clearSyncTimer();
    if (this.socket?.connected) {
      this.socket.emit(YJS_EVENT.LEAVE, { nodeId: this.nodeId });
    }
    this._unregisterSocketListeners();
    this.socket?.off("connect", this._join);
    this.socket?.off("disconnect", this._handleDisconnect);
    this._connected = false;
    this._synced = false;
    this.emit("status", [{ status: "disconnected" }]);
    this.emit("sync", [false]);
  }

  /** on() 호출 시 현재 상태를 즉시 replay — CollaborationPlugin이 나중에 마운트돼도 동기화 가능 */
  on(name: string, fn: (...args: unknown[]) => void): void {
    super.on(name, fn);
    if (name === "sync") fn(this._synced);
    else if (name === "sync-error") fn(this._syncError);
    else if (name === "status")
      fn({ status: this._connected ? "connected" : "disconnected" });
  }

  get awareness_provider(): ProviderAwareness {
    return this.awareness as unknown as ProviderAwareness;
  }

  destroy(): void {
    this.disconnect();
    this.awareness.destroy();
    this.doc.destroy();
    super.destroy();
  }

  // ─── 소켓 이벤트 처리 ────────────────────────────────────────────────────

  private _handleSync = (payload: { nodeId: string; data: number[] }) => {
    if (!this._connected || payload.nodeId !== this.nodeId) return;

    const buf = new Uint8Array(payload.data);
    const decoder = decoding.createDecoder(buf);
    const encoder = encoding.createEncoder();

    const msgType = syncProtocol.readSyncMessage(decoder, encoder, this.doc, this);

    // 응답 메시지가 있으면 서버에 전송 (SyncStep1 수신 시 SyncStep2 응답)
    if (encoding.length(encoder) > 0) {
      this.socket?.emit(YJS_EVENT.SYNC, {
        nodeId: this.nodeId,
        data: Array.from(encoding.toUint8Array(encoder)),
      });
    }

    if (msgType === 0) {
      // SyncStep1 수신 → 클라이언트도 SyncStep1 전송 (서버가 SyncStep2 돌려줌)
      const step1Encoder = encoding.createEncoder();
      syncProtocol.writeSyncStep1(step1Encoder, this.doc);
      this.socket?.emit(YJS_EVENT.SYNC, {
        nodeId: this.nodeId,
        data: Array.from(encoding.toUint8Array(step1Encoder)),
      });
    } else if (msgType === 1) {
      // SyncStep2 수신 = 초기 동기화 완료 (빈 업데이트도 완료로 처리)
      this._clearSyncTimer();
      this._setSyncError(false);
      if (!this._synced) {
        this._synced = true;
        this.emit("sync", [true]);
      }
    }
  };

  private _handleAwareness = (payload: { nodeId: string; data: number[] }) => {
    if (!this._connected || payload.nodeId !== this.nodeId) return;

    const decoder = decoding.createDecoder(new Uint8Array(payload.data));
    awarenessProtocol.applyAwarenessUpdate(
      this.awareness,
      decoding.readVarUint8Array(decoder),
      "remote"
    );
  };

  private _registerSocketListeners(): void {
    this.socket?.on(YJS_EVENT.SYNC, this._handleSync);
    this.socket?.on(YJS_EVENT.AWARENESS, this._handleAwareness);
  }

  private _unregisterSocketListeners(): void {
    this.socket?.off(YJS_EVENT.SYNC, this._handleSync);
    this.socket?.off(YJS_EVENT.AWARENESS, this._handleAwareness);
  }
}
