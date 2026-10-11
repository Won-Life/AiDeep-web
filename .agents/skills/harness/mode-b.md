# 모드 B: 자동 실행 모드

execute.py는 `phases/{task-name}/index.json`과 `phases/{task-name}/step{N}.md` 파일이 준비된 상태에서만 실행할 수 있다. 파일이 없으면 아래 B-1~B-4 단계로 먼저 설계한다.

## B-1. 탐색

`docs/` 하위 문서(PRD, ARCHITECTURE, ADR 등)를 읽고 프로젝트의 기획·아키텍처·설계 의도를 파악한다. 필요시 Explore 에이전트를 병렬로 사용한다.

## B-2. 논의

구현을 위해 구체화하거나 기술적으로 결정해야 할 사항이 있으면 사용자에게 제시하고 논의한다. 선택지가 있는 질문은 AskUserQuestion을 사용한다.

## B-3. Step 설계

사용자가 구현 계획 작성을 지시하면 여러 step으로 나뉜 초안을 작성해 피드백을 요청한다.

설계 원칙:

1. **Scope 최소화** — 하나의 step에서 하나의 레이어 또는 모듈만 다룬다. 여러 모듈을 동시에 수정해야 하면 step을 쪼갠다.
2. **자기완결성** — 각 step 파일은 독립된 Claude 세션에서 실행된다. "이전 대화에서 논의한 바와 같이" 같은 외부 참조는 금지한다. 필요한 정보는 전부 파일 안에 적는다.
3. **사전 준비 강제** — 관련 문서 경로와 이전 step에서 생성/수정된 파일 경로를 명시한다. 세션이 코드를 읽고 맥락을 파악한 뒤 작업하도록 유도한다.
4. **시그니처 수준 지시** — 함수/클래스의 인터페이스만 제시하고 내부 구현은 에이전트 재량에 맡긴다. 단, 설계 의도에서 벗어나면 안 되는 핵심 규칙(멱등성, 보안, 데이터 무결성 등)은 반드시 명시한다.
5. **AC는 실행 가능한 커맨드** — "~가 동작해야 한다" 같은 추상적 서술이 아닌 `yarn build` 같은 실제 실행 가능한 검증 커맨드를 포함한다.
6. **주의사항은 구체적으로** — "조심해라" 대신 "X를 하지 마라. 이유: Y" 형식으로 적는다.
7. **네이밍** — step name은 kebab-case slug로, 해당 step의 핵심 모듈/작업을 한두 단어로 표현한다 (예: `project-setup`, `api-layer`, `auth-flow`).

## B-4. 파일 생성

사용자가 승인하면 아래 파일들을 생성한다.

### `phases/index.json` (전체 현황)

여러 task를 관리하는 top-level 인덱스. 이미 존재하면 `phases` 배열에 새 항목을 추가한다.

```json
{
  "phases": [
    { "dir": "0-mvp", "status": "pending" }
  ]
}
```

### `phases/{task-name}/index.json` (task 상세)

```json
{
  "project": "aideep",
  "phase": "{task-name}",
  "steps": [
    { "step": 0, "name": "project-setup", "status": "pending" },
    { "step": 1, "name": "api-layer",     "status": "pending" }
  ]
}
```

- `steps[].step`: 0부터 시작하는 순번
- `steps[].status`: 초기값은 모두 `"pending"`
- 타임스탬프(`completed_at`, `failed_at`, `blocked_at`)는 execute.py가 자동 기록한다. 생성 시 넣지 않는다.

### `phases/{task-name}/step{N}.md` (각 step마다 1개)

````markdown
# Step {N}: {이름}

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md`
- `docs/ADR.md`
- {이전 step에서 생성/수정된 파일 경로}

## 작업

{구체적인 구현 지시. 파일 경로, 클래스/함수 시그니처, 로직 설명을 포함.
코드 스니펫은 인터페이스/시그니처 수준만 제시하고, 구현체는 에이전트에게 맡겨라.
단, 설계 의도에서 벗어나면 안 되는 핵심 규칙은 명확히 박아넣어라.}

## Acceptance Criteria

```bash
yarn tsc --noEmit  # 타입 에러 없음
yarn build         # 빌드 에러 없음
yarn test          # 유틸리티 테스트 통과 (pure utility 함수 포함 시)
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/{task-name}/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- {X를 하지 마라. 이유: Y}
````

## B-5. 실행

파일이 준비되면 터미널에서 실행한다:

```bash
python3 scripts/execute.py {task-name}        # 순차 실행
python3 scripts/execute.py {task-name} --push  # 실행 후 push
```

execute.py 자동 처리 항목:
- `feat-{task-name}` 브랜치 생성/checkout
- CLAUDE.md + docs/*.md를 매 step 프롬프트에 가드레일로 주입
- 완료된 step summary를 다음 step 컨텍스트에 누적 전달
- 실패 시 최대 3회 자동 재시도 (이전 에러를 프롬프트에 피드백)
- feat 커밋(코드) + chore 커밋(메타데이터) 분리
- started_at, completed_at, failed_at, blocked_at 자동 기록

**에러 복구:** `phases/{task-name}/index.json`에서 해당 step의 `status`를 `"pending"`으로 바꾸고 `error_message` 삭제 후 재실행한다.
