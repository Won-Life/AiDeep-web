# PRD: aideep

## 목표
아이디어를 마인드맵 형태의 그래프로 구조화하고, 팀이 실시간으로 함께 편집할 수 있는 협업 캔버스 도구.

---

## 사용자

### 페르소나
- **개인 사용자**: 아이디어를 시각적으로 구조화하고 싶은 기획자·연구자·개발자
- **소규모 팀**: 기획·리서치·브레인스토밍을 함께 진행하는 2~10명 규모 팀

### 역할(Role)
| 역할 | 권한 |
|------|------|
| `OWNER` | 워크스페이스 생성, 멤버 초대, 전체 CRUD |
| `EDITOR` | 노드·엣지 CRUD, 에디터 편집 |
| `VIEWER` | 읽기 전용. 에디터 패널 열기 가능, 변경 불가 (클라이언트 적용 미구현) |

---

## 핵심 기능 및 UX 상세

### 1. 인증
- 이메일 + 비밀번호 회원가입. 이메일 인증 코드 발송 → 코드 입력으로 인증 완료
- JWT 기반 로그인. access token은 JS 메모리에만 보관, refresh token(`aideep_refresh_token`)은 localStorage에 저장
- 401 수신 시(새로고침 후 첫 요청 포함) refresh 시도. refresh 실패 시 토큰 파기 후 `/login`으로 리다이렉트
- 로그아웃: `logout()` API 호출 시도 → 성공/실패 무관하게 항상 `/login`으로 이동 (stuck session 방지)

---

### 2. 워크스페이스 초기화

#### 로딩 시퀀스
```
getMe() → getWorkspaces() → list[0] 선택 → getNodes(workspaceId)
       → convertToReactFlow(nodes, edges) → setNodes/setEdges → synced=true
       → subscribeToWorkspace(WS join)
```
- `getMe()` 실패 → `/login` 리다이렉트
- `getWorkspaces()` 빈 배열 → synced=true (빈 캔버스로 진입)
- `getNodes()` 실패 → 콘솔 에러 + synced=true (빈 캔버스, 데이터 손실 없음)
- **로딩 UX**: `synced=false`인 동안 캔버스 대신 "워크스페이스를 불러오는 중..." 텍스트 표시 (회색, 중앙 정렬)

#### 뷰포트 복원 (UX)
- 마지막 뷰포트(x, y, zoom)를 `sessionStorage['graph_viewport_{workspaceId}']`에 저장 (300ms debounce)
- 새로고침 또는 재진입 시 저장된 뷰포트로 즉시 복원. 없으면 `fitView`로 전체 그래프 맞춤

#### 사이드바 상태 유지 (UX)
- 사이드바 열림/닫힘 상태를 `sessionStorage['sidebar_open']`에 저장
- 새로고침 후에도 이전 상태 유지. 초기 기본값: 열림(true)

---

### 3. 레이아웃 구조

```
┌──────────┬──────────────────────────────────────────┐
│          │  ChipHeader (상단 고정)                   │
│  사이드바  │  [Project 1] [Project 2] ··· | 협업자 | 유저 | 공유 │
│  (260px) ├──────────────────────────────────────────┤
│          │                                          │
│ Workspaces│          GraphCanvas                    │
│ Resource  │       (ReactFlow 캔버스)                 │
│           │                                          │
│           │                                          │
└──────────┴──────────────────────────────────────────┘
```

#### 상단 헤더 (ChipHeader)
- 좌측: 그래프에 존재하는 **PROJECT 타입 노드(`isMain=true`)** 를 pill(chip) 형태로 나열
  - 클릭 시 해당 노드로 뷰포트 이동 (`setCenter`, duration 800ms)
  - 현재 포커스된 노드(마지막 클릭): `background: surface-hover`, `color: foreground`, `font-weight: 500`
  - 비활성 chip: `color: muted`, `font-weight: 400`
  - 노드가 없으면 좌측 빈 공간
  - PROJECT 노드가 10개 초과 시 오버플로우로 잘림 (스크롤 없음)
- 우측: 협업자 아바타 목록 → 내 프로필 메뉴 → 공유 버튼
- 사이드바 너비에 따라 `left` 값이 동적으로 전환 (300ms transition)

