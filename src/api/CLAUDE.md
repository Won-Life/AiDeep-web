# API 레이어 규칙

## CRITICAL

- 이 디렉토리는 Next.js API Routes가 아님. 외부 백엔드를 호출하는 클라이언트 사이드 HTTP 유틸 함수.
- 외부 백엔드 직접 호출 금지. 모든 요청은 baseURL `/api` → Next.js rewrites → `API_ORIGIN`.

## ApiResponse envelope

모든 응답은 아래 형태로 wrapping된다. `client.ts` interceptor가 자동 언래핑하므로 개별 함수에서 재처리 불필요.

```typescript
type ApiResponse<T> =
  | { resultType: 'SUCCESS'; error: null; success: T }
  | { resultType: 'FAIL'; error: { errorCode: string; reason: string; data: string }; success: null }
```

`resultType=FAIL` → `ApiError` throw. `resultType=SUCCESS` → `response.data = body.success`.

## 401 Refresh Queue

401 응답 시 `client.ts`의 `pendingQueue`가 자동으로 토큰 갱신 후 재시도한다.
- 개별 API 함수에서 401 재처리 금지 (중복 처리).
- refresh 요청은 raw `axios.post` 사용 (interceptor 재진입 방지).
- refresh 실패 시: `clearTokens()` → `window.location.href = '/login'`.

## WebSocket 이벤트 (ws.ts)

싱글턴 소켓. 워크스페이스 이동 시 기존 소켓 `removeAllListeners + disconnect` 후 재생성.

주요 이벤트:
- `join_workspace` emit (ack 확인 필수) / `workspace_event` recv (노드·엣지 CRUD)
- `node_position_live` emit/recv (드래그 실시간, 50ms throttle)
- `yjs:join/leave/sync/awareness` (노드 에디터 Yjs CRDT)
