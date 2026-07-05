# AI 사이드바 설계 문서

**날짜:** 2026-07-05  
**브랜치:** feat/ai-chatbot-panel

---

## 배경

현재 AI 관련 기능들이 좌하단 `DropDown` 컴포넌트에 몰려 있고, "AI 챗봇 사용하기"를 클릭하면 `AiChatPanel`이 캔버스 위에 플로팅 패널로 뜬다. 이 구조를 오른쪽 고정 사이드바 방식으로 전환한다.

---

## 목표

- AI 기능 진입점을 좌하단 DropDown → 오른쪽 사이드바로 이동
- 기존 플로팅 챗 패널을 사이드바 내부 UI로 통합
- 왼쪽 Sidebar와 대칭적인 UX 제공

---

## 설계

### 레이아웃

```
[왼쪽 Sidebar (260px)] [캔버스] [AI 사이드바 (320px)]
```

- AI 사이드바가 닫혔을 때: 오른쪽 끝에 `VISIBLE_BUTTON_WIDTH(40px)` 탭만 노출
- AI 사이드바가 열렸을 때: 캔버스 우측 경계가 320px만큼 좁아짐
- 캔버스는 `right: aiSidebarWidth` 스타일로 조절 (왼쪽과 동일 방식)

### AI 사이드바 내부 구조

```
+----------------------------+
| AIDeep 도구          [«]  |
|----------------------------|
| [요약] AI 내용 요약         |
| [챗봇] AI 챗봇 사용하기     |  ← 클릭 시 챗 UI 펼쳐짐
| [구조] AI 자동 구조화 (비활성)|
| [사전] 단어 정의 사전 (비활성)|
|----------------------------|
| === 챗봇 영역 (선택 시 표시) ===|
| >> [질문 입력]              |
|                            |
| [AI 응답 카드]              |
+----------------------------+
```

- 도구 목록에서 "AI 챗봇"을 클릭하면 하단에 챗 UI가 펼쳐짐 (토글)
- 챗 UI는 현재 `AiChatPanel`의 로직(question/loading/response phase)을 그대로 재사용
- 아이콘·색상은 현재 `DropDown`의 것을 유지

### 열기/닫기 버튼

- 오른쪽 끝에 세로 탭 형태 (40px 너비 항상 노출)
- 탭 내부에 `«`/`»` 아이콘으로 토글 (왼쪽 Sidebar 동일 패턴)
- sessionStorage에 상태 저장 (`ai_sidebar_open`)

---

## 파일 변경

### 신규
- `src/features/ai/AiSidebar.tsx` — AI 사이드바 전체 컴포넌트

### 수정
- `src/app/graph/layout.tsx`
  - `DropDown`, `AiChatPanel` import 제거
  - `AiSidebar` import 추가
  - `isChatOpen` state 제거
  - `aiSidebarOpen` state 추가
  - `aiSidebarWidth` 로컬 state 추가 (context 불필요, layout 내부에서만 사용)
  - 캔버스 영역 `right` 값을 `aiSidebarWidth`로 지정

### 삭제
- `src/features/chat/AiChatPanel.tsx`
- `src/components/ui/DropDown.tsx`

---

## 상수

```ts
export const AI_SIDEBAR_WIDTH = 320;
export const VISIBLE_BUTTON_WIDTH = 40; // 왼쪽 Sidebar와 동일 값 재사용
```

---

## 트레이드오프

| 항목 | 이점 | 리스크 |
|---|---|---|
| 오른쪽 사이드바 고정 | 항상 일관된 위치, 오버레이 없음 | 양쪽 사이드바 동시 열림 시 캔버스 공간 협소 |
| DropDown 제거 | UI 단순화, 진입점 일원화 | 기존 DropDown 위치에 익숙한 사용자 학습 비용 |
| 챗 UI 사이드바 내 통합 | 플로팅 패널 제거로 캔버스 가독성 향상 | 사이드바 내 스크롤 관리 필요 |

---

## 미구현 (향후)

- AI 내용 요약, AI 자동 구조화, 단어 정의 사전 기능 (현재 비활성 상태 유지)
- 실제 AI API 연동 (현재 mock fetchAiResponse 유지)