#### 사이드바 (260px 기본, 40px 축소)

> **중요**: 사이드바의 "Workspaces" 섹션과 "Resource" 섹션은 현재 백엔드 미연동. 로컬 React state(하드코딩 더미 데이터 `INITIAL_PROJECTS`, `INITIAL_RESOURCES`)로만 동작한다. 새로고침 시 모든 변경이 초기화된다.

| 요소 | 설명 |
|------|------|
| 닫힘 → 열림 | `translateX(0)` 300ms ease 슬라이드 |
| 열림 → 닫힘 | `translateX(calc(-100% + 40px))` 300ms ease — 토글 버튼(`«`/`»`)만 노출 |
| 토글 버튼 | Workspaces 섹션 헤더 우측 `«`(닫기) / `»`(열기) |
| 스크롤 | 콘텐츠 overflow 시 스크롤 가능. 스크롤바는 숨김(`scrollbar-hide`) |
| 하단 바 | `?` 버튼 + 레이아웃 아이콘 — 현재 비기능(placeholder) |

**Workspaces 섹션** (로컬 전용):
- PROJECT 이름 목록 표시 (API 연동 없음. 그래프 PROJECT 노드와 별개 데이터)
- 이름 클릭 → 즉시 인라인 텍스트 편집 모드 (`autoFocus` input)
- `Enter` 또는 blur → 저장 (로컬 state 업데이트만)
- `+` 버튼 → 빈 이름 + `isEditing:true` 상태로 새 항목 추가

**Resource 섹션** (로컬 전용):
- 그룹(Resource) + 서브아이템 2단계 트리 구조
- 그룹: `rounded-full border` pill 형태, 그룹명 클릭 → 즉시 편집 모드, `+` 버튼 → 서브아이템 추가
- 그룹 우측 `▼`/`▲` 토글 (서브아이템이 있을 때만 표시). 서브아이템 없으면 토글 불가
- 서브아이템과 그룹을 잇는 SVG 트리 연결선 (마지막 아이템은 L자형 path, 중간 아이템은 직선+수평선)

---

### 4. 그래프 캔버스

#### 노드 종류

| 종류 | `isMain` | 형태 | 역할 |
|------|----------|------|------|
| PROJECT 노드 | `true` | 사각형 (`rounded-lg`) | 그래프의 최상위 주제 허브 |
| 서브 노드 | `false` | 원형 (`rounded-full`) | 아이디어·항목 단위 노드 |

#### 노드 시각 상태

| 상태 | 시각 표현 |
|------|-----------|
| 기본 (PROJECT) | `rounded-lg`, 흰색 배경(`#FFFFFF`), `#D9D9D9` 테두리 1px |
| 기본 (서브) | `rounded-full`, 파스텔 배경, 테두리 없음 |
| 드래그 snap 대상 (서브) | 파란 테두리 `3px solid #93C5FD` |
| 드래그 snap 대상 (PROJECT) | 파란 테두리, `borderWidth: 2px` |
| 다른 유저가 보는 노드 | 유저 대표 색상 테두리 2px. PROJECT는 `border-color`, 서브는 `border: 2px solid` |
| 뷰어 없음 + snap 없음 (서브) | `border: none` |
| 제목 비어있음 | placeholder 텍스트 표시: PROJECT → "중심 노드", 서브 → "서브 노드", 색상 `rgb(var(--ds-gray-500))` |
| 제목 있음 | 최대 2줄 (`WebkitLineClamp: 2`), 초과 시 말줄임. `wordBreak: break-word`, `lineHeight: 1.4em` |
| 노드 텍스트 정렬 | **center** |
| 핸들 (연결점) — source | 노드 hover 시에만 표시 (`opacity: 0 → 1`) |
| 핸들 (연결점) — target | 항상 invisible (`opacity: 0`) — React Flow 내부 연결 감지용 |

**핸들 구성 — 부모 없는 독립 노드**:
- source-left, target-left, source-right, target-right 4개
- source handle만 hover 시 표시. target handle은 항상 invisible

