# 아키텍처

## 디렉토리 구조
```
src/
├── app/                         # Next.js App Router 페이지 (전부 'use client')
│   ├── layout.tsx               # 루트 레이아웃 — Geist 폰트 주입
│   ├── page.tsx                 # 랜딩 / 워크스페이스 리다이렉트
│   ├── login/page.tsx           # 로그인·회원가입
│   └── workspace/
│       ├── layout.tsx           # WorkspaceLayoutProvider + Sidebar + ChipHeader + WS 구독
│       ├── page.tsx             # 그래프 캔버스 진입점 (synced 가드)
│       ├── context.tsx          # WorkspaceLayoutContext — 전역 상태 단일 진실 소스
│       └── node/[nodeId]/       # 노드 전체화면 에디터
├── api/                         # 클라이언트 사이드 HTTP 유틸 (Next.js API Routes 아님)
│   ├── client.ts                # Axios 인스턴스 — JWT interceptor + 401 refresh queue
│   ├── types.ts                 # ApiResponse envelope, ApiError, 도메인 타입 전체
│   ├── auth.ts                  # 로그인·로그아웃·이메일 인증·토큰 갱신
│   ├── user.ts                  # 내 정보 조회·수정
│   ├── workspace.ts             # 워크스페이스 목록·멤버·초대
│   ├── node.ts                  # 노드 CRUD
│   ├── edge.ts                  # 엣지 생성·삭제
│   ├── ws.ts                    # Socket.IO 싱글턴 + 이벤트 emit/on
│   ├── sse.ts                   # SSE 구독
│   ├── upload.ts                # 파일 업로드
│   └── README.md                # 이 폴더의 역할 + 데이터 페칭 전략
├── features/
│   ├── graph/
│   │   ├── api/                 # 그래프 전용 HTTP 유틸 (getNodes, createMdNode, moveNode 등)
│   │   ├── components/          # GraphCanvas, CursorOverlay
│   │   ├── constants/colors.ts  # 노드 파스텔 팔레트 9색 + 랜덤 색상 유틸
│   │   ├── layout/rectCollide.ts # D3 AABB 충돌 감지 커스텀 force
│   │   ├── types.ts             # NodeDto, EdgeDto
│   │   └── utils/graphUtils.ts  # getDescendantIds 등 그래프 순회 유틸
│   ├── editor/
│   │   ├── editor.tsx           # Lexical 에디터 설정 (플러그인 조합)
│   │   ├── NotionEditor.tsx     # 에디터 컴포넌트 + CollaborationPlugin + ToolbarPlugin
│   │   ├── NodeEditorPanel.tsx  # 에디터 패널 컨테이너 (기본/인라인/전체화면 3가지 모드)
│   │   └── plugins/             # MarkdownPastePlugin, TitleTrackerPlugin 등
│   ├── edge/BranchEdge.tsx      # 커스텀 엣지 (hub-and-spoke SVG 경로)
│   └── nodes/TextUpdateNode.tsx # 커스텀 노드 (메인/서브 형태 분기, 핸들 구성, 뷰어 뱃지)
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx          # 사이드바 (Workspaces + Resource 섹션, 인라인 에디터)
│   │   ├── ChipHeader.tsx       # 상단 헤더 (PROJECT 노드 chip, 협업자, 유저 메뉴, 공유)
│   │   ├── CollaboratorsList.tsx # presence 기반 접속자 아바타 목록
│   │   ├── UserMenu.tsx         # 유저 이름/이메일 드롭다운 + 로그아웃
│   │   ├── ShareButton.tsx      # 워크스페이스 초대 링크 생성 버튼
│   │   └── MembersModal.tsx     # 멤버 목록 모달 (백엔드 미구현 placeholder)
│   └── ui/
│       ├── Button.tsx, Input.tsx, DropDown.tsx
│       └── NodeContextMenu.tsx  # 노드 우클릭 메뉴 (프로젝트 변경 / 아카이브 / 삭제)
├── hooks/
│   ├── useWorkspaceWS.ts        # WS 이벤트 구독 → nodes/edges state 갱신
│   ├── useWorkspaceAwareness.ts # Yjs Awareness — 오픈 패널 동기화, 뷰어 뱃지
│   ├── useYjsProvider.ts        # 노드별 SocketIoYjsProvider 생명주기 관리
│   ├── useCursors.ts            # 다른 유저 커서 위치 수신
│   └── useLocalStorage.ts       # localStorage 읽기/쓰기 훅
├── lib/
│   └── SocketIoYjsProvider.ts  # Socket.IO 기반 Yjs Provider (y-protocols/sync 직접 구현)
├── styles/
│   └── colorPairs.ts            # SubColorKey → Tailwind 클래스 매핑 (bg-sub-*, text-text-*)
├── types/
│   ├── nodeTypes.ts, edgeTypes.ts, common.types.ts, global.d.ts
└── utils/
    └── cursorColor.ts           # userId → 결정론적 협업 커서 색상 (해시 기반)
```

