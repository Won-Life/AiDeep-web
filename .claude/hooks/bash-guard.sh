#!/usr/bin/env bash
# PreToolUse(Bash) 가드: 위험 명령 차단 + 새 의존성 추가 차단(ponytail) + conventional commit 검증
# 우회: 사용자가 명시 승인한 경우에만 커맨드에 SKIP_GUARD=1 접두를 붙인다.
cmd=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null)
[ -z "$cmd" ] && exit 0
case "$cmd" in *SKIP_GUARD=1*) exit 0 ;; esac

if echo "$cmd" | grep -qE 'rm\s+-rf|git\s+push\s+--force|git\s+reset\s+--hard|DROP\s+TABLE'; then
  echo 'BLOCKED: 위험한 명령어가 감지되었습니다.' >&2
  exit 2
fi

if echo "$cmd" | grep -qE 'gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-(ant-)?[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}'; then
  echo 'BLOCKED: 토큰/시크릿 리터럴이 커맨드에 포함됨. 값을 직접 쓰지 말고 환경 변수로 참조하라 (예: $GH_TOKEN). 리터럴은 셸 히스토리·세션 기록·permission 목록에 평문으로 남는다.' >&2
  exit 2
fi

if echo "$cmd" | grep -qE '(yarn|pnpm)\s+add\s+|npm\s+i(nstall)?\s+[^- ]'; then
  echo 'BLOCKED: 새 의존성 추가 금지(ponytail). 기존 의존성·stdlib·네이티브 기능으로 해결하라. 사용자가 명시 승인한 경우에만 SKIP_GUARD=1 접두로 재실행.' >&2
  exit 2
fi

if echo "$cmd" | grep -qE 'git\s+push'; then
  # ponytail: 휴리스틱 — 명시적 dev/main 타깃 또는 (refspec 생략 시) 현재 브랜치가 dev/main이면 차단
  if echo "$cmd" | grep -qE 'git\s+push[^;&|]*[[:space:]:](dev|main)([[:space:]]|$)'; then
    echo 'BLOCKED: dev/main 직접 push 금지. feature 브랜치에서 PR을 생성하라 (gh pr create --base dev).' >&2
    exit 2
  fi
  if ! echo "$cmd" | grep -qE 'git\s+push\s+(-\S+\s+)*\S+\s+\S+'; then
    br=$(cd "${CLAUDE_PROJECT_DIR:-.}" && git branch --show-current 2>/dev/null)
    if [ "$br" = "dev" ] || [ "$br" = "main" ]; then
      echo "BLOCKED: 현재 브랜치($br)로의 직접 push 금지. feature 브랜치에서 PR을 생성하라." >&2
      exit 2
    fi
  fi
fi

if echo "$cmd" | grep -qE '(^|[;&|]\s*|rtk\s+)git\s+commit' && echo "$cmd" | grep -qE '\-m'; then
  # ponytail: 단순 -m "..." 형태와 heredoc 본문 첫 줄만 검사하는 휴리스틱. 오탐 시 SKIP_GUARD=1로 우회.
  types='(feat|fix|docs|refactor|chore|test|style|perf|ci|build)'
  if ! echo "$cmd" | grep -qE "\\-m\\s+[\"']\\s*${types}(\\([^)]*\\))?!?:" \
     && ! echo "$cmd" | grep -qE "^${types}(\\([^)]*\\))?!?:"; then
    echo 'BLOCKED: 커밋 메시지는 conventional commits 형식이어야 한다 (feat:|fix:|docs:|refactor:|chore:|test:|style:|perf:|ci:|build:).' >&2
    exit 2
  fi
fi
exit 0
