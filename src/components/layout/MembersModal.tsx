"use client";
import { useWorkspaceLayout } from "@/app/workspace/context";
// import { removeWorkspaceMember } from "@/api/workspace"; // DELETE /workspace/:id/member/:userId — 백엔드 미구현

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <path
        d="M12 12c2.486 0 4.5-2.014 4.5-4.5S14.486 3 12 3 7.5 5.014 7.5 7.5 9.514 12 12 12zm0 2.25c-3.004 0-9 1.508-9 4.5V21h18v-2.25c0-2.992-5.996-4.5-9-4.5z"
        fill="rgb(var(--foreground))"
        fillOpacity="0.45"
      />
    </svg>
  );
}

export default function MembersModal() {
  const {
    userMe,
    // workspaceId,    // removeWorkspaceMember 백엔드 미구현 — 활성화 시 복구
    // workspaceRole,  // canDelete 로직 비활성화 — 동일 이유
    collaborators,
  } = useWorkspaceLayout();

  // const canDelete = workspaceRole === "OWNER"; // removeWorkspaceMember 백엔드 미구현

  // const handleDelete = async (userId: string) => { ... }; // removeWorkspaceMember 백엔드 미구현

  return (
    <div
      className="absolute right-0 bg-background rounded-lg overflow-hidden"
      style={{
        top: "calc(100% + 8px)",
        minWidth: 220,
        boxShadow: "0px 0px 4px 0px rgba(44,44,44,0.25)",
      }}
    >
      {/* 현재 유저 */}
      <div
        className="flex items-center gap-3 px-4"
        style={{ paddingTop: 14, paddingBottom: 14 }}
      >
        <div
          className="flex items-center justify-center rounded-full bg-surface shrink-0"
          style={{ width: 36, height: 36, padding: 7 }}
        >
          <UserIcon />
        </div>
        <span
          style={{
            fontFamily: "Pretendard, sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: "rgb(var(--foreground))",
          }}
        >
          {userMe?.username}{" "}
          <span style={{ color: "rgb(var(--muted))", fontWeight: 400 }}>(나)</span>
        </span>
      </div>

      {/* 구분선 */}
      <div style={{ height: 1, backgroundColor: "rgb(var(--border))" }} />

      {/* 접속 중인 참여자 목록 */}
      <div style={{ padding: "10px 0 8px" }}>
        <p
          className="px-4"
          style={{
            fontFamily: "Pretendard, sans-serif",
            fontSize: 12,
            color: "rgb(var(--muted))",
            lineHeight: "18px",
            marginBottom: 4,
          }}
        >
          참여자
        </p>

        {collaborators.length === 0 ? (
          <p
            className="px-4"
            style={{
              fontFamily: "Pretendard, sans-serif",
              fontSize: 13,
              color: "rgb(var(--muted))",
              lineHeight: "20px",
              paddingTop: 6,
              paddingBottom: 6,
            }}
          >
            다른 참여자가 없습니다
          </p>
        ) : (
          collaborators.map((member) => (
            <div
              key={member.userId}
              className="flex items-center gap-3 px-4"
              style={{ paddingTop: 6, paddingBottom: 6 }}
            >
              <div
                className="flex items-center justify-center rounded-full shrink-0"
                style={{
                  width: 36,
                  height: 36,
                  padding: 7,
                  backgroundColor: member.color + "33",
                }}
              >
                <UserIcon />
              </div>

              <div className="flex flex-col flex-1 min-w-0">
                <span
                  className="truncate"
                  style={{
                    fontFamily: "Pretendard, sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "rgb(var(--foreground))",
                    lineHeight: "20px",
                  }}
                >
                  {member.userName}
                </span>
                <span
                  style={{
                    fontFamily: "Pretendard, sans-serif",
                    fontSize: 12,
                    color: "rgb(var(--muted))",
                    lineHeight: "16px",
                  }}
                >
                  접속 중
                </span>
              </div>

              {/* 삭제 버튼 — removeWorkspaceMember 백엔드 미구현, 활성화 시 아래 주석 해제
              {canDelete && (
                <button
                  onClick={() => handleDelete(member.userId)}
                  disabled={deletingIds.has(member.userId)}
                  className="shrink-0 rounded-sm"
                  style={{
                    backgroundColor: "#fee6e7",
                    color: "#6d3537",
                    fontFamily: "Pretendard, sans-serif",
                    fontSize: 12,
                    fontWeight: 400,
                    padding: "4px 8px",
                    opacity: deletingIds.has(member.userId) ? 0.5 : 1,
                    cursor: deletingIds.has(member.userId) ? "not-allowed" : "pointer",
                  }}
                >
                  {deletingIds.has(member.userId) ? "삭제 중..." : "삭제"}
                </button>
              )}
              */}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