---

## 아키텍처 원칙

- **전체 클라이언트 컴포넌트**: 모든 페이지가 `'use client'`. Server Components, Server Actions 없음.
- **Next.js rewrites가 프록시**: 모든 HTTP 요청은 `/api/*` 경로. `next.config.ts`의 rewrites가 `API_ORIGIN`으로 포워딩.
- **WebSocket 싱글턴**: `src/api/ws.ts`의 `socket` 변수 하나. 워크스페이스 이동 시 기존 소켓을 끊고 새로 연결.
- **기능 단위 코드**: `src/features/{domain}/`에 api·components·hooks·types를 함께 배치.

---

## 데이터 레이어 구조

### HTTP — `src/api/client.ts`
```
브라우저 → client.ts (Axios, baseURL='/api') → Next.js rewrites → 외부 백엔드
```

**요청 흐름**:
1. Request interceptor: `localStorage.aideep_access_token` → `Authorization: Bearer {token}`
2. Response interceptor: `ApiResponse` envelope 언래핑
   - `resultType=SUCCESS` → `response.data = body.success`
   - `resultType=FAIL` → `ApiError` throw (errorCode, reason, data)
3. 401 interceptor: refresh queue 처리 (아래 참고)

**API 응답 envelope**:
```typescript
type ApiResponse<T> =
  | { resultType: 'SUCCESS'; error: null; success: T }
  | { resultType: 'FAIL'; error: { errorCode: string; reason: string; data: string }; success: null }
```

### WebSocket — `src/api/ws.ts`
```
브라우저 → Socket.IO 클라이언트 → NEXT_PUBLIC_WS_ORIGIN/workspace (namespace)
```

**이벤트 분류**:
| 방향 | 이벤트 | 용도 |
|------|--------|------|
| emit | `join_workspace` | 워크스페이스 room 참여 (ack 확인) |
| recv | `workspace_event` | 노드/엣지 CRUD 이벤트 래퍼 |
| emit | `node_position_live` | 드래그 중 실시간 위치 브로드캐스트 |
| recv | `node_position_live` | 다른 유저 드래그 실시간 수신 |
| recv | `presence_state` | 현재 접속자 목록 |
| emit | `cursor_move` | 내 커서 위치 전송 |
| recv | `cursor_move` | 다른 유저 커서 수신 |
| recv | `cursor_leave` | 유저 퇴장 시 커서 제거 |
| emit/recv | `yjs:ws:awareness` | 워크스페이스 레벨 Awareness (오픈 패널 동기화) |
| emit/recv | `yjs:join/leave/sync/awareness` | 노드 에디터 레벨 Yjs CRDT |

---

## 주요 데이터 흐름

### 1. 앱 초기화 시퀀스
```
mount WorkspaceLayout
  ├── getMe()
  │     ├─ ok → setUserMe
  │     └─ fail → router.replace('/login')
  │
  ├── getWorkspaces() [synced=false 조건으로 1회만]
  │     ├─ 빈 배열 또는 실패 → setSynced(true), 빈 캔버스
  │     └─ ok → list[0] 사용 → setWorkspaceId, setWorkspaceRole
  │               getNodes(workspaceId)
  │                 ├─ ok → convertToReactFlow → setNodes/setEdges → setSynced(true)
  │                 └─ fail → 콘솔 에러 + setSynced(true) (빈 캔버스)
  │
  └── subscribeToWorkspace() [workspaceId + userName 준비 후]
        └─ join_workspace emit → ack.ok 확인
              └─ ack.ok=false → 콘솔 에러 (room 미진입)

[미구현] getWorkspaceMembers(workspaceId)  ← 주석 처리됨, setWorkspaceMembers 미호출
```

