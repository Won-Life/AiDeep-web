# 에디터 도메인 규칙

## NodeEditorPanel 3가지 모드

| 모드 | props | 특이사항 |
|------|-------|---------|
| 기본 (캔버스 패널) | 기본값 | `absolute top:100%`, `mouseDown stopPropagation` |
| 인라인 (사이드바) | `inline=true` | `noMediaDrop`, 최종 수정일(클라이언트 시각) 표시 |
| 전체화면 | `fullscreen=true` | `w-[62.5%] min-w-[300px]`, ToolbarPlugin 포함 |

## collabProvider null 처리 (필수)

provider가 null인 상태(소켓 연결 전)를 반드시 처리한다.

| 모드 | provider null 시 |
|------|----------------|
| 기본 | "워크스페이스를 불러오는 중..." (panel 높이 내 중앙) |
| 전체화면 | `w-full h-full` "워크스페이스를 불러오는 중..." |
| 인라인 | null 그대로 NotionEditor에 전달 (에디터 내부 처리) |

## Yjs Provider 생명주기 (`useYjsProvider`)

- `SocketIoYjsProvider` 는 `src/lib/SocketIoYjsProvider.ts`를 사용한다. 외부 패키지로 교체 금지.
- 소켓 미연결 시 200ms 재시도 루프. `cancelled` 플래그로 unmount 후 zombie provider 생성 방지.
- `doc:update` origin === this → 서버발 업데이트 재전송 방지 (무한 루프 차단). 이 가드 제거 금지.
- unmount 순서: `yjs:leave` emit → `_unregisterSocketListeners` → `awareness.destroy` → `doc.destroy`.

## 협업 Awareness (워크스페이스 레벨)

- `openNodeIds` awareness field: 내가 열고 있는 에디터 패널 목록 → 다른 유저 화면에서 `showInputBox=true`.
- `openEditorNodeId` awareness field: 현재 포커스된 패널 → 아바타 뷰어 뱃지 표시.
- cleanup 시 `removeAwarenessStates([clientID])` + 15초 heartbeat `clearInterval` 필수.
