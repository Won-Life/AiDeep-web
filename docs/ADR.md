# Architecture Decision Records

## 철학
실시간 협업 캔버스라는 특성상 데이터 일관성이 최우선. 외부 상태 라이브러리는 WebSocket 기반 단일 소스 원칙과 충돌하므로 도입하지 않는다. 작동하는 최소 구현을 선택하되, 협업 동시성 버그는 초기에 잡는다.

---

### ADR-001: Next.js App Router + 전체 'use client'

**결정**: Server Components를 사용하지 않고 앱 전체를 클라이언트 컴포넌트로 구성한다.

**이유**: 핵심 데이터(노드·엣지)가 WebSocket으로 실시간 동기화되므로 SSR 초기 데이터가 연결 직후 덮어씌워진다. 캔버스 드래그·에디터 입력·커서 공유 등 모든 인터랙션이 이미 `'use client'` 필수 환경이다. RSC 경계를 설계하고 유지하는 비용 대비 얻는 이점이 없다.

**트레이드오프**: SEO 및 초기 렌더링 성능 이점 포기. 그러나 대상 페이지(캔버스·에디터)는 로그인 후 사용하는 도구 화면이므로 SEO 불필요.

**에러 케이스**:
- `typeof window === 'undefined'` 가드가 없는 코드(localStorage, socket.io 등)는 SSR 환경에서 crash. `client.ts`, `ws.ts`는 window 가드 내재화.

---

### ADR-002: WebSocket을 그래프 데이터의 단일 진실 소스로 사용 (SWR/TanStack Query 미도입)

**결정**: SWR·TanStack Query를 도입하지 않고, Socket.IO 이벤트가 nodes/edges state를 직접 갱신하도록 한다.

**이유**: 그래프 데이터는 WebSocket이 항상 최신 상태다. HTTP 캐싱 레이어(SWR/TanStack)가 개입하면 WS 이벤트와 캐시 간 충돌·중복 갱신 문제가 발생한다. 1회성 REST 호출(`getMe`, `getWorkspaces` 등)은 세션 내 재사용이 없어 캐싱 이점도 없다.

**트레이드오프**: 향후 REST 기반 페이지(설정·마이페이지 등)가 늘면 SWR 재도입 검토 필요. 현재 규모에서는 불필요.

**에러 케이스**:
- WS 연결 끊김 후 재연결: 끊긴 사이 이벤트는 유실. 새로고침으로만 서버 상태 복구 가능. 미해결 한계.
- `getNodes()` 실패: `setSynced(true)`로 빈 캔버스 진입. 데이터 미노출이지 앱 크래시 아님.

---

### ADR-003: Optimistic Update + currentUserId 필터링으로 WS race condition 방지

**결정**: 본인이 발생시킨 WS 이벤트(`NODE_CREATE`, `EDGE_CREATE`)는 `currentUserId` 비교로 무시한다. REST 응답이 local state의 최초 삽입이 된다.

**이유**: 이전 구조에서는 REST 응답 후 state 삽입 → WS 이벤트 재수신 → 중복 삽입이 발생하는 race condition을 막기 위해 GraphCanvas 곳곳에 guard 코드가 3벌 중복됐다. `useWorkspaceWS`에서 일괄 필터링하면 GraphCanvas는 상태만 관리하면 된다.

**트레이드오프**:
- `currentUserId`가 전달되지 않으면(`undefined`) 필터링 건너뜀 — 중복 삽입 가능.
- 서버가 저장 값을 변환하는 로직이 생기면 REST 응답의 낙관적 값과 서버 실제 값이 달라져 stale data 발생. reconciliation 없음.

**에러 케이스**:
- REST 실패 + 본인 WS 이벤트 도착: 필터링으로 WS도 무시되어 노드 미생성 상태로 일관됨.
- REST 성공 + WS 이벤트 미도착: state는 이미 삽입됐으므로 문제 없음.

---

### ADR-004: @xyflow/react로 그래프 캔버스 구현

**결정**: 그래프 렌더링·드래그·연결·줌 등 캔버스 기능 전체를 `@xyflow/react`에 위임한다.

**이유**: 노드 드래그, 엣지 연결, 뷰포트 컨트롤 등을 직접 구현하면 수개월의 공수가 필요하다. @xyflow/react는 커스텀 노드·엣지 타입, 핸들 제어, `ConnectionMode.Loose`, `onBeforeDelete` hook, `screenToFlowPosition` 등 필요한 확장 포인트를 모두 제공한다.

