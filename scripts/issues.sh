#!/usr/bin/env bash
# 담당 GitHub 이슈를 마감(milestone.dueOn) 가까운 순으로 정렬해 표로 출력
set -euo pipefail
gh issue list --assignee @me --state open --json number,title,milestone,labels --limit 100 |
python3 -c '
import json, sys

issues = json.load(sys.stdin)
issues.sort(key=lambda i: ((i.get("milestone") or {}).get("dueOn") is None,
                           (i.get("milestone") or {}).get("dueOn") or "",
                           i["number"]))
print("담당 이슈 목록 (마감 가까운 순)")
print("─" * 60)
for i in issues:
    m = i.get("milestone") or {}
    due = (m.get("dueOn") or "")[:10] or "없음"
    ms = m.get("title") or "-"
    labels = ",".join(l["name"] for l in i.get("labels") or [])
    tag = f" [{labels}]" if labels else ""
    num, title = i["number"], i["title"]
    print(f"  #{num:<4} [마감: {due}] [{ms}]{tag} {title}")
print("─" * 60)
'
