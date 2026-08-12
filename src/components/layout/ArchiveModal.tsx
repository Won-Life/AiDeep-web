/*
 * CONTEXT
 * - Problem      : 보관(soft delete)된 노드를 확인·복원할 수단이 없어 사용자가
 *                  데이터가 영구 삭제된 것으로 오해함 (#203, 피드백 5).
 * - Why          : UserMenu에서 여는 보관함 모달. GET /node/archived로 목록을 읽고
 *                  PATCH /node/:id/restore로 복원한 뒤 캔버스 state에 즉시 삽입한다.
 *                  본인 변경은 REST 응답으로 local state 반영(프로젝트 규칙),
 *                  협업자는 서버의 NODE_CREATE broadcast로 수신한다.
 * - Alternatives : 별도 /archive 페이지 — 워크스페이스 컨텍스트(캔버스 state 삽입)를
 *                  잃고 라우트가 늘어남. 모달이 기존 패턴(멤버 모달 등)과 일관됨.
 * - Trade-offs   : 모달 오픈 시마다 재조회(캐시 없음). 보관 목록은 소규모라 허용.
 * - Edge Case    : 보관 시 엣지가 물리 삭제되므로 복원 노드는 항상 독립 노드로
 *                  돌아온다(연결선 미복원). 모달 카피로 고지한다.
 */
"use client";
import { useEffect, useState } from "react";
import {
  getArchivedNodes,
  restoreNode,
  type ArchivedNode,
} from "@/features/graph/api/nodes";
import { useWorkspaceLayout } from "@/app/workspace/context";
import { DEFAULT_NODE_COLOR } from "@/features/graph/constants/colors";

interface ArchiveModalProps {
  workspaceId: string;
  onClose: () => void;
}

function formatArchivedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(
    d.getDate(),
  ).padStart(2, "0")}.`;
}

export default function ArchiveModal({
  workspaceId,
  onClose,
}: ArchiveModalProps) {
  const { setNodes } = useWorkspaceLayout();
  // null = 로딩 중
  const [items, setItems] = useState<ArchivedNode[] | null>(null);
  const [hasError, setHasError] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getArchivedNodes(workspaceId)
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setHasError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const handleRestore = async (node: ArchivedNode) => {
    if (restoringId) return;
    setRestoringId(node.node_id);
    setHasError(false);
    try {
      await restoreNode(workspaceId, node.node_id);
      setNodes((prev) =>
        prev.some((n) => n.id === node.node_id)
          ? prev
          : [
              ...prev,
              {
                id: node.node_id,
                type: "textUpdater",
                position: { x: node.position_x, y: node.position_y },
                data: {
                  title: node.title,
                  color: node.content?.color ?? DEFAULT_NODE_COLOR.bg,
                  textColor:
                    node.content?.textColor ?? DEFAULT_NODE_COLOR.text,
                  isMain: node.node_type === "PROJECT",
                  nodeType: node.node_type,
                  // 엣지가 함께 보관되지 않으므로 복원 노드는 독립 루트
                  depth: 0,
                },
              },
            ],
      );
      setItems((prev) =>
        prev ? prev.filter((i) => i.node_id !== node.node_id) : prev,
      );
    } catch {
      setHasError(true);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-[360px] rounded-xl border border-border bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-semibold text-foreground">보관함</p>
        <p className="mt-1 text-sm text-muted">
          보관된 노드를 복원할 수 있어요. 노드 간 연결선은 복원되지 않습니다.
        </p>

        <div className="mt-4 max-h-[320px] overflow-y-auto">
          {items === null ? (
            <p className="py-6 text-center text-sm text-muted">
              보관함을 불러오는 중...
            </p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              보관된 노드가 없어요.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {items.map((item) => (
                <li
                  key={item.node_id}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-surface"
                >
                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm ${
                        item.title ? "text-foreground" : "text-muted"
                      }`}
                    >
                      {item.title || "제목 없음"}
                    </p>
                    <p className="text-xs text-muted">
                      보관일: {formatArchivedDate(item.deleted_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestore(item)}
                    disabled={restoringId !== null}
                    className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
                  >
                    {restoringId === item.node_id ? "복원 중..." : "복원"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {hasError && (
          <p className="mt-2 text-sm text-muted">
            처리에 실패했어요. 잠시 후 다시 시도해주세요.
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-sm"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
