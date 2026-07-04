#!/usr/bin/env bash
# SessionStart: (1) origin 동기화 확인 — 안전할 때만 자동 pull, 아니면 경고 주입 (2) harness 진행 상태 주입
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# ponytail: blind pull은 진행 중 작업을 덮을 수 있음 — clean tree + fast-forward일 때만 자동, 그 외 경고
if git fetch --quiet 2>/dev/null || env -u GH_TOKEN git fetch --quiet 2>/dev/null; then
  behind=$(git rev-list --count 'HEAD..@{u}' 2>/dev/null || echo 0)
  if [ "${behind:-0}" -gt 0 ]; then
    if git diff --quiet && git diff --cached --quiet && git merge-base --is-ancestor HEAD '@{u}' 2>/dev/null; then
      # fetch는 위에서 완료 — 네트워크 불필요한 ff merge로 동기화 (pull은 fetch를 중복 수행)
      git merge --ff-only --quiet '@{u}' 2>/dev/null \
        && echo "✅ SessionStart: origin에서 ${behind}개 커밋 자동 pull 완료 (브랜치: $(git branch --show-current))" \
        || echo "⚠️ SessionStart: fast-forward 동기화 실패. 수동으로 pull 상태를 확인할 것."
    else
      echo "⚠️ SessionStart: 현재 브랜치가 origin보다 ${behind}커밋 뒤처져 있으나 작업 트리가 dirty이거나 분기 상태라 자동 pull을 생략했다. 작업 시작 전 원격 변경 동기화를 먼저 처리할 것."
    fi
  fi
else
  echo "⚠️ SessionStart: git fetch 실패 (네트워크 또는 인증 문제). 원격 최신 여부를 확인하지 못했다."
fi

[ -f phases/index.json ] || exit 0
echo "## Harness 진행 상태 (phases/index.json — 자동 주입)"
cat phases/index.json
for f in phases/*/index.json; do
  [ -e "$f" ] || continue
  echo "--- $f"
  cat "$f"
done
exit 0