**logout 흐름**:
```
handleLogout()
  ├── try { await logout() }  — API 성공/실패 무관
  └── catch {}
  └── router.replace('/login')  — 항상 실행 (stuck session 방지)
```

### 2. 사이드바 로컬 상태 구조

> **사이드바 Workspaces / Resource 데이터는 API 미연동.** `INITIAL_PROJECTS`와 `INITIAL_RESOURCES`는 `workspace/layout.tsx`에 하드코딩된 더미 데이터. 생성·수정이 로컬 React state(`useState`)에만 저장되고 새로고침 시 초기화된다.

```typescript
// workspace/layout.tsx 내 로컬 상태 (API 미연동)
const [isSidebarOpen, setIsSidebarOpen] = useState(true)      // sessionStorage 초기화
const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS)
const [resources, setResources] = useState<Resource[]>(INITIAL_RESOURCES)
const [expanded, setExpanded] = useState<Set<string>>(...)    // 초기 확장 그룹 ID 집합

// isSidebarOpen → sidebarWidth 계산 → setSidebarWidth (Context)
const sidebarWidth = isSidebarOpen ? SIDEBAR_WIDTH : VISIBLE_BUTTON_WIDTH  // 260 or 40
useEffect(() => setSidebarWidth(sidebarWidth), [sidebarWidth])
```

**사이드바 CRUD 로직 (로컬 전용)**:
| 액션 | 함수 | 동작 |
|------|------|------|
| 프로젝트 추가 | `addProject()` | `{id: makeId(), name:'', isEditing:true}` push |
| 프로젝트명 저장 | `saveProjectName(id, name)` | `isEditing: false`로 업데이트 |
| 리소스 추가 | `addResource()` | `{id: makeId(), name:'', subItems:[], isEditing:true}` push |
| 서브아이템 추가 | `addSubItem(resourceId)` | 해당 resource의 subItems에 추가 + expanded에 resourceId 추가 |
| 서브아이템명 저장 | `saveSubItemName(resourceId, subItemId, name)` | 중첩 map으로 타겟 업데이트 |

**ID 생성**: `makeId() = \`${Date.now()}_${Math.random().toString(36).slice(2, 6)}\``

### 3. sidebarWidth → ChipHeader 오프셋 흐름
```
Sidebar 열림/닫힘 (handleToggleSidebar)
  → isSidebarOpen toggle
  → sessionStorage.setItem('sidebar_open', ...)
  → sidebarWidth = isSidebarOpen ? 260 : 40
  → setSidebarWidth(sidebarWidth)  (WorkspaceLayoutContext 업데이트)
  → ChipHeader: style.left = sidebarWidth + 'px'  (300ms transition)
  → DropDown: style 조정 (동일 sidebarWidth prop)
```

### 4. 뷰포트 저장/복원
```
[초기화]
GraphCanvas 마운트
  → savedViewport = sessionStorage.getItem('graph_viewport_{workspaceId}')
  → JSON.parse(savedViewport) 성공 → ReactFlow의 defaultViewport={savedViewport}
  → 실패 또는 없음 → fitView=true (전체 노드 맞춤)

[저장]
onViewportChange (ReactFlow 이벤트)
  → 300ms debounce
  → sessionStorage.setItem('graph_viewport_{workspaceId}', JSON.stringify({ x, y, zoom }))
```

### 5. ChipHeader → 노드 포커스
```
ChipHeader: nodes.filter(n => n.data.isMain) → mainNodes (PROJECT 노드만)
  → pill 버튼 클릭 → onNodeFocus(nodeId) → setFocusedNodeId(nodeId)  (Context)

GraphCanvas useEffect([focusedNodeId])
  → node = nodes.find(focusedNodeId)
  → x = node.position.x + (node.width ?? NODE_WIDTH) / 2
  → y = node.position.y + (node.height ?? NODE_HEIGHT) / 2
  → setCenter(x, y, { zoom: 1, duration: 800 })
  → onFocusComplete() → setFocusedNodeId(null)
```

### 6. 노드 생성 (빈 공간 클릭)
```
onPaneClick
  ├── isConnectingRef.current=true → 스킵 (연결 드래그 종료 판별)
  ├── contextMenuNodeId 있으면 메뉴 닫기만
  └── createMdNode(REST POST, { title:'', position, body: { 색상, 빈 Lexical JSON } })
        ├─ ok → { nodeId } → setNodes(prev => [...prev, newNode])
        │         WS NODE_CREATE(본인) → currentUserId 필터링으로 무시
        └─ fail → 콘솔 에러, 노드 미생성 (낙관적 삽입 없음)
```