**핸들 구성 — 부모 있는 노드 (`hasParent=true`)**:
- target: `handleSide`의 반대 방향 (연결선 들어오는 쪽)
- source: `handleSide`와 같은 방향 (자식으로 뻗어나가는 쪽)
- source만 hover 표시. target 항상 invisible

**뷰어 뱃지 (다른 유저 표시)**:
- 노드 바로 위(`bottom: 100%, marginBottom: 4px`)에 렌더링
- 20×20px 원형 아바타, 유저 이름 첫 글자 대문자, 9px 흰색 굵은 글자
- 배경색: 해당 유저의 결정론적 색상(userId 해시 기반)
- 겹침 표현: `-4px` 왼쪽 마진으로 오버랩, `2px solid white` 테두리
- 최대 3개. 4번째부터 `+N` 회색 아이콘

**컨텍스트 메뉴 (우클릭)**:
- 노드 바로 위(`bottom: 100%, marginBottom: 8px`, `z-index: 50`)에 렌더링
- 흰색 배경, 그림자 `0px 0px 4px rgba(44,44,44,0.25)`, `rounded-lg`
- **3가지 항목**:
  1. **프로젝트 노드로 변경** — 서브 노드를 PROJECT 노드(`isMain=true`)로 승격. ChipHeader에 추가됨
  2. **아카이브로 이동** — 소프트 딜리트. 하위 서브트리 포함 삭제 확인 모달 표시
  3. **노드 삭제** — 삭제. 확인 모달 흐름으로 처리
- 빈 캔버스 클릭 시 메뉴 닫힘

#### 노드 생성

| 트리거 | 동작 |
|--------|------|
| 빈 공간 클릭 | 클릭 좌표에 서브 노드 생성 (랜덤 파스텔 색) |
| 핸들 드래그 후 빈 공간 드롭 | source 노드 기준 적정 거리에 서브 노드 생성 + 엣지 자동 연결 |
| 사이드바 서브아이템 드래그 드롭 | 드롭 좌표 또는 인접 노드에 snap, 에디터 내용까지 함께 이식 |

- **노드 위치 결정 로직**: `adjustPositionRelativeToSource` — source 노드에서 100px(`DEFAULT_NODE_DISTANCE`) 떨어진 X 위치, 형제 노드와 Y 방향(노드 높이 + 24px 간격) 겹치지 않도록 자동 배치
- **연결 드래그 중 빈 공간 드롭 판별**: `isConnectingRef`로 `onPaneClick`과 구분 — 연결 드래그 종료인지 캔버스 빈 클릭인지 충돌 방지
- **오류 처리**: REST 실패 시 노드 미생성. 낙관적 업데이트 없음

#### 노드 연결 (엣지 생성)
- source 핸들에서 드래그해 다른 노드에 드롭하면 엣지 생성
- **연결 방향 자동 결정(shouldSwap)**: 다음 우선순위로 source/target 역할 정규화
  1. 한 쪽이 PROJECT 노드면 PROJECT가 source
  2. 한 쪽이 그래프에 이미 속해있으면(엣지가 더 많으면) 그 노드가 source
- **handleSide 자동 결정**: 자식 노드가 부모 왼쪽에 있으면 `left`, 오른쪽이면 `right`
- **금지 연결**: 자기 자신 연결, 이미 같은 그래프 내 노드 간 재연결
- **색상 자동 전파**: 연결 시 부모 그래프의 파스텔 색상이 자식 서브트리 전체에 전파 (`updateSubtreeColors`)

#### 노드 드래그
- 드래그 시 D3 force simulation 기동 → 인접 노드를 충돌 없이 실시간 밀어냄
- 자식 노드가 있으면 delta만큼 함께 이동 (서브트리 통째 이동)
- **`Alt` + 드래그**: 자식 노드 제외, 해당 노드 단독 이동
- **방향 전환 시 서브트리 대칭 (`mirrorSubtree`)**: 노드가 부모의 X 중심축을 넘어가면 자식 서브트리 전체가 좌우 대칭으로 재배치
- **snap 시각 피드백**: 드래그 중 인접 노드 50px 이내 근접 시 파란 테두리 강조 → 드롭 시 새 부모로 재연결
- **실시간 브로드캐스트**: 50ms throttle로 `node_position_live` emit → 다른 유저 화면에 실시간 반영
- **드래그 완료**: `moveNode` REST API 저장. 실패해도 로컬 state 유지 (새로고침 시 서버 값으로 복구)
- **D3 + ReactFlow 좌표계**: D3는 중심점 기준, ReactFlow는 좌상단 기준. 변환 로직이 tick마다 실행됨

