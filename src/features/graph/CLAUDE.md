# 그래프 캔버스 도메인 규칙

> 기능 명세·구현 체크리스트는 `docs/GRAPH_RULES.md` (living document).
> 그래프 동작을 바꾸는 작업을 마치면 해당 체크 항목을 같은 브랜치에서 갱신한다.

## depth와 root 판별 (issue #99)

- 모든 노드는 `data.depth`(트리 root로부터의 거리)를 가진다. 초기값은 sync 응답의 서버값, 신규 노드는 0.
- **root(부모 없는 노드) 판별은 `isRootNode(node)`(= depth === 0) 단일 기준.** 엣지 스캔으로 재유도하지 않는다. `isMain`(PROJECT 노드)은 별개 개념 — 연결 안 된 일반 노드도 root다.
- 서버는 depth를 엣지 생성·삭제 시에만 갱신하고(`propagateDepth`), 갱신값을 WS·REST 응답에 싣지 않는다. 따라서 클라이언트는 엣지 상태가 바뀌는 모든 지점(본인 REST 성공·WS EDGE_CREATE/EDGE_DELETED)에서 `applyDepthOnEdgeCreate/Delete`(graphUtils)로 서버와 동일 규칙을 로컬 적용한다. 규칙은 graphUtils 테스트가 고정 — 서버 `propagateDepth`가 바뀌면 함께 바꾼다. 서버가 갱신값을 보내주면(Aideep_backend#63) 수신값 적용으로 교체.
- 알려진 공백: 서버 `deleteNode`가 depth를 전파하지 않아(Aideep_backend#64), 노드 삭제로 부모를 잃은 크로스 그래프 root는 depth≠0으로 남는다. 클라이언트도 동률 유지(미전파)한다 — 새로고침 시 sync가 서버값으로 되돌리므로.

## 드래그 위치 저장 (moveNode)

서버 `PATCH /node/:id/move`는 해당 노드를 절대 좌표로 저장하면서 **DB 기준 delta를 모든 자손에게도 전파**한다(node.service `updateNodePosition`, 색 경계 무시). 따라서 드래그 종료 시 부모·자손을 각각 병렬 PATCH하면 처리 순서에 따라 자손이 이중 이동된다(자손 요청이 먼저 처리되면 자손 = 최종 좌표 + 부모 delta).

규칙: **root만 PATCH하고, 서버 전파 결과를 로컬 시뮬레이션한 뒤 어긋나는 자손만 root 응답 이후 순차 보정한다** (`saveDragPositions`, GraphCanvas). 일반 드래그는 요청 1건, Alt 단독 이동·대칭이동·크로스 그래프 자손만 보정 PATCH 발생. 시뮬레이션 기준값은 드래그 시작 스냅샷(`dragStartPositionsRef`). 서버 전파 규칙이 바뀌면 시뮬레이션도 함께 바꾼다.

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

**크로스 그래프 연결 차단**: 둘 다 엣지를 가진 노드이고 `data.color`가 서로 다르면(= 서로 다른 그래프) `isValidConnection`이 거부한다. #117의 "그래프 ↔ 그래프는 양쪽 색 유지" 규칙은 폐기 — 크로스 그래프 엣지의 유일한 신규 발생 경로였다(Aideep_backend#64 논의). 단독 노드(엣지 0개)는 색이 남아 있어도 그래프 편입 허용. 색 미저장 legacy main은 색 비교 불가로 차단을 통과할 수 있다(대칭이동 절단과 동일 맹점, Aideep_backend#52 전까지). 서버 `createEdge`는 아직 무검증이라 이 차단은 UI 레벨 — DB의 기존 크로스 엣지는 legacy 데이터이며 대칭이동 시 절단(`findCrossColorChildEdges`)이 청소 안전망.

따라서 onConnect에 도달하는 연결은 단독 노드·같은 색 트리뿐이고, 항상 target(및 서브트리)을 source 그래프로 편입한다(재배치 + 재색칠).

**서브트리 방향 전환 시 핸들 정규화 (React Flow 에러 #008 방지)**: 비-root 노드는 `source-{handleSide}` 핸들 하나만 렌더링하므로, 서브트리 방향이 바뀌는 세 경로(D3 대칭이동·드래그 재부모화·onConnect 트리 병합) 모두에서 자손 handleSide와 내부 엣지 핸들을 새 방향으로 함께 갱신한다(`subtreeInternalEdgeFilter`·`persistSubtreeEdgeHandles`). 서버는 노드 handleSide 개념이 없고 엣지 핸들만 저장하므로 PATCH `/edge/:edgeId`로 동반 저장한다 — 누락 시 새로고침 후 부모·자식 엣지 핸들이 모순되어 해당 엣지가 렌더링에서 탈락한다. 저장 경로는 두 갈래: 재부모화·트리 병합은 `persistSubtreeEdgeHandles`가, 반전만 하고 빈 공간에 놓는 경우는 `onNodeDragStop`이 드래그 시작 시 엣지 핸들 스냅샷(`dragStartEdgeHandlesRef`)과의 diff로 변경분만 저장한다(재부모화 시에는 이중 PATCH 방지를 위해 diff 스윕 생략). 알려진 공백: 서버가 PATCH 시 WS `EDGE_UPDATE`를 broadcast하지만 클라이언트 수신 핸들러가 없어 협업자 화면은 새로고침 전까지 이전 방향으로 보인다(에러는 아님 — 협업자 로컬 상태는 자체적으로 일관).

색상 전파: 엣지 생성 성공 후 `updateSubtreeColors`로 로컬 페인트하고, 같은 집합(`getRecolorTargetIds`)에 **노드별** REST PATCH로 저장한다. 서버의 `propagateToChildren` 전파는 그래프 색 경계를 모르고 크로스 그래프 엣지(legacy) 너머까지 덮어쓰므로(Aideep_backend#51) 사용하지 않는다. PATCH 실패해도 로컬 색상은 이미 변경 (롤백 없음).

source/target 정규화: `resolveConnectionDirection` 헬퍼가 결정 — ① isMain 노드 → source, ② 단독 노드(엣지 0개)가 그래프에 연결되면 그래프 쪽 → source. `onConnect`와 `isValidConnection`이 같은 헬퍼를 공유한다.

단일 부모 불변식 (#92): 정규화 이후의 실제 자식(target)이 이미 부모(incoming 엣지)를 가지면 연결을 차단한다. 노드 드래그로 붙이는 경로(`onNodeDragStop`)는 기존 부모 엣지를 끊고 재부모화하므로 별도 처리 불필요.

부모 방향 핸들 차단: 부모가 있는 노드의 `target-*` 핸들로 들어오는 연결은 차단 — 연결은 부모 반대 방향으로만. swap으로 그 노드가 부모(source)가 되는 케이스도 드롭 지점이 부모 방향이면 막는다 (부모 방향엔 source 핸들이 렌더링되지 않아 React Flow #008 유발 경로이기도 함, #105 관련).
