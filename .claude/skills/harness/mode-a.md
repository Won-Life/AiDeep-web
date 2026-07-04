# 모드 A: 협업 모드

## 1. 이슈 조회 및 선택

```bash
bash scripts/issues.sh
```

스크립트가 마감(milestone.dueOn) 가까운 순으로 정렬·포맷된 표를 출력한다.

- 이 출력을 **가공 없이 전부** 채팅에 보여준다. 이슈가 아무리 많아도 텍스트 목록은 절대 생략·요약하지 않는다.
- 그 다음 AskUserQuestion으로 선택받는다. 버튼은 최대 4개이므로 마감 임박 4건만 버튼에 담고, 질문 문구에 "목록에 없는 이슈는 Other에 번호 입력"을 명시한다.

## 2. 이슈 분석 및 파일 안내

```bash
gh issue view {N} --json title,body,labels,milestone,comments
```

`docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ADR.md`, `docs/UI_GUIDE.md`를 읽는다.
Explore 에이전트를 사용해 이슈와 연관된 파일을 찾는다.
아래 형식으로 **확인 권장 파일 목록**을 안내한다:

```
이슈 #42 — 로그인 버튼 UI 수정
────────────────────────────────────────────────────
확인 권장 파일 (변경 전 읽어두세요):
  📄 src/features/auth/LoginButton.tsx    ← 주요 변경 대상
  📄 docs/UI_GUIDE.md                     ← 디자인 토큰 기준
────────────────────────────────────────────────────
```

## 3. 브랜치 생성 — 반드시 `gh issue develop`로 (이슈 Development 연결)

```bash
git checkout dev && git pull origin dev
gh issue develop {N} --base dev --name feat/issue-{N}-{slug} --checkout
```

`{slug}`: 이슈 제목에서 영문 키워드만 추출해 kebab-case로 변환, 최대 5단어.

`git checkout -b`가 아니라 `gh issue develop`를 쓰는 이유: 브랜치가 이슈에 연결된 상태로 생성되어(Development 섹션), 이후 이 브랜치에서 만든 PR이 이슈의 Development에 **자동 표시**된다. base가 dev인 PR은 `Closes` 키워드가 무시되고, 기존 브랜치·PR을 소급 연결하는 API도 없으므로 이 시점이 유일한 자동 연결 기회다.

## 4. Phase 분해 및 승인

이슈를 큰 작업 단위(phase)로 분해한다.

- 1 phase = 1 관심사 (타입 정의 / API 레이어 / UI 컴포넌트 / 통합·테스트 등)
- 각 phase는 독립적으로 빌드·테스트 가능해야 한다
- 일반적으로 2~4개. 단순한 이슈는 1~2개로 충분하다

아래 형식으로 제시한 뒤 **AskUserQuestion으로 승인을 받은 후 실행한다:**

```
Phase 계획
──────────────────────────────────────────────────
  Phase 1 [types]      — 새 타입 정의 및 기존 타입 수정
  Phase 2 [api-layer]  — API 함수 및 WS 이벤트 핸들러
  Phase 3 [ui]         — 컴포넌트 구현 및 스타일 적용
──────────────────────────────────────────────────
```

## 5. 실행 주체 결정 (Phase 시작 전 판단)

각 phase를 시작하기 전에 **누가 코드를 작성할지** 판단하고 AskUserQuestion으로 제안한다.

**사용자 직접 작성 권장:**
- 직접 구현해본 경험이 없을 것 같은 패턴 (학습 가치)
- 면접에서 "어떻게 구현했어요?" 질문이 나올 수 있는 코드
- 아키텍처 결정이 포함되어 손으로 써봐야 이해가 깊어지는 경우
- 이 phase의 핵심 로직이 이슈의 본질인 경우

**Claude 자동 실행 권장:**
- 코드베이스에 동일 패턴이 있고 반복·확장하는 작업
- 보일러플레이트, 설정, 타입 정의 등 기계적 작업
- 여러 파일에 걸친 단순 반복 수정 (리네임, 필드 추가 등)
- 이미 함께 설계 완료하여 구현이 번역 수준인 경우

제안 형식: `추천: 직접 작성 / Claude 자동 실행 + 판단 근거 한 줄`. 사용자가 다른 선택을 해도 그대로 따른다.