#### 노드 삭제 (아카이브)
- Delete 키 또는 우클릭 메뉴 → 확인 모달 표시 (`onBeforeDelete`로 기본 삭제 가로채기)
- **모달 카피**: "보관하시겠습니까?" + "선택한 노드와 하위 서브 노드가 함께 보관 처리됩니다. (총 N개)"
- 삭제 대상 수(하위 서브트리 포함)를 직접 명시해 실수 방지
- **확인 버튼**: `isArchiveDeleting=true` 동안 disabled — API 중복 호출 방지
- 확인 시: `deleteNode` API 병렬 호출 → 성공 후 state 제거
- 실패 시: 모달 닫기 + 로컬 state 유지 (새로고침으로 서버 상태 복구)
- 모달 열려있는 동안 `onEdgesChange`의 remove 타입은 차단 (isArchiveModalOpen 가드)

#### 노드 클릭 → 에디터 패널

**패널 위치 결정**:
- 패널은 노드 하단 (`top: 100%`, `marginTop: 4px`)에 절대 위치
- `handleSide === 'left'` → `right: 0` (노드 왼쪽으로 열림)
- `handleSide === 'right'` → `left: 0` (노드 오른쪽으로 열림)
- 연결선이 뻗어나가는 방향 반대편에 패널이 붙어 연결선과 겹치지 않음

**패널 크기**: `width: 360px`, `minHeight: 220px`, `maxHeight: 480px`, `shadow-lg`

**패널 헤더 버튼** (우상단, 22×22px):
- ↗ (expand): 전체화면(`/workspace/node/{nodeId}?workspaceId=...`) 이동
- × (close): 패널 닫기

**패널 포커스 관리 (복수 패널)**:
- 여러 노드를 연속 클릭하면 패널이 누적되어 열림
- `panelZIndex`: 포커스된 패널 `30`, 나머지 `20`
- 패널 내부 `mouseDown` → `e.stopPropagation() + onFocus()` → 해당 패널이 최상단(`workingOnEditorNodeId`)
- 패널 내부 `click` → `e.stopPropagation()` → 캔버스 이벤트와 분리

**collabProvider 로딩 UX**:
- collabProvider가 null이면 에디터 영역 대신 "워크스페이스를 불러오는 중..." 표시 (회색, 중앙 정렬)
- provider가 준비되면 즉시 에디터로 교체

---

### 5. 노드 리치 텍스트 에디터

#### 지원 블록 타입
| 블록 | 단축키 / 트리거 |
|------|----------------|
| 제목 H1~H3 | `#` `##` `###` + 스페이스 |
| 글머리 목록 | `-` + 스페이스 |
| 번호 목록 | `1.` + 스페이스 |
| 체크리스트 | `[]` + 스페이스 |
| 인용문 | `>` + 스페이스 |
| 코드 블록 | 백틱 3개 |
| 인라인 코드 | 백틱 1개 |
| 테이블 | — |
| 굵게 / 기울임 / 밑줄 / 취소선 | `Ctrl/Cmd+B/I/U` |
| 마크다운 붙여넣기 | 클립보드 내용을 Lexical 블록으로 자동 변환 (`MarkdownPastePlugin`) |

#### 파일·이미지 첨부 (UX)
- 에디터 패널 하단에 **사진** / **파일** 버튼 고정 표시 (pill, `border: 1px solid #E8E8E8`, 12px)
- **사진 업로드**: `사진` 클릭 → `accept="image/*"` 파일 선택 → `uploadFile(file)` → 이미지 렌더링
  - 이미지 아래: 캡션 input (11px, center-aligned, 회색 `#999`, transparent bg, placeholder "사진 설명")
  - hover 시: 이미지 위 우상단에 × 버튼(20×20px, 반투명 검정 배경 `rgba(0,0,0,0.45)`) 표시