### 7. 엣지 생성 + 색상 전파
```
onConnect(params)
  ├── shouldSwap 판단 (source/target 역할 정규화)
  │     1. isMain 노드 → source 우선
  │     2. 엣지 수 더 많은 노드 → source
  ├── adjustPositionRelativeToSource → 자식 노드 위치 조정 (100px 간격)
  ├── setNodes: handleSide 기록 + updateSubtreeColors (자식 전체 색상 변경)
  └── createEdge(REST POST)
        ├─ ok → { edgeId } → setEdges(prev => [...prev, newEdge])
        │         updateNodeContent(color, textColor, propagateToChildren=true) → REST PATCH
        └─ fail → 콘솔 에러, 엣지 미생성 (로컬 색상 변경 롤백 안 됨)
```

### 8. 드래그 완료 (노드 이동 저장)
```
onNodeDragStop
  ├── hoveredNodeId 있으면 hover-snap 연결 처리
  │     ├── 기존 부모 엣지 제거 (setEdges local)
  │     ├── adjustPositionRelativeToSource → finalPosition
  │     ├── mirrorSubtree (축 교차 시 자식 서브트리 대칭)
  │     ├── createEdge(REST) → setEdges(새 엣지 추가)
  │     │     └─ fail → 콘솔 에러, 로컬 엣지 state 불일치
  │     └── updateNodeContent(color) → fail → 콘솔 에러 (색상 stale 가능)
  └── moveNode(REST PATCH, finalPosition)
        └─ fail → 콘솔 에러 (위치 저장 실패, 새로고침으로 서버 값 복구)
```

### 9. 노드 컨텍스트 메뉴 (우클릭)
```
노드 우클릭 → setContextMenuNodeId(nodeId) → NodeContextMenu 렌더링 (bottom:100%, z-index:50)

[프로젝트 노드로 변경] onChangeToProjectNode
  → updateNode REST PATCH: { isMain: true }
  → setNodes: 해당 노드 data.isMain = true
  → ChipHeader 재렌더 → mainNodes에 포함 → chip 추가

[아카이브로 이동] onMoveToArchive
  → getDescendantIds(nodeId, edgesRef.current) → pendingArchiveNodeIds 계산
  → setIsArchiveModalOpen(true)

[노드 삭제] onDeleteNode
  → 동일하게 archive modal flow 진입

[아카이브 확인 모달]
  → "총 N개" 표시 → 확인 버튼 → isArchiveDeleting=true
  → pendingArchiveNodeIds.map(id => deleteNode(id)) 병렬 호출
  → 전체 완료 → setNodes/setEdges filter out → 모달 닫기
  → 일부 실패 → 모달 닫기 + state 유지 (불일치)
```

### 10. WS 이벤트 처리 (`useWorkspaceWS`)
```
workspace_event 수신
  ├── NODE_CREATE  → userId === currentUserId → 무시 (Optimistic Update)
  │                   불일치 → newNode 추가
  ├── NODE_MOVE    → target + 자식 노드 delta 계산 후 일괄 위치 갱신
  │                   isDraggingRef.current=true → CSS transition 생략 (시각 충돌 방지)
  │                   transition 있으면 300ms 후 제거 (setTimeout)
  ├── NODE_UPDATE  → patch (title?, position?, data?) 부분 병합
  ├── NODE_DELETE  → 해당 nodeId filter out
  ├── EDGE_CREATE  → userId === currentUserId → 무시
  │                   불일치 → newEdge 추가
  └── EDGE_DELETED → 해당 edgeId filter out

node_position_live 수신 (별도, 50ms throttle)
  → target + 자식 delta 포함 즉시 위치 갱신 (transition 없음)
  → deltaX === 0 && deltaY === 0이면 스킵
```

### 11. Yjs 에디터 협업 (노드별)
```
노드 클릭 → showInputBox=true → useYjsProvider(nodeId)
  ├── getSocket() 확인
  │     └─ 미연결 → 200ms 간격 재시도 (cancelled 플래그로 cleanup)
  └── SocketIoYjsProvider 생성 (기존 소켓 주입)
        ├── connect() → yjs:join emit (ack 대기)
        │     ├─ ack.ok=true → status:connected, awareness user 설정
        │     └─ ack.ok=false → status:disconnected (에디터 로딩 상태 유지)
        ├── 서버 SyncStep1 수신 → SyncStep2 응답 + 클라이언트 SyncStep1 전송
        │     └─ 서버 SyncStep2 수신 → isSynced=true
        ├── 로컬 편집 → doc:update (origin !== this) → yjs:sync emit
        ├── 서버 yjs:sync 수신 → readSyncMessage → 응답 있으면 emit
        └── 언마운트 → yjs:leave → _unregisterSocketListeners → awareness.destroy → doc.destroy
```

