---
name: harness
description: 이 프로젝트의 Harness 프레임워크. GitHub 이슈 기반 협업 모드(A) 또는 step 파일 기반 자동 실행 모드(B)로 작업을 진행한다.
---

# Harness

## 실행 환경 (hook이 자동 강제 — 프롬프트로 재확인하지 않는다)

- **rtk** — 모든 Bash 커맨드가 전역 hook에 의해 `rtk <cmd>`로 재작성되어 출력이 압축된다. 압축된 출력을 에러로 오인하지 않는다. 원본 출력이 필요하면 `rtk proxy <cmd>`.
- **ponytail (full)** — 최소 코드 원칙(YAGNI, 기존 패턴 재사용 우선). 새 의존성 추가(`yarn add` 등)는 프로젝트 hook이 차단한다. 사용자가 명시 승인한 경우에만 `SKIP_GUARD=1` 접두로 우회한다. trust boundary의 입력 검증·에러 처리·보안은 단순화 대상이 아니다.
- **Stop hook** — ts/tsx 변경이 있는 상태로 턴을 마치면 `yarn tsc --noEmit` → `yarn lint` → `yarn test`가 자동 실행되고, 실패 시 피드백이 돌아온다. 따라서 phase 완료 전에는 `yarn build`만 직접 실행하면 된다.
- **commit hook** — conventional commits 형식(`feat:`, `fix:`, ...)이 아닌 커밋 메시지는 차단된다.
- **push hook** — dev/main 직접 push는 차단된다. 모든 변경은 feature 브랜치에서 PR(`gh pr create --base dev`)로 올린다.
- **SessionStart hook** — origin을 fetch해서 뒤처진 커밋이 있으면 자동 fast-forward pull(클린 트리일 때만)하거나 경고를 주입한다. `phases/*/index.json` 진행 상태도 함께 주입된다.

## 시작 절차

1. `cat .claude/skills/harness/pipeline.txt` 를 실행해 파이프라인을 사용자에게 그대로 보여준다 (직접 재작성하지 않는다 — 출력 토큰 절약).
2. AskUserQuestion으로 모드를 선택하게 한다 (A 협업 / B 자동 실행).
3. **선택된 모드의 파일만** Read 한다 (컨텍스트 절약 — 다른 모드 파일은 읽지 않는다):
   - A → `.claude/skills/harness/mode-a.md`
   - B → `.claude/skills/harness/mode-b.md`