- **파일 업로드**: `파일` 클릭 → 전체 타입 파일 선택 → `uploadFile(file)` → 파일 카드 렌더링
  - 카드: `background: #FAFAFA`, `border: 1px solid #EBEBEB`, 파일 아이콘 + 이름 + 용량
  - 클릭 시: `<a href=url download=name>` 동적 생성으로 다운로드
  - hover 시: 우측 × 버튼(18×18px, `background: #E8E8E8`) 표시
- `input[type=file]` 사용 후 `value = ""` 초기화 — 같은 파일 재선택 가능
- 업로드 실패: `catch {}` silent — UI 변화 없음 (사용자에게 에러 피드백 없음)
- 첨부 state는 에디터 Yjs Doc 외부의 로컬 state — 협업 미동기화, 새로고침 시 초기화

#### 타이틀 동기화
- 에디터 첫 줄 텍스트가 노드 title로 동기화 (`onFirstLineChange` → 500ms debounce → REST PATCH)
- 에디터를 열지 않은 다른 유저: `NODE_UPDATE` WS 이벤트로 타이틀 변경 수신
- `TitleTrackerPlugin`(`editor.registerUpdateListener`)로 첫 줄 추출 (Yjs Y.XmlText delta 방식 불가 — ADR-005 참고)

#### Yjs 협업 동기화
- 노드별 독립적인 Yjs Doc + `SocketIoYjsProvider`
- 소켓 미연결 시 200ms 재시도. 연결되면 즉시 provider 생성
- 초기 동기화: SyncStep1 → SyncStep2 핸드셰이크. `isSynced=true` 전까지 에디터 로딩 상태
- **에러 케이스**: `yjs:join` ack `ok=false` → "워크스페이스를 불러오는 중..." 표시 유지. 재마운트로 복구

#### 전체화면 에디터 (`/workspace/node/{nodeId}`)
- 전체화면에서 에디터: `width: 62.5%`, `minWidth: 300px`, 가운데 정렬, 상단 툴바(`ToolbarPlugin`)
- collabProvider null 시: 화면 전체(`w-full h-full`)에 "워크스페이스를 불러오는 중..." 표시
- collabProvider 준비 후 에디터 표시 (툴바 포함)

---

### 6. 사이드바 리소스 관리

> **중요**: 사이드바의 Workspaces / Resource 데이터는 현재 API 미연동 상태. 하드코딩 더미 초기값(`INITIAL_PROJECTS`, `INITIAL_RESOURCES`)으로 동작하며, 생성·수정 내용이 localStorage/서버에 저장되지 않는다. 새로고침 시 초기화된다.

#### 구조
```
Workspaces (섹션)
  ├── Workspaces 1
  ├── Workspaces 2
  └── + (새 항목 추가)

Resource (섹션)
  ├── Resource n ▼  +
  │     ├── Resource n-1
  │     ├── Resource n-2
  │     └── Resource n-3
  └── Resource n
```

#### Workspaces 섹션 인터랙션
| 인터랙션 | 동작 |
|---------|------|
| 항목 이름 클릭 | 즉시 인라인 편집 모드 (input autoFocus) |
| Enter / blur | 이름 저장 (로컬 state 업데이트만) |
| `+` 버튼 | 빈 이름으로 새 항목 추가, 즉시 편집 모드 |
| 빈 이름 저장 | placeholder "이름 입력..." 회색으로 표시 |

#### Resource 섹션 인터랙션
| 인터랙션 | 동작 |
|---------|------|
| 그룹 이름 클릭 | 즉시 그룹명 편집 모드 |
| 그룹 토글 버튼(`▼`/`▲`) | 서브아이템 펼치기/접기. 서브아이템 없으면 비활성 |
| 그룹 옆 `+` 버튼 | 빈 서브아이템 추가 + 자동 펼침 |
| 서브아이템 **클릭** | 해당 아이템 선택 → 바로 아래 인라인 에디터 펼침. 이미 선택된 아이템 클릭 → 선택 해제(에디터 닫힘) |
| 서브아이템 **더블클릭** | 이름 편집 모드 진입 (선택 해제 후 input autoFocus) |
| 서브아이템 **드래그** | 캔버스에 노드로 드롭 가능 |
| Enter / blur (편집 중) | 이름 저장 |
| 빈 이름 저장 | placeholder "내용을 입력하세요" 회색 표시 |