### 12. 워크스페이스 Awareness (오픈 패널 동기화)
```
내가 노드 에디터 열기 → myOpenEditorNodeIds에 추가
  → awareness.setLocalStateField('openNodeIds', [...])
  → encodeAwarenessUpdate → emitWsAwareness
  → 다른 유저 → applyAwarenessUpdate → awareness:change
  → rebuildAllOpenNodeIds() 전체 순회 → aggregateOpenNodeIds 갱신
  → 해당 노드 showInputBox=true (다른 유저 화면에서도 패널 열림)

내가 에디터 포커스 변경 → setOpenEditorNodeId(nodeId)
  → awareness.setLocalStateField('openEditorNodeId', nodeId)
  → 다른 유저 → rebuildViewers() → nodeViewers 갱신 → 아바타 뱃지 표시

내가 떠남 (cleanup)
  → removeAwarenessStates([clientID])
  → encodeAwarenessUpdate → emitWsAwareness
  → 다른 유저 → 재계산 → 내가 연 패널 닫힘
  → clearInterval(15초 heartbeat)
```

### 13. 사이드바 리소스 → 캔버스 드래그 흐름
```
[드래그 시작] handleSubItemDragStart(event, item)
  ├── isSelected(item.id) → editorContentRef.current로 최신 에디터 내용 참조
  │     아니면 content = null → markdownBody/jsonBody 빈 문자열
  ├── dragPreview div 생성: pill 스타일 (padding:4px 12px, rounded, ds-gray-800 bg)
  │     position:absolute, top/left:-9999px → body.appendChild
  ├── dataTransfer.setData('application/resource-subitem', JSON.stringify({id, name, markdownBody, jsonBody}))
  ├── setDragImage(dragPreview, 10, 10)
  ├── effectAllowed = 'copy'
  └── requestAnimationFrame → document.body.removeChild(dragPreview)

[드래그 오버] onDragOver (GraphCanvas)
  ├── dataTransfer.types에 'application/resource-subitem' 없으면 return
  ├── screenToFlowPosition 변환
  └── findClosestNodeInRange → 유효하면 setHoveredNodeId(target)

[드롭] onDrop
  ├── dataTransfer.getData 파싱
  ├── hoveredNodeId 있으면 adjustPositionRelativeToSource → dropSide 결정
  ├── 없으면 findNonOverlappingPosition (겹침 없는 빈 좌표 탐색)
  ├── createMdNode(REST, { name, markdownBody, jsonBody, 색상 })
  │     ├─ ok → setNodes 추가
  │     │         hoveredNode 있으면 createEdge → setEdges
  │     └─ fail → setHoveredNodeId(null), return
  └── setHoveredNodeId(null)
```

### 14. 파일/이미지 첨부 흐름
```
[이미지] 사진 버튼 클릭 → imageRef.current.click()
  → <input accept="image/*"> onChange → handleImageChange
  → uploadFile(file) → { url }
  → setAttachments(prev => [...prev, { id, type:'image', src:url, caption:'' }])
  → input.value = ''  (재선택 허용)
  → 업로드 실패: catch {} — silent

[파일] 파일 버튼 클릭 → fileRef.current.click()
  → <input type="file"> onChange → handleFileChange
  → uploadFile(file) → { url, originalName, size }
  → setAttachments(prev => [...prev, { id, type:'file', name:originalName, size, url }])
  → 클릭: document.createElement('a') → href=url, download=name → a.click()
  → input.value = ''
  → 업로드 실패: catch {} — silent

[캡션 변경] onCaptionChange(id, caption)
  → setAttachments map → 해당 attachment.caption 업데이트

[제거] onRemove(id)
  → setAttachments filter out
```

---

## 에러 처리 전략

