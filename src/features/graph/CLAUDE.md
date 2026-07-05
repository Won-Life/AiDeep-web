# 그래프 캔버스 도메인 규칙

## Optimistic Update 패턴 (필수)

본인 action → REST 응답 즉시 local state 반영. 협업자 action → WS 이벤트로만 반영.
서버는 WS 이벤트를 **발신자 제외**로 broadcast하므로(Aideep_backend#47, per-user 룸 `.except()`) 본인 이벤트는 원래 되돌아오지 않는다.

```typescript
// useWorkspaceWS.ts — 안전망 필터 (서버 회귀·재연결 시 룸 join 어긋남 대비)
// 이 필터가 실동작하는 상황이면 서버 발신자 제외가 깨진 것 — 없으면 노드/엣지 중복 삽입
if (event.userId === currentUserId) return
```

## Ref 기반 최신값 추적

WS 핸들러·이벤트 리스너는 마운트 시점의 클로저를 사용한다. state가 필요하면 반드시 ref로 최신값을 추적한다.

| ref | 용도 |
|-----|------|
| `edgesRef` | WS 핸들러에서 `getDescendantIds` 호출 시 최신 edges 참조 |
| `setNodesRef`, `setEdgesRef` | WS 재구독 없이 최신 setter 참조 |
| `nodesRef` | D3 시뮬레이션 tick에서 최신 nodes 참조 |
| `isDraggingRef` | NODE_MOVE 수신 시 CSS transition 생략 판단 |
| `isConnectingRef` | onConnectEnd 후 onPaneClick 이중 발화 방지 |

## D3 Simulation

- D3 시뮬레이션의 tick 핸들러·force 콜백은 레퍼런스 안정이 필수 → `useCallback` 명시 (React Compiler 예외).
- `rectCollide` force는 `src/features/graph/layout/rectCollide.ts`에만 수정한다.

## 노드 생성 규칙

- 빈 공간 클릭 → `createMdNode` REST POST → 응답의 `nodeId`로 local state 삽입.
- 낙관적 삽입(응답 전 삽입) 없음. 실패 시 노드 미생성.

## 엣지 연결 (onConnect)

색상 전파: 엣지 생성 성공 후 `updateSubtreeColors`로 로컬 페인트하고, 같은 집합(`getRecolorTargetIds`)에 **노드별** REST PATCH로 저장한다. 서버의 `propagateToChildren` 전파는 그래프 색 경계를 모르고 크로스 그래프 엣지 너머까지 덮어쓰므로(Aideep_backend#51) 사용하지 않는다. PATCH 실패해도 로컬 색상은 이미 변경 (롤백 없음).

source/target 정규화 순서: ① isMain 노드 → source, ② 엣지 수 더 많은 노드 → source.