> 서브아이템 선택(click)과 이름 편집(double-click)은 별개 동작. 선택 = 에디터 열기, 더블클릭 = 이름 수정.

#### 사이드바 인라인 에디터 (UX)
- 선택된 서브아이템 바로 아래에 인라인 `NodeEditorPanel` 삽입
- **`inline=true` 모드**: 콘텐츠 높이 자동 확장 (`autoGrow`)
  - 첨부 없을 때: `minHeight: 150px`
  - 첨부 있을 때: `minHeight: 80px`
- 우상단 ↗ 버튼 → `/workspace/node/{id}?workspaceId={id}` 전체화면 이동
- **최종 수정일** 하단 표시:
  - 형식: `최종 수정일: YYYY. MM. DD. (요일)` (11px, `#AAAAAA`)
  - 서버 저장 시각이 아닌 **클라이언트 측 시각** — 서브아이템 선택 시 또는 에디터 내용 변경 시 `new Date().toISOString()`으로 설정
- `borderTop: 1px solid #F0F0F0`으로 에디터와 날짜 영역 구분

#### 캔버스로 드래그
- 서브아이템 pill을 잡고 캔버스에 드롭하면 해당 이름 + 에디터 내용(markdownBody, jsonBody)이 포함된 노드 생성
- **에디터 내용 포함 조건**: 현재 선택(에디터 열린) 상태인 서브아이템만 최신 내용 포함. 선택되지 않은 아이템은 빈 내용으로 드래그 (`editorContentRef` 기반, ref = state 대신 사용하여 불필요한 리렌더 방지)
- **드래그 시각 피드백**: 서브아이템 pill을 본뜬 custom drag image (동일 스타일 div 생성 → body에 붙임 → `setDragImage` → `requestAnimationFrame`에서 제거)
- **드롭 위치 결정**:
  - 다른 노드 50px 이내: 해당 노드에 snap → 자식 노드로 연결 생성
  - 빈 공간: 드롭 좌표 기준 겹침 없는 위치(`findNonOverlappingPosition`)에 독립 노드 생성
- **에러 처리**: `createMdNode` REST 실패 → `setHoveredNodeId(null)` 후 return, 노드 미생성

---

### 7. 실시간 협업 UX

#### 커서 공유
- 자신의 커서: 브라우저 기본 커서 사용 (WS round-trip 지연 없음)
- 상대방 커서: 포인터 아이콘 + 이름 뱃지로 캔버스 위에 표시 (`CursorOverlay`)
- `document` 레벨 `pointermove` 이벤트로 추적 (캔버스 밖 드래그 중에도 유지)
- 30ms throttle 전송. 유저 퇴장 시 `cursor_leave` 이벤트로 즉시 커서 제거

#### 노드 뷰어 뱃지
- 다른 유저가 특정 노드의 에디터 패널을 열면 해당 노드 위에 아바타 뱃지 표시
- Yjs Awareness의 `openEditorNodeId` 필드를 통해 전파
- 최대 3개 표시, 초과 시 `+N` 회색 뱃지
- 아바타: 이름 첫 글자 대문자, 유저 대표 색상 배경, `2px solid white` 테두리로 겹침 표현
- 유저 퇴장 시: awareness 상태 자동 제거 → 뱃지 즉시 사라짐

#### 현재 접속자 (Presence)
- 상단 헤더에 현재 워크스페이스 접속 중인 다른 유저 아바타 표시
- `presence_state` 이벤트 기반 (자신은 목록에서 제외)

#### 오픈 패널 동기화
- 내가 에디터 패널을 열면 다른 유저 화면에서도 해당 노드 에디터 패널이 자동으로 열림
- Yjs Awareness의 `openNodeIds` 배열을 합집합으로 계산해 `aggregateOpenNodeIds` 결정
- 유저가 떠나면 해당 유저가 연 패널이 다른 유저 화면에서 자동 닫힘 (15초 heartbeat + cleanup)