### HTTP 에러
| 상황 | 처리 |
|------|------|
| 401 (최초) | `pendingQueue` 대기 → 토큰 갱신 후 원 요청 재시도 |
| 401 (refresh 실패) | `clearTokens()` → `window.location.href = '/login'` |
| 401 (이미 retry) | 즉시 reject |
| FAIL envelope | `ApiError(errorCode, reason, data)` throw |
| 기타 4xx/5xx | `console.error` + 로컬 state 유지 (롤백 없음) |
| 동시 401 다수 | `pendingQueue`에 누적 → 갱신 후 일괄 재시도. `isRefreshing` 플래그로 중복 방지 |
| refresh 요청 자체에 interceptor 재적용 방지 | raw `axios.post` 사용 (interceptor 루프 차단) |

### WebSocket 에러
| 상황 | 처리 |
|------|------|
| `connect_error` | `onError` 콜백 → 콘솔 에러 |
| `join_workspace` ack 실패 | 콘솔 에러 (room 미진입, 이벤트 수신 안 됨) |
| 재연결 | Socket.IO 자동 재연결. 끊긴 사이 이벤트 유실 (새로고침으로 복구) |
| 좀비 소켓 | `subscribeToWorkspace` 진입 시 기존 소켓 `removeAllListeners + disconnect` 후 재생성 |

### Yjs 에러
| 상황 | 처리 |
|------|------|
| 소켓 미연결 시 에디터 클릭 | 200ms 재시도 루프 → 연결되면 즉시 생성 |
| `yjs:join` ack 실패 | `status:disconnected`. 에디터에 로딩 텍스트 유지. 재마운트로 복구 |
| 빠른 unmount (패널 전환) | `cancelled` 플래그 + cleanup 순서 보장 (zombie provider 방지) |
| `doc:update` origin === this | 서버발 업데이트 재전송 방지 (무한 루프 차단) |
| SyncStep1 핸드셰이크 실패 | `isSynced=false` 유지 → 에디터 빈 상태. 재마운트로 재시도 |
| 소켓 재연결 후 Yjs | Provider 리스너 재등록 미구현. 에디터 재마운트로만 복구 |

### UX 관련 에러
| 상황 | 처리 |
|------|------|
| 파일 업로드 실패 | `catch {}` silent. UI 변화 없음 (사용자 피드백 없음) |
| collabProvider null (에디터 열림) | "워크스페이스를 불러오는 중..." 텍스트 표시 |
| 아카이브 API 일부 실패 | 모달 닫기 + state 유지. 새로고침으로 서버 상태 복구 |
| 노드 색상 전파 실패 (REST PATCH) | 콘솔 에러. 로컬 색상은 이미 변경됨 (rollback 없음) |

---

## 상태 관리

### `WorkspaceLayoutContext` (전역)
```typescript
interface WorkspaceLayoutContextValue {
  userMe: UserMeResponse | null      // 현재 로그인 유저
  setUserMe: (u: UserMeResponse) => void
  focusedNodeId: string | null       // ChipHeader chip 클릭 시 설정 → GraphCanvas setCenter 트리거
  setFocusedNodeId: (id: string | null) => void
  sidebarWidth: number               // Sidebar 너비 (ChipHeader/DropDown left 오프셋)
  setSidebarWidth: (w: number) => void
  workspaceId: string | null
  setWorkspaceId: (id: string) => void
  workspaceRole: WorkspaceRole | null
  setWorkspaceRole: (r: WorkspaceRole) => void
  workspaceMembers: WorkspaceMember[]   // 항상 [] (getWorkspaceMembers 미구현)
  setWorkspaceMembers: (m: WorkspaceMember[]) => void
  collaborators: PresenceMember[]    // presence_state 이벤트 기반 현재 접속자
  setCollaborators: (c: PresenceMember[]) => void
  nodes: Node[]                      // @xyflow/react 노드 state
  setNodes: Dispatch<SetStateAction<Node[]>>
  edges: Edge[]
  setEdges: Dispatch<SetStateAction<Edge[]>>
  edgesRef: RefObject<Edge[]>        // WS 핸들러 클로저용 최신 edges 참조
  synced: boolean
  setSynced: (s: boolean) => void
}
```