**트레이드오프**: 라이브러리 추상화에 종속. 복잡한 레이아웃 제어(D3 collision과 병행 시)는 내부 구조를 이해해야 하는 복잡성이 생긴다.

**에러 케이스**:
- `useUpdateNodeInternals(id)`: 핸들 구성이 바뀔 때(`hasParent`, `handleSide` 변경) 즉시 호출하지 않으면 React Flow 내부 핸들 bounds가 stale → 연결 불가.
- `node.width`/`node.height`가 `undefined`인 시점(초기 렌더 전): `?? NODE_WIDTH` fallback 필수. 없으면 D3 좌표 계산 오류.
- `onBeforeDelete`에서 `return false`로 삭제를 가로챔: React Flow의 기본 삭제 흐름(Delete 키)을 막고 아카이브 모달로 대체.
- `isConnectingRef`: 핸들 드래그 종료 후 `onConnectEnd` → `onPaneClick`이 모두 발화함. `isConnectingRef`로 `onPaneClick`에서 노드 생성 억제.

---

### ADR-005: Lexical + @lexical/yjs로 협업 리치 텍스트 에디터 구현

**결정**: 노드 에디터로 Lexical을 사용하고, `@lexical/yjs`로 Yjs Doc에 바인딩해 실시간 동기화한다.

**이유**: Lexical은 Meta가 관리하는 확장성 높은 에디터 프레임워크로 Yjs 공식 바인딩(`@lexical/yjs`)을 제공한다. Tiptap 대비 번들 크기가 작고, ProseMirror보다 React 친화적이다. 기존 Socket.IO 연결을 재사용하는 `SocketIoYjsProvider`를 직접 구현해 별도 WebSocket 없이 에디터 협업을 추가했다.

**트레이드오프**: Lexical 내부 API 변동이 잦다. 마크다운 붙여넣기 등은 플러그인 생태계가 Tiptap보다 작아 `MarkdownPastePlugin`을 직접 구현했다.

**에러 케이스**:
- `yjs:join` ack `ok=false`: `status:disconnected` 이벤트. 에디터 재마운트로만 복구. 원인: 권한 없음 또는 소켓 미인증.
- SyncStep1 핸드셰이크 실패: `isSynced=false` 유지 → 에디터 빈 상태. 재마운트로 재시도.
- 에디터 언마운트 타이밍과 Yjs update 도착 타이밍 충돌: `origin === this` 가드 + cleanup 순서(`_unregisterSocketListeners` 먼저)로 처리.
- `CollaborationPlugin`의 `connect()` 중복 호출: `_connected` 플래그로 차단.
- doc.on('update')에서 Y.XmlText delta 파싱으로 타이틀 추출: Lexical은 블록을 `Y.XmlElement`로 저장해 최상위 delta에 string insert 없음 → 항상 빈 문자열 반환. `TitleTrackerPlugin`(`editor.registerUpdateListener`)으로 대체.

---

### ADR-006: D3 force simulation으로 노드 충돌 방지

**결정**: 드래그 중 다른 노드와 겹치지 않도록 D3의 `forceSimulation` + 커스텀 `rectCollide`를 사용한다.

**이유**: @xyflow/react는 노드 충돌 감지를 제공하지 않는다. D3 시뮬레이션을 별도로 구동해 tick마다 React Flow nodes state를 갱신하면 드래그 중 실시간 밀어내기 효과를 구현할 수 있다.

**트레이드오프**: D3(중심점 기준)와 React Flow(좌상단 기준) 좌표계 변환 로직이 필요하다. 드래그 성능에 민감하므로 ref로 최신 state를 참조하고 `useCallback` 의존성을 최소화해야 한다.

**에러 케이스**:
- `isDraggingRef.current=false` 시 tick에서 setNodes 호출 방지: 드래그 종료 후 시뮬레이션이 계속 돌아 위치가 튀는 문제를 방지.
- D3 노드 fx/fy 해제 타이밍: `onNodeDragStop`에서 dragged + 자식 노드 전체의 fx/fy를 null로 해제 후 `alphaTarget(0)` 설정. 해제 순서가 틀리면 노드가 고정된 채 남음.
- `node.width`/`node.height` undefined 시 D3 초기 x/y 계산 오류: `?? NODE_WIDTH/NODE_HEIGHT` fallback.
- D3 시뮬레이션은 mount 시 1회만 생성 (`useEffect([])`). deps에 nodes/edges 포함 시 매 state 변경마다 재생성되어 드래그 중 시뮬레이션이 리셋됨.

