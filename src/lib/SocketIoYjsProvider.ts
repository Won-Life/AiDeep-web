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

  /**
   * CollaborationPlugin 마운트 시 호출됨.
   * 소켓이 이미 연결된 상태이므로 yjs:join만 emit.
   */
  connect(): void {
    if (this._connected) return;
    if (!this.socket?.connected) return;

    this._connected = true;
    this.emit("status", [{ status: "connecting" }]);

    this.socket.emit(
      YJS_EVENT.JOIN,
      { nodeId: this.nodeId },
      (res: { ok: boolean; readOnly?: boolean; error?: string }) => {
        if (!res.ok) {
          this._connected = false;
          this.emit("status", [{ status: "disconnected" }]);
          return;
        }

        this.emit("status", [{ status: "connected" }]);

        this.awareness.setLocalStateField("user", {
          name: this.userName,
          color: this.userColor,
          colorLight: this.userColor + "40",
        });
      }
    );

    this._registerSocketListeners();
  }

  /** CollaborationPlugin 언마운트 시 호출됨. */
  disconnect(): void {
    if (!this._connected) return;

    this.socket?.emit(YJS_EVENT.LEAVE, { nodeId: this.nodeId });
    this._unregisterSocketListeners();

    this._connected = false;
    this._synced = false;
    this.emit("status", [{ status: "disconnected" }]);
    this.emit("sync", [false]);
  }

  /** on() 호출 시 현재 상태를 즉시 replay — CollaborationPlugin이 나중에 마운트돼도 동기화 가능 */
  on(name: string, fn: (...args: unknown[]) => void): void {
    super.on(name, fn);
    if (name === "sync") fn(this._synced);
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
    if (payload.nodeId !== this.nodeId) return;

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
      // SyncStep2 수신 = 초기 동기화 완료
      if (!this._synced) {
        this._synced = true;
        this.emit("sync", [true]);
      }
    }
  };

  private _handleAwareness = (payload: { nodeId: string; data: number[] }) => {
    if (payload.nodeId !== this.nodeId) return;

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