### 로컬 UI State (GraphCanvas)
```typescript
myOpenEditorNodeIds: string[]        // 내가 직접 연 에디터 패널 목록
workingOnEditorNodeId: string | null // 현재 포커스된 패널 (z-index 우선)
hoveredNodeId: string | null         // 드래그 snap 또는 드래그오버 대상 노드
contextMenuNodeId: string | null     // 우클릭 메뉴 표시 대상 nodeId
isArchiveModalOpen: boolean          // 아카이브 확인 모달 표시
isArchiveDeleting: boolean           // API 호출 중 (확인 버튼 disabled)
pendingArchiveNodeIds: string[]      // 삭제 대상 nodeId 목록 (하위 포함)
```

### 로컬 UI State (Sidebar)
```typescript
// Sidebar 컴포넌트 내부
selectedSubItemId: string | null     // 현재 선택된(인라인 에디터 열린) 서브아이템
selectedUpdatedAt: string | undefined // 클라이언트 측 시각 (선택 시 or 내용 변경 시 갱신)
editorContentRef: RefObject<{ markdownBody, jsonBody } | null>
  // 최신 에디터 내용 — state 대신 ref (Sidebar 리렌더 방지)
  // 드래그 시작 시 dataTransfer에 포함
  // 서브아이템 선택 시 null로 초기화

// workspace/layout.tsx 내부 (사이드바 트리 데이터 — API 미연동)
projects: Project[]                  // INITIAL_PROJECTS 하드코딩 더미
resources: Resource[]                // INITIAL_RESOURCES 하드코딩 더미
expanded: Set<string>                // 펼쳐진 리소스 그룹 ID 집합
isSidebarOpen: boolean               // sessionStorage['sidebar_open'] 초기화
```

### Ref 기반 최신값 추적
WS 핸들러·이벤트 리스너 등 클로저에서 최신 state를 참조해야 할 때 ref 사용:
- `edgesRef` — WS 핸들러 내 `getDescendantIds` 호출 시 최신 edges 참조
- `setNodesRef`, `setEdgesRef` — WS 재구독 없이 최신 setter 참조
- `nodesRef` — D3 시뮬레이션 tick에서 최신 nodes 참조
- `screenToFlowPositionRef`, `cursorMetaRef` — 1회 등록 `pointermove` 핸들러에서 최신 값
- `isDraggingRef` — NODE_MOVE WS 핸들러에서 로컬 드래그 중 여부 확인 (transition 생략 판단)
- `isConnectingRef` — onConnectEnd 후 onPaneClick 이중 발화 방지
- `editorContentRef` (Sidebar) — 리렌더 없이 최신 에디터 내용 추적 (드래그 시 읽기)
- `titleDebounceRef`, `contentSaveTimers` — 노드별 debounce timer Map 관리

---

## 협업 동시성 모델

### Optimistic Update 패턴
```
본인 action → REST 요청 → 응답 즉시 local state 반영
                        ↓
                  WS 이벤트 수신 (브로드캐스트)
                        ↓
              userId === currentUserId → 무시 (중복 삽입 방지)
              userId !== currentUserId → state 반영
```

### 동시 편집 충돌
- **노드/엣지**: 마지막 쓰기 승리(LWW). 서버 이벤트 순서 기준, 클라이언트는 수신 순서대로 적용.
- **에디터 콘텐츠**: Yjs CRDT 자동 병합. 순서 무관 최종 상태 동일.
- **드래그 중 NODE_MOVE 수신**: `isDraggingRef` 가드 + CSS transition 생략. 드래그 완료 시 `moveNode` REST로 최종 위치 덮어씀.

### NodeEditorPanel 3가지 모드

| 모드 | props | 크기/위치 | 특이사항 |
|------|-------|-----------|---------|
| 기본 (캔버스 패널) | 기본 | 360×(220~480)px, `absolute top:100%` | `mouseDown stopPropagation + onFocus()`, `shadow-lg` |
| 인라인 (사이드바) | `inline=true` | autoGrow, minH 80~150px | `noMediaDrop`, 최종 수정일(클라이언트 시각) 표시 |
| 전체화면 | `fullscreen=true` | `w-[62.5%] min-w-[300px]` | ToolbarPlugin 포함. provider null → 전체화면 로딩 텍스트 |

### collabProvider null 처리 분기

| 모드 | provider null 시 |
|------|----------------|
| 기본 (캔버스) | 에디터 영역 대신 "워크스페이스를 불러오는 중..." (panel 높이 내 중앙) |
| 전체화면 | 화면 전체(`w-full h-full`) "워크스페이스를 불러오는 중..." |
| 인라인 | provider를 그대로 NotionEditor에 전달 (null 허용, 에디터 내부에서 처리) |
