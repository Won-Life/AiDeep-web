# 그래프 캔버스 도메인 규칙

## depth와 root 판별 (issue #99)

- 모든 노드는 `data.depth`(트리 root로부터의 거리)를 가진다. 초기값은 sync 응답의 서버값, 신규 노드는 0.
- **root(부모 없는 노드) 판별은 `isRootNode(node)`(= depth === 0) 단일 기준.** 엣지 스캔으로 재유도하지 않는다. `isMain`(PROJECT 노드)은 별개 개념 — 연결 안 된 일반 노드도 root다.
- 서버는 depth를 엣지 생성·삭제 시에만 갱신하고(`propagateDepth`), 갱신값을 WS·REST 응답에 싣지 않는다. 따라서 클라이언트는 엣지 상태가 바뀌는 모든 지점(본인 REST 성공·WS EDGE_CREATE/EDGE_DELETED)에서 `applyDepthOnEdgeCreate/Delete`(graphUtils)로 서버와 동일 규칙을 로컬 적용한다. 규칙은 graphUtils 테스트가 고정 — 서버 `propagateDepth`가 바뀌면 함께 바꾼다. 서버가 갱신값을 보내주면(Aideep_backend#63) 수신값 적용으로 교체.
- 알려진 공백: 서버 `deleteNode`가 depth를 전파하지 않아(Aideep_backend#64), 노드 삭제로 부모를 잃은 크로스 그래프 root는 depth≠0으로 남는다. 클라이언트도 동률 유지(미전파)한다 — 새로고침 시 sync가 서버값으로 되돌리므로.

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
