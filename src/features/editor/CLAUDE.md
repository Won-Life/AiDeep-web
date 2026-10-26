# 에디터 도메인 규칙

## NodeEditorPanel 4가지 모드

| 모드 | props | 특이사항 |
|------|-------|---------|
| 우측 도크 (C3/C4) | `dockIndex` (number) | 캔버스 우측에 `fixed` 도크. React Flow 뷰포트 transform 안에서 fixed가 안 먹어 `createPortal`로 document.body에 렌더. 헤더에 경로(`프로젝트 > 타이틀`)+제목. **portal의 React 합성 이벤트는 React 트리로 버블하므로 컨테이너에 `onClick stopPropagation` 필수** — 없으면 패널 클릭이 `onNodeClick`을 재발화해 방금 닫은 패널이 다시 열린다. 본문·첨부는 인라인 모드와 동일. TextUpdateNode가 열린 에디터에 `dockIndex`(순번)를 넘겨 캔버스 에디터는 이 모드로 뜬다. |
| 기본 (캔버스 패널) | 기본값(dockIndex 없음) | `absolute top:100%`, `mouseDown stopPropagation`. dockIndex 도입 후 캔버스에선 미사용(폴백으로 유지). |
| 인라인 (사이드바) | `inline=true` | 본문 파일 드래그·드롭 업로드, 최종 수정일(클라이언트 시각) 표시 |
| 전체화면 | `fullscreen=true` | `w-[62.5%] min-w-[300px]`, ToolbarPlugin 포함 |

## collabProvider null 처리 (필수)

- 도크·인라인·전체화면의 편집 가능한 본문에서 기존 `DragDropPlugin`을 사용한다. 현재 한 번에 첫 파일 1개를 업로드하고 문서 끝에 링크로 삽입한다(응답 대기 중 선택한 본문을 대체하지 않음). 잠긴 노드에서는 native capture 단계에서 기본 동작과 상위 drop 전파를 막되 업로드하지 않으며 업로드 도중 잠기면 `MediaPlugin`이 삽입을 차단한다.

provider가 null인 상태(소켓 연결 전)를 반드시 처리한다.

| 모드 | provider null 시 |
|------|----------------|
| 기본 | "워크스페이스를 불러오는 중..." (panel 높이 내 중앙) |
| 전체화면 | `w-full h-full` "워크스페이스를 불러오는 중..." |
| 인라인 | null 그대로 NotionEditor에 전달 (에디터 내부 처리) |

## 본문 첨부 미리보기

- 서버 업로드 URL로 인식되는 단독 링크 문단만 `AttachmentPreviewPlugin`이 확장한다. 일반 인라인 웹 링크는 기존 동작을 유지한다.
- 이미지·PDF는 기본 미리보기, DOC·DOCX·HWP·MD는 파일 카드로 표시한다. 우클릭 또는 `⋯` 메뉴에서 `미리보기로 표시 / 파일로 표시 / 크게 보기`를 제공한다. PDF iframe 내부 우클릭은 브라우저 영역이므로 첨부 헤더 또는 옵션 버튼을 사용한다.
- 저장 노드는 표준 `LinkNode`를 유지한다. 미리보기 DOM은 contenteditable 바깥 형제 포털에만 있고 링크 아래 여백·좌표를 `useAttachmentPreviews`에서 관측한다. 전용 ImageNode/FileNode를 새로 삽입하지 않는다(원격 웹소켓 마크다운 등록 노드에 없음).
- 표시 선택은 링크 `title`의 `onnode-attachment:v1:file:` 메타데이터로 보존한다. 기존 제목은 인코딩해 보관하고 미리보기로 복귀하면 복원한다. URL을 변경하거나 파일을 재업로드하지 않는다.
- 읽기 전용 상태에서는 표시 변경을 차단하되 보기·다운로드는 유지한다. 이미지 로딩 실패 안내와 기존 모달 뷰어를 재사용한다.

## Yjs Provider 생명주기 (`useYjsProvider`)

- `SocketIoYjsProvider` 는 `src/lib/SocketIoYjsProvider.ts`를 사용한다. 외부 패키지로 교체 금지.
- 소켓 미연결 시 200ms 재시도 루프. `cancelled` 플래그로 unmount 후 zombie provider 생성 방지.
- `doc:update` origin === this → 서버발 업데이트 재전송 방지 (무한 루프 차단). 이 가드 제거 금지.
- unmount 순서: `yjs:leave` emit → `_unregisterSocketListeners` → `awareness.destroy` → `doc.destroy`.
- **hover 프리커넥트**: TextUpdateNode는 노드 hover 시점부터 provider를 생성해 클릭 전에 동기화를 선시작한다 (`isNodeHovered || showInputBox`). hover 이탈 시 provider는 파괴된다.
- **동기화 전 로딩 표시**: NotionEditor가 provider `sync` 이벤트를 자체 구독해 `isSynced`를 관리하고, 동기화 전에는 placeholder를 "로딩 중…"으로 표시한다 (prop으로 내려받지 않음 — `on()`이 등록 즉시 현재 상태를 replay).
- TitleTrackerPlugin의 `prevTitleRef` 초기값은 `''` — 동기화 전 빈 문서의 첫 업데이트가 `onChange('')`로 노드 title을 덮어쓰는 것(라벨 깜빡임)을 중복 비교로 흡수한다. `null`로 되돌리지 말 것.

## 협업 Awareness (워크스페이스 레벨)

- `openNodeIds` awareness field: 내가 열고 있는 에디터 패널 목록. **전파는 유지하지만 소비(협업자 에디터 표시)는 비활성화** — 에디터 패널 렌더링은 각 탭의 로컬 `myOpenEditorNodeIds`만 사용한다. 이유: 합집합(`aggregateOpenNodeIds`) 기반 표시는 같은 계정을 다중 탭으로 열면 다른 탭이 연 에디터가 내 탭에 떠서 X·"모든 에디터 닫기"로 닫을 수 없었다(awareness는 자기 client 상태만 수정 가능). 협업자 에디터 표시를 되살리려면 합집합에서 같은 userId의 다른 client를 제외하는 방식으로 복원할 것.
- `openEditorNodeId` awareness field: 현재 포커스된 패널 → 아바타 뷰어 뱃지 표시.
- cleanup 시 `removeAwarenessStates([clientID])` + 15초 heartbeat `clearInterval` 필수.