---

### ADR-007: access token은 JS 메모리, refresh token은 localStorage 저장, Axios interceptor로 자동 갱신

**결정**: access token은 `client.ts` 모듈 스코프 메모리 변수에만 보관하고, refresh token(`aideep_refresh_token`)은 localStorage에 저장한다. `client.ts`의 401 interceptor에서 refresh queue를 통해 자동 갱신한다. (이슈 #88 — 이전에는 둘 다 localStorage 저장이었다.)

**이유**: 앱 전체가 클라이언트 컴포넌트여서 httpOnly 쿠키 + Server Component 기반 세션 관리의 이점이 없다. access token을 메모리로 옮기면 XSS 스크립트가 localStorage 스캔만으로 access token을 탈취할 수 없다(OWASP 권고 1단계). refresh token까지 메모리로 옮기면 새로고침 시 재로그인이 강제되므로, 백엔드가 httpOnly 쿠키를 지원할 때까지 localStorage에 유지한다.

**트레이드오프**: refresh token은 여전히 XSS 탈취 가능. httpOnly 쿠키 방식보다 보안이 약하다. 백엔드 Set-Cookie 전환은 별도 이슈로 진행한다.

**에러 케이스**:
- 새로고침 부팅: 메모리 access token이 비어 있어 첫 요청이 Authorization 헤더 없이 나가 401 → 기존 refresh queue가 재발급 → 메모리 적재 → 원요청 재시도. 별도 부팅 refresh 코드 불필요.
- 동시 다발 401: `pendingQueue`에 누적 → 토큰 갱신 완료 후 일괄 재시도. `isRefreshing` 플래그로 refresh 중복 호출 방지.
- refresh 요청에 client.ts interceptor 재적용: `axios.post` (raw axios)를 사용해 interceptor 순환 방지.
- refresh 실패: `clearTokens()` + `window.location.href = '/login'`. `_retry=true`인 요청은 다시 refresh 시도 없이 즉시 reject.
- localStorage 접근 불가 (SSR): `typeof window === 'undefined'` 가드로 `null` 반환.
- 구버전 잔존값: 모듈 로드 시 1회 `localStorage.removeItem('aideep_access_token')`으로 기존 사용자의 localStorage 잔존 access token 제거.

---

### ADR-008: Socket.IO 싱글턴 소켓 재사용 (SocketIoYjsProvider)

**결정**: 노드 에디터의 Yjs Provider는 별도 WebSocket 연결을 생성하지 않고, `ws.ts`의 싱글턴 Socket.IO 소켓을 주입받아 재사용한다.

**이유**: 별도 소켓을 생성하면 같은 워크스페이스에 소켓이 2개 이상 연결되고, JWT 인증·재연결 처리가 중복된다. `getSocket()`으로 현재 소켓을 주입받아 `yjs:join/leave/sync/awareness` 이벤트만 추가하면 충분하다.

**트레이드오프**: 소켓이 null이거나 미연결 상태에서 에디터가 열리면 provider 생성이 불가능하다. `useYjsProvider`에서 200ms 재시도 루프로 처리.

**에러 케이스**:
- `getSocket()=null` 또는 `socket.connected=false`: provider 생성 스킵. 200ms retry → 연결 후 즉시 생성.
- 빠른 nodeId 변경 (에디터 패널 전환): `cancelled` 플래그로 이전 retry 루프 중단 + 이전 provider `destroy()`.
- `yjs:sync` 이벤트에서 nodeId 불일치: `payload.nodeId !== this.nodeId` 가드로 다른 노드의 sync 이벤트 차단.
- `connect()` 이후 소켓 재연결 발생: `_connected=true`이지만 소켓이 새로 연결됨 → 리스너 재등록 필요. 현재 소켓 재연결 후 Yjs 재sync 미구현 (에디터 재마운트로 복구).

---

### ADR-009: Yjs Awareness 전체 재계산 방식

**결정**: awareness:change 이벤트 시 `awareness.getStates()` 전체 순회로 `nodeViewers`와 `aggregateOpenNodeIds`를 매번 재계산한다.

**이유**: diff 방식(`changes.added/removed/updated`)은 prevOpenNodeIdsRef 관리·분기 로직이 복잡하다. 전체 재계산은 awareness를 단일 진실 소스로 삼아 일관된 처리를 보장하며, 협업 인원(<10명)과 이벤트 빈도(<1회/초)를 고려하면 성능 영향이 미미하다.

**트레이드오프**: 이벤트 발생 시마다 전체 유저 순회. 협업 인원이 많아지면 성능 이슈 가능.

**에러 케이스**:
- 유저가 비정상 종료(브라우저 닫기): 소켓 disconnect → 서버가 awareness 상태 제거 → `removeAwarenessStates` → change 이벤트 → 재계산으로 해당 유저 뷰어 뱃지 제거.
- 워크스페이스 변경 시 awareness 잔여 상태: cleanup에서 `removeAwarenessStates` + emit → 다른 유저 화면에서 해당 뷰어 즉시 제거.
- awareness refresh 15초 미전송 시 상태 만료: `setInterval(15_000)`으로 주기적 재전송. 서버 만료 정책에 따라 간격 조정 필요.

---

### ADR-010: 노드 삭제 시 소프트 딜리트(아카이브) 확인 모달

**결정**: Delete 키 또는 컨텍스트 메뉴로 노드 삭제 시 즉시 제거하지 않고 확인 모달을 표시한다. API 성공 후에만 local state에서 제거한다.

**이유**: 노드 삭제는 하위 서브트리 전체에 영향을 미치며 실수 위험이 높다. React Flow의 기본 삭제(`onNodesChange`의 `remove` 타입)를 `onBeforeDelete`에서 `return false`로 가로채고, 별도 모달 flow로 처리한다. 서버 삭제 성공 확인 후 state 제거로 데이터 정합성을 보장한다.

**트레이드오프**: 삭제에 추가 클릭 필요. 낙관적 삭제보다 사용자 경험이 느리다.

**에러 케이스**:
- 모달 열린 상태에서 `onEdgesChange` remove 타입 수신: `isArchiveModalOpen` 가드로 차단.
- `deleteNode` API 병렬 호출 중 일부 실패: 모달 닫기 + state 유지. 부분 삭제 상태로 서버와 불일치 가능 (새로고침으로 복구).
- 삭제 대상에 다른 유저가 에디터 열고 있는 노드 포함: 클라이언트는 API 호출 후 state 제거. 상대방 에디터는 서버 room에서 추방되거나 에러 없이 계속 표시 (서버 처리 방식에 의존).
- `isArchiveDeleting=true` 동안 확인 버튼 disabled: 중복 API 호출 방지.

---

### ADR-011: 뷰포트 sessionStorage 저장 (워크스페이스별 키)

**결정**: 그래프 뷰포트(x, y, zoom)를 `sessionStorage['graph_viewport_{workspaceId}']`에 저장하고 페이지 재진입 시 복원한다. localStorage가 아닌 sessionStorage를 사용한다.

**이유**: 뷰포트 위치는 현재 세션의 탐색 맥락이다. sessionStorage는 탭 단위로 격리되어 동일 세션 내 UX 연속성을 제공하면서 탭 간 간섭을 방지한다. workspaceId를 키에 포함해 다중 워크스페이스 전환 시에도 각 워크스페이스의 뷰포트가 독립 유지된다.

**트레이드오프**: 탭을 닫으면 뷰포트 기억이 사라진다. 재접속 시 `fitView`(전체 노드 맞춤)로 폴백된다.

**에러 케이스**:
- `sessionStorage.getItem` 반환값이 invalid JSON: `JSON.parse` 실패 → `try/catch` 없으면 앱 크래시. fallback으로 `fitView=true` 적용.
- 워크스페이스 ID 변경 전 구 뷰포트 잔류: 키에 workspaceId 포함되어 있어 자동으로 다른 키 참조. 잔류 값은 탭 종료 시 자동 정리.
- 300ms debounce 중 언마운트: unmount 이후 sessionStorage 쓰기 가능하나 부작용 없음.

---

### ADR-012: 에디터 패널 방향(handleSide)으로 위치 결정

**결정**: 노드 에디터 패널은 노드 하단에 붙되, `handleSide`(left/right) 값에 따라 왼쪽 또는 오른쪽 정렬로 열린다.

**이유**: 캔버스에서 노드는 허브(부모)로부터 뻗어나오는 방향이 있다. 왼쪽 handle로 연결된 노드는 오른쪽 공간이 비어 있고, 오른쪽 handle로 연결된 노드는 왼쪽 공간이 비어 있다. 패널이 항상 같은 방향으로 열리면 허브 노드를 가리거나 겹침 문제가 발생한다.

**구현**: `handleSide === 'left'` → `{ right: 0 }` (노드 왼쪽 정렬), `handleSide === 'right'` → `{ left: 0 }` (노드 오른쪽 정렬). 연결이 없는 노드의 기본값은 `'right'`.

**에러 케이스**:
- 뷰포트 가장자리 노드: 패널이 캔버스 밖으로 나갈 수 있음. 자동 재배치 로직 없음 — 사용자가 캔버스 pan으로 조정.
- `handleSide` WS 변경 중 패널 열려 있으면: 패널 방향이 즉시 전환. 애니메이션 없음.

---

### ADR-013: 첨부파일 상태를 Yjs Doc에서 분리 (로컬 전용)

**결정**: 노드 에디터의 이미지·파일 첨부는 서버에 업로드 후 URL을 로컬 React state(`attachments`)에만 저장한다. Yjs Doc이나 서버 Node 모델에 반영하지 않는다.

**이유**: 첨부파일을 Yjs Doc에 넣으면 대용량 URL 문자열이 CRDT 동기화 대역폭을 차지하고, 다른 유저가 첨부를 보거나 삭제하는 동시 편집 정책이 불분명하다. MVP에서는 첨부를 작성자 로컬 컨텍스트로 취급하고, 향후 첨부 모델이 명확해지면 서버 스키마와 함께 재설계한다.

**트레이드오프**: 새로고침 시 첨부 목록 초기화. 다른 협업자에게 첨부가 보이지 않음.

**에러 케이스**:
- 업로드 API 실패: `catch {}` silent. UI 변화 없음 — 사용자는 업로드 성공 여부를 알 수 없음.
- 업로드 중 언마운트: 완료 후 `setAttachments` 호출이 unmounted 컴포넌트에 적용. React 경고 발생하나 앱에는 영향 없음.
- `input.value = ""` 재초기화: 같은 파일 재업로드 허용.

---

### ADR-014: 사이드바 인라인 에디터 내용을 ref로 추적 (state 대신)

**결정**: 사이드바 서브아이템의 에디터 내용 최신 값을 `editorContentRef`(RefObject)에 저장하고 React state로 올리지 않는다.

**이유**: 에디터 내용 변경은 keypress마다 발생한다. state로 올리면 부모 컴포넌트(Sidebar)가 매 keypress마다 리렌더되고, 사이드바 전체 트리(resource list, SVG connectors 등)가 다시 그려진다. ref를 사용하면 에디터는 독립적으로 업데이트되고, 드래그 시작 시 `editorContentRef.current`에서 최신 값을 한 번만 읽어 `dataTransfer`에 담는다.

**트레이드오프**: 에디터 내용 변경 시 다른 UI 요소가 반응할 수 없다.

**에러 케이스**:
- 드래그 시 `editorContentRef.current === null` (선택되지 않은 아이템): `markdownBody: '', jsonBody: ''` 폴백.
- 서브아이템 선택 변경 시 ref 초기화 (`handleSelectSubItem`에서 `editorContentRef.current = null`): 이전 아이템 내용이 새 아이템 드래그에 섞이는 것 방지.

---

### ADR-015: PROJECT 노드만 ChipHeader에 표시

**결정**: 상단 헤더(ChipHeader)에는 전체 노드 중 `isMain=true`인 노드(PROJECT 타입)만 chip으로 표시한다.

**이유**: 캔버스에는 수십~수백 개의 노드가 있을 수 있다. PROJECT 노드는 그래프의 최상위 주제 그룹(허브)이므로 캔버스 내 빠른 이동 단위로 적합하다. chip 클릭 → `setFocusedNodeId` → `setCenter({ duration: 800ms })` 흐름으로 즉각적인 네비게이션을 제공한다.

**UX 결정**: 서브 노드도 컨텍스트 메뉴 "프로젝트 노드로 변경"으로 언제든 PROJECT로 승격 가능 → ChipHeader에 추가됨.

**에러 케이스**:
- PROJECT 노드 0개: 빈 ChipHeader. 정상 동작.
- PROJECT 노드 >10개: 헤더 가득 참. 스크롤 없음 — 오버플로우 잘림.
- `focusedNodeId` 노드가 삭제된 경우: `nodes.find(focusedNodeId)` → `undefined` → `setCenter` 미호출 + `onFocusComplete()` 호출 → null 리셋. 에러 없음.

---

### ADR-016: 사이드바 Workspaces/Resource 데이터를 로컬 state로만 관리 (API 미연동)

**결정**: 사이드바의 Workspaces 섹션(Project 목록)과 Resource 섹션(그룹·서브아이템 트리)은 하드코딩 초기값(`INITIAL_PROJECTS`, `INITIAL_RESOURCES`)을 갖는 React `useState`로만 관리한다. 백엔드 저장, 조회 API를 연동하지 않는다.

**이유**: MVP 초기 단계에서 사이드바 리소스 관리 기능의 도메인 모델(API 스키마, 권한, 다중 워크스페이스)이 확정되지 않았다. 그래프 캔버스·에디터 협업 기능 우선 개발을 위해 사이드바를 prototype 상태로 유지한다. 캔버스 드래그 흐름(서브아이템 → 노드)은 실제 동작하므로 UX 검증 목적은 충족한다.

**중요**: 사이드바 Workspaces 목록과 그래프의 PROJECT 노드는 별개 데이터다. Workspaces는 로컬 state, PROJECT 노드는 백엔드 API와 WebSocket으로 동기화된다. 두 개념을 혼동하지 않는다.

**트레이드오프**: 새로고침 시 사이드바 모든 변경 초기화. 다른 유저와 사이드바 데이터 공유 불가.

**에러 케이스**:
- 사이드바 항목 추가 후 새로고침: 추가 내용 모두 소실. 사용자 혼란 가능. 현재 저장 없음 표시 없음.
- 서브아이템 에디터 내용: Yjs로 동기화되나, 아이템 자체(이름·존재)가 로컬이므로 다른 유저는 에디터 연결을 할 수 없음.

---

### ADR-017: 로그아웃 API 성공 여부와 무관하게 항상 /login 이동

**결정**: `handleLogout()`에서 `try { await logout() } catch {}` 후 API 결과에 관계없이 `router.replace('/login')`을 실행한다.

**이유**: 로그아웃 API가 실패해도 클라이언트의 목표(세션 종료 + 로그인 페이지 이동)는 달성해야 한다. 서버 로그아웃 실패로 클라이언트가 stuck session 상태(로그인됐다고 생각하지만 토큰은 만료)에 빠지는 것을 방지한다. `clearTokens()`는 `logout()` API 내부 또는 401 interceptor에서 이미 처리된다.

**트레이드오프**: 서버에 유효한 세션이 남을 수 있다. 단, 클라이언트 토큰이 만료되면 서버 세션도 무의미해진다.

**에러 케이스**:
- 오프라인 상태에서 로그아웃: API 실패해도 `/login` 이동. 토큰은 localStorage에서 제거됨.
- 이미 만료된 토큰으로 로그아웃: 401 수신 → refresh 시도 → 실패 → `clearTokens()` + `/login`. `handleLogout`의 `catch {}`와 401 경로가 동시에 `/login` 이동을 시도할 수 있으나 `router.replace` 중복 호출은 무해함.

---

### ADR-018: 서브 노드 → PROJECT 노드 승격 via 컨텍스트 메뉴

**결정**: 캔버스의 서브 노드를 우클릭 컨텍스트 메뉴의 "프로젝트 노드로 변경"으로 PROJECT 노드(`isMain=true`)로 승격할 수 있다.

**이유**: 기획 초기에는 어떤 노드가 주제 허브(PROJECT)가 될지 미리 알 수 없다. 작업 진행 중 아이디어 그룹을 PROJECT로 승격하는 흐름이 사용자에게 자연스럽다. 생성 시 모드 선택보다 사후 변경이 인지 부하가 낮다.

**UX 영향**: 승격된 노드는 즉시 ChipHeader에 chip으로 추가되어 빠른 뷰포트 이동 대상이 된다. 모양도 `rounded-full` → `rounded-lg`로 변경, 패딩·색상도 PROJECT 기본값 적용.

**에러 케이스**:
- REST PATCH 실패: 콘솔 에러. 로컬 state 변경 롤백 여부는 구현에 따름.
- 이미 PROJECT 노드를 다시 승격: 중복 요청이지만 idempotent 처리.
- PROJECT 승격 후 WS NODE_UPDATE 이벤트 수신: 다른 유저 화면에서도 동일하게 `isMain=true` 반영 → ChipHeader 갱신.
