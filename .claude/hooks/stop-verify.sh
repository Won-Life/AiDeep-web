#!/usr/bin/env bash
# Stop hook: ts/tsx 변경이 있으면 tsc → lint → test를 강제. 실패 시 exit 2로 Claude에게 피드백.
input=$(cat)
case "$input" in
  *'"stop_hook_active":true'* | *'"stop_hook_active": true'*) exit 0 ;;  # 무한 루프 방지
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
git diff --quiet && git diff --cached --quiet && exit 0
changed=$({ git diff --name-only HEAD; git ls-files --others --exclude-standard; } 2>/dev/null)
echo "$changed" | grep -qE '\.(ts|tsx)$' || exit 0

run() {
  local out
  if ! out=$("$@" 2>&1); then
    {
      echo "❌ Stop hook 검증 실패: $*"
      echo "$out" | tail -40
    } >&2
    exit 2
  fi
}
run yarn tsc --noEmit
run yarn lint
run yarn test
exit 0
