#!/usr/bin/env bash
# SessionStart: 진행 중인 harness task 상태를 세션 컨텍스트로 자동 주입
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -f phases/index.json ] || exit 0
echo "## Harness 진행 상태 (phases/index.json — 자동 주입)"
cat phases/index.json
for f in phases/*/index.json; do
  [ -e "$f" ] || continue
  echo "--- $f"
  cat "$f"
done
exit 0
