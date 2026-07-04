# 프로젝트: aideep (client)

## 기술 스택
- Next.js 16 (App Router, React Compiler 활성화)
- React 19.2 + TypeScript strict mode
- Tailwind CSS v4
- @xyflow/react — 그래프 캔버스
- Lexical + @lexical/yjs — 리치 텍스트 에디터 (협업 동기화)
- Yjs + Socket.IO — CRDT 실시간 협업
- D3.js — 노드 충돌 방지 force simulation
- Axios — HTTP 클라이언트 (JWT interceptor + 401 refresh queue)

## 아키텍처 규칙
- CRITICAL: `src/api/`는 Next.js API Routes가 **아님**. 외부 백엔드를 호출하는 클라이언트 사이드 HTTP 유틸 함수 모음. `src/app/api/` 폴더는 이 프로젝트에 없으며 새로 만들지 않는다.
- CRITICAL: 외부 백엔드 직접 호출 금지. 모든 HTTP 요청은 `/api/*` 경로로 보내고, Next.js rewrites(`next.config.ts`)가 `API_ORIGIN`으로 포워딩한다.
- CRITICAL: 그래프 데이터(노드·엣지)는 WebSocket이 단일 진실 소스. SWR·TanStack Query를 도입하지 않는다. 이유는 `src/api/README.md` 참고.
- CRITICAL: 본인이 생성한 노드·엣지의 WS 이벤트는 `currentUserId`로 필터링한다 (Optimistic Update 패턴, race condition 방지). `useWorkspaceWS.ts` 참고.
- 앱 전체가 `'use client'` 기반. 캔버스·에디터 인터랙션 특성상 Server Components는 사용하지 않는다.
- 기능 단위 코드는 `src/features/{domain}/`에, 공통 UI는 `src/components/`에, 타입은 `src/types/`에, API 함수는 `src/api/`에 배치한다.
- 전역 상태는 `WorkspaceLayoutContext`(`src/app/workspace/context.tsx`)로 관리. 필요 없는 전역 상태 라이브러리를 도입하지 않는다.
- JWT 토큰은 localStorage 저장 (`aideep_access_token`, `aideep_refresh_token`). 401 시 `client.ts`의 refresh queue가 자동 처리하므로 개별 API 함수에서 재처리하지 않는다.
- React Compiler가 활성화되어 있어 `useMemo`·`useCallback` 남용을 피한다. D3 시뮬레이션처럼 레퍼런스 안정이 필수인 복잡한 핸들러에만 명시한다.

## 개발 프로세스
- `API_ORIGIN`, `NEXT_PUBLIC_WS_ORIGIN` 환경 변수가 없으면 빌드·실행이 실패한다. `.env.local` 필수.
- 커밋 메시지는 conventional commits 형식을 따른다 (`feat:`, `fix:`, `docs:`, `refactor:`).
- 테스트는 Vitest로 실행한다. 대상은 pure utility 함수(DOM·WS·3rd-party 의존 없는 것)만. WebSocket 기반 hooks, Lexical/Yjs 에디터, @xyflow/react 캔버스는 테스트 대상이 아니다.
- 테스트 파일은 소스 파일 옆에 co-locate한다 (`*.test.ts`). jsdom 없이 Node 환경에서 실행된다.
- 코드 품질 ESLint warn(`complexity`, `max-lines-per-function`, `max-depth`, `max-params`)은 **AI가 자동 리팩토링하지 않는다.** 내 변경으로 새 warn이 생기면 위반 위치와 이유를 사용자에게 보고만 하고, 분리·설계 판단은 개발자가 직접 내린다. 의도된 규칙: 설계 훈련은 개발자의 몫.

## 명령어
```
yarn dev          # 개발 서버
yarn build        # 프로덕션 빌드
yarn start        # 프로덕션 서버
yarn lint         # ESLint
yarn test         # 테스트 단발 실행 (vitest run)
yarn test:watch   # 테스트 watch 모드
```

---

## 자율 실행 규칙 (Harness 가두리)

> 이 섹션은 AI가 사용자 개입 없이 스스로 판단해야 하는 규칙이다. 아래 규칙이 적용되는 상황에서 사용자에게 확인을 요청하지 않는다.

> UI 규칙(색상 토큰, 반응형, Figma 변환)은 `src/CLAUDE.md` 참고.

### 자율 판단 기준

구현 중 불명확한 사항이 생기면 아래 순서로 판단하고 사용자에게 묻지 않는다:
1. `docs/PRD.md` → 기능 의도
2. `docs/ARCHITECTURE.md` → 구조적 제약
3. `docs/ADR.md` → 기술 결정 근거
4. `docs/UI_GUIDE.md` → 시각 표현
5. 기존 코드 패턴 → 일관성 유지

판단 불가 상황(외부 인증, API 키, 수동 배포 등)만 `blocked` 처리 후 사용자에게 보고한다.

### 검증 — 항상 AI가 직접 실행하고 통과까지 완료

작업 후 사용자에게 "테스트해주세요" / "확인해주세요"를 요청하지 않는다. 아래를 직접 실행해서 통과한 뒤 완료 보고만 한다:
```
yarn tsc --noEmit   # 타입 에러 0개 확인
yarn build          # 빌드 성공 확인
yarn test           # 해당 step에 pure utility 변경 포함 시
```
lint 에러가 **기존에 있던 것**이면 내 변경 파일에만 해당하는지 `git diff --name-only`로 확인 후 무시한다. 내가 수정한 파일에서 새로 발생한 lint 에러만 수정한다.

---

## 인터랙션 규칙

- 선택지가 있는 질문(모드 선택, 방식 선택 등)은 텍스트로만 묻지 않고 `AskUserQuestion` 툴을 사용해 버튼 UI로 제공한다.

---

## 주석 규약 (Communication Tags)

### 사용자 태그 — 단일 라인

| 태그         | 용도                                                                                 |
| ------------ | ------------------------------------------------------------------------------------ |
| `// TODO:`     | 구체적인 작업 지시 및 요구사항                                                       |
| `// REASON:` | 사용자의 가설, 의문, 논리적 근거 제시 → AI는 이에 대해 반드시 논리적으로 응답해야 함 |

### AI 응답 태그 — 블록 (필수)

모든 설계 결정이나 코드 제안 시, 상단에 아래 `CONTEXT` 블록을 포함한다.

**구조:**

```typescript
/*
 * CONTEXT
 * - Problem      : (문제의 본질 및 사용자의 제안에서 발견된 논리적 허점)
 * - Why          : (이 해결책을 선택한 명확한 근거와 논리 — 성능, 확장성, DX 관점)
 * - Alternatives : (비교군이었던 대안들과 채택되지 못한 이유)
 * - Trade-offs   : (이 선택으로 얻는 이점 vs 감수해야 할 리스크)
 * - Edge Case    : (설계 시 고려한 핵심 예외 상황들)
 */
```