## 5-A. Phase 실행 — Claude 자동 실행 선택 시

### 추론 프로토콜 (코딩 시작 전 필수 — 생략 금지)

```
[Phase {N} 추론]
────────────────────────────────────────────────────
문제 재정의  : "어떤 상태에서 어떤 상태로" 1줄
전제 조건    : 사전에 참이어야 하는 것들
불변식       : 구현 중·후에도 깨지면 안 되는 것들 (예: WS 단일 진실 소스)
핵심 제약    : 선택의 폭을 좁히는 기술·아키텍처·UX 제약
접근법 도출  : 제약 → 해법 순서로 1-3줄
반례 점검    : 이 접근이 틀릴 수 있는 상황과 대응
────────────────────────────────────────────────────
```

### 자율 실행 규칙

- 권한 허락을 요청하지 않는다. 블록 상황(API 키 없음, 외부 인증 등)이 아닌 이상 중단하지 않는다.
- 가드레일 우선순위: CLAUDE.md CRITICAL > docs/ARCHITECTURE.md > docs/ADR.md > docs/UI_GUIDE.md > docs/PRD.md
- UI 작업 시 Figma MCP(`mcp__plugin_figma_figma__*`)로 디자인 컨텍스트를 가져온다.

### 검증 (phase 완료 전)

```bash
yarn build          # 빌드 성공 확인 — 직접 실행
```

`tsc --noEmit`·`lint`·`test`는 Stop hook이 턴 종료 시 자동 실행·강제하므로 별도 실행하지 않아도 되지만, 실패 피드백이 오면 스스로 수정 후 재검증한다. 3회 시도 후에도 실패하면 blocked로 처리하고 사유를 보고한다.

### Phase 보고서

`phases/{issue-slug}/phase{N}-{name}.md`를 생성한다. 템플릿: `.claude/skills/harness/report-template.md`의 "Phase 보고서" 섹션.

보고서를 채팅에 요약 출력하고 대기한다:
**"Phase {N} 완료. 보고서: `phases/{issue-slug}/phase{N}-{name}.md` — 검토 후 다음 phase 진행을 알려주세요."**

## 5-B. Phase 실행 — 사용자 직접 작성 선택 시

- 추론 프로토콜을 먼저 함께 정리해준다
- 막히면 힌트를 주되 코드를 직접 써주지 않는다
- 사용자가 완료하면 `yarn build`를 대신 실행하고 결과를 보고한다 (tsc/lint/test는 Stop hook이 처리)
- 보고서는 Claude가 작성하되, 설계 결정 칸에는 사용자가 선택한 접근법과 이유를 기록한다

## 6. 전체 완료 → 리뷰 게이트 → PR 생성

PR 생성 전에 반드시 아래 두 리뷰를 순서대로 실행한다:

1. **Skill `ponytail:ponytail-review`** — 과설계·불필요 코드 탐지. 발견 사항은 즉시 정리(삭제·단순화)한다.
2. **Skill `security-review`** — 브랜치 변경분 보안 리뷰. 발견 사항 수정 후 재확인.

통과 후:

```bash
git add -A
git commit -m "feat(issue-{N}): {이슈 제목 한 줄 요약}"   # 형식은 commit hook이 검증
gh pr create --base dev --title "feat(issue-{N}): {이슈 제목}" --body "..."
```

PR 본문 템플릿: `.claude/skills/harness/report-template.md`의 "PR 본문" 섹션. 간결하게, 의사결정 중심으로.

### 이슈 자동 연결 (Development 섹션)

- **base가 default 브랜치가 아닌 PR에서는 `Closes #{N}` 키워드가 무시된다** — Development 연결도, 이슈 auto-close도 안 된다. 연결은 3단계의 `gh issue develop`가 만든 브랜치-이슈 연결이 담당한다.
- PR 생성 후 `gh issue develop --list {N}`으로 브랜치가 이슈에 연결돼 있는지 확인한다. 누락됐다면(브랜치를 `git checkout -b`로 만든 경우) 소급 연결 API가 없으므로 GitHub 이슈 페이지 Development 섹션에서 수동 연결하고 사용자에게 보고한다.
- `Closes #{N}`은 본문 첫 줄에 그대로 유지한다 — 자동 동작은 없지만 리뷰어가 대상 이슈를 바로 찾는 관례적 표기.