#### 에디터 협업 커서
- Lexical 에디터 안에서 다른 유저의 커서가 컬러 세로선(2px) + 이름 뱃지(-20px 상단) 표시
- 유저마다 `userId` 해시 기반 결정론적 색상 (같은 userId → 항상 같은 색)

---

### 8. 워크스페이스 초대 / 멤버 관리
- OWNER가 공유 버튼 클릭 → 초대 링크 생성 → `url` + `code` 반환
- 초대 코드로 워크스페이스 참여
- 멤버 목록 모달 — 백엔드 미구현. UI placeholder (`getWorkspaceMembers` 주석 처리)

---

## MVP 제외 사항
- 댓글·멘션 기능
- 버전 히스토리 및 undo/redo (Ctrl+Z 동작 없음)
- 노드 복사/붙여넣기, 다중 선택
- 노드 검색·필터·태그
- 모바일 대응 (데스크톱 전용)
- 첨부파일의 협업 동기화 (현재 로컬 state만)
- 워크스페이스 설정 페이지 (제목 변경, 멤버 권한 변경)
- 멤버 목록 API — 백엔드 미구현으로 `getWorkspaceMembers` 주석 처리
- VIEWER 역할의 에디터 쓰기 차단 클라이언트 적용
- 사이드바 Workspaces/Resource 데이터의 API 연동 및 퍼시스턴스

---

## 알려진 제약 및 UX 한계

### 사이드바 데이터 미퍼시스턴스
Workspaces, Resource, 서브아이템의 생성·이름 변경이 새로고침 시 초기화된다. 로컬 React state에만 저장되며 백엔드 저장 없음.

### 낙관적 업데이트 롤백 없음
REST 실패 시 이미 로컬 state에 반영된 노드/엣지/색상은 롤백되지 않는다. 새로고침 시에만 서버 상태로 복구된다.

### 워크스페이스 1개 고정
`getWorkspaces()` 결과의 `list[0]`만 사용한다. 복수 워크스페이스 전환 UI는 MVP 제외.

### 소켓 재연결 후 그래프 상태 미복구
소켓이 끊겼다 재연결되면 그 사이 변경분이 반영되지 않는다. 새로고침으로만 최신 상태 복구.

### 소켓 재연결 후 Yjs 에디터 재sync 미구현
소켓이 재연결되면 Yjs Provider의 리스너가 새 소켓에 재등록되지 않는다. 에디터 패널을 닫았다 다시 열어야 복구된다.

### 에디터 미열림 시 타이틀 변경 경로
에디터를 열지 않은 유저에게 타이틀 변경은 WS `NODE_UPDATE` 이벤트로만 전달된다. `TitleTrackerPlugin`의 `registerUpdateListener`는 에디터가 마운트된 유저에서만 동작한다.

### 첨부파일 미동기화
이미지·파일 첨부는 패널 로컬 state에만 존재한다. 다른 유저나 새로고침 시 첨부 목록이 초기화된다.

### 업로드 실패 무음 처리
파일·이미지 업로드 실패 시 `catch {}` silent. 사용자에게 에러 피드백 없음.

### 뷰포트 가장자리 에디터 패널
가장자리 노드의 에디터 패널이 캔버스 밖으로 벗어날 수 있다. 자동 재배치 로직 없음 — 사용자가 캔버스 pan으로 직접 조정해야 한다.

### 아카이브 부분 실패
`deleteNode` 병렬 호출 중 일부 실패 시 부분 삭제 상태로 서버와 불일치. 새로고침으로 복구.

---

## 디자인 방향
- 라이트 모드 기준. 배경 `#FFFFFF`, 텍스트 `#2C2C2C`, 포인트 컬러 `#7FD51A` (라임 그린)
- 노드 색상은 파스텔 9색(gray/red/orange/yellow/green/mint/blue/purple/pink)으로 그래프별 구분
- 도구처럼 작동하는 미니멀 UI. 캔버스와 에디터가 주인공, UI 크롬은 최소화
- 모든 인터랙션은 직접적이어야 한다. 불필요한 모달·오버레이·애니메이션 없음
