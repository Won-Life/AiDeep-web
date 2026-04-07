"use client";
import { useState, useRef, useEffect } from "react";

import { uploadFile } from "@/api/upload";

interface UserMenuProps {
  username: string;
  email: string;
  onLogout: () => void;
  onSettings?: () => void;
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 12c2.486 0 4.5-2.014 4.5-4.5S14.486 3 12 3 7.5 5.014 7.5 7.5 9.514 12 12 12zm0 2.25c-3.004 0-9 1.508-9 4.5V21h18v-2.25c0-2.992-5.996-4.5-9-4.5z"
        fill="#2c2c2c"
        fillOpacity="0.5"
      />
    </svg>
  );
}

function EditIcon({ size = 10 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 11.5V14h2.5l7.373-7.373-2.5-2.5L2 11.5zm11.807-6.807a.664.664 0 000-.94L12.247 2.193a.664.664 0 00-.94 0l-1.22 1.22 2.5 2.5 1.22-1.22z"
        fill="#2c2c2c"
      />
    </svg>
  );
}

export default function UserMenu({
  username: initialUsername,
  email,
  onLogout,
  onSettings,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState(initialUsername);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(initialUsername);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as HTMLElement)
      ) {
        setIsOpen(false);
        setIsEditingName(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  function handleNameEditStart() {
    setNameInput(username);
    setIsEditingName(true);
  }

  async function handleNameSubmit() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === username) {
      setIsEditingName(false);
      return;
    }
    // TODO: PATCH /user/me 엔드포인트 백엔드 구현 후 아래 주석 해제
    // try {
    //   await updateUsername(trimmed);
    // } catch {
    //   setUsername(username); // 실패 시 원래 이름 복원
    //   setIsEditingName(false);
    //   return;
    // }
    setUsername(trimmed); // 낙관적 업데이트 (API 구현 전 임시)
    setIsEditingName(false);
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleNameSubmit();
    if (e.key === "Escape") setIsEditingName(false);
  }

  async function handleProfileImageChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];

    if (!file) return;
    try {
      // TODO: 현재 서버의 POST /upload 엔드포인트가 미완성 상태
      // - upload.controller.ts의 uploadSingle()이 console.log만 하고 아무것도 반환하지 않음
      // - S3 업로드 로직도 미구현 상태
      // 백엔드에서 S3 업로드 후 { key, url, originalName, mimeType, size } 형태로 응답하면
      // 아래 result.url이 S3 URL이 되어 프로필 이미지가 정상적으로 표시됨
      const result = await uploadFile(file);
      console.log("프로필 이미지 URL:", result.url); // 백엔드 완성 후 제거
      setProfileImageUrl(result.url);
    } catch {
      // 업로드 실패 (서버 미완성으로 인해 현재 항상 실패)
    }
    // input 초기화 (같은 파일 재선택 가능하게)
    e.target.value = "";
  }

  return (
    <div ref={menuRef} className="relative">
      {/* 트리거 버튼 */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden bg-[#f5f5f5] text-[#2c2c2c] text-sm font-semibold hover:bg-[#e6e6e6] shadow-sm transition-colors"
        title={username}
      >
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt={username}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full p-[7px]">
            <UserIcon />
          </div>
        )}
      </button>

      {/* 드롭다운 카드 */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 bg-white rounded-[8px] overflow-hidden"
          style={{
            width: 160,
            boxShadow: "0px 0px 4px 0px rgba(44,44,44,0.25)",
          }}
        >
          {/* 프로필 영역 */}
          <div className="relative" style={{ height: 106 }}>
            {/* 아바타 + 프로필 편집 버튼 */}
            <div
              className="absolute flex items-end"
              style={{ left: 64, top: 16, paddingRight: 8 }}
            >
              {/* 아바타 */}
              <div
                className="flex items-center justify-center rounded-full bg-[#f5f5f5] shrink-0 overflow-hidden"
                style={{
                  width: 32,
                  height: 32,
                  padding: profileImageUrl ? 0 : 6,
                  marginRight: -8,
                }}
              >
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full overflow-hidden">
                    <UserIcon />
                  </div>
                )}
              </div>

              {/* 프로필 이미지 편집 버튼 */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center rounded-full bg-white shrink-0 hover:bg-[#f5f5f5] transition-colors"
                style={{
                  padding: 4,
                  marginRight: -8,
                  boxShadow: "0px 0px 4px 0px rgba(44,44,44,0.25)",
                }}
              >
                <EditIcon size={8} />
              </button>

              {/* 숨겨진 파일 입력 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfileImageChange}
              />
            </div>

            {/* 이름 / 이메일 */}
            <div
              className="absolute flex flex-col items-center"
              style={{ left: 30, top: 56, width: 100, paddingBottom: 4 }}
            >
              {/* 닉네임 + 편집 */}
              <div className="flex items-center gap-1 -mb-1 w-full justify-center">
                {isEditingName ? (
                  <input
                    ref={nameInputRef}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={handleNameSubmit}
                    onKeyDown={handleNameKeyDown}
                    className="text-[#2c2c2c] bg-transparent border-b border-[#2c2c2c] outline-none text-center w-full"
                    style={{
                      fontFamily: "Pretendard, sans-serif",
                      fontSize: 12,
                      fontWeight: 400,
                      lineHeight: "20px",
                    }}
                    maxLength={20}
                  />
                ) : (
                  <>
                    <span
                      className="text-[#2c2c2c] whitespace-nowrap"
                      style={{
                        fontFamily: "Pretendard, sans-serif",
                        fontSize: 12,
                        fontWeight: 400,
                        lineHeight: "20px",
                      }}
                    >
                      {username}
                    </span>
                    <button
                      onClick={handleNameEditStart}
                      className="shrink-0 hover:opacity-60 transition-opacity"
                      title="닉네임 변경"
                    >
                      <EditIcon size={10} />
                    </button>
                  </>
                )}
              </div>

              {/* 이메일 */}
              <span
                className="text-[#b8b8b8] w-full text-center truncate"
                style={{
                  fontFamily: "Pretendard, sans-serif",
                  fontSize: 10,
                  fontWeight: 400,
                  lineHeight: "18px",
                }}
              >
                {email}
              </span>
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="flex flex-col gap-2" style={{ padding: "0 8px 8px" }}>
            {/* 설정 */}
            <button
              onClick={() => {
                setIsOpen(false);
                onSettings?.();
              }}
              className="flex items-center justify-center w-full rounded-[4px] bg-[#e6e6e6] hover:bg-[#d9d9d9] transition-colors"
              style={{ height: 26 }}
            >
              <span
                className="text-[#2c2c2c] whitespace-nowrap"
                style={{
                  fontFamily: "Pretendard, sans-serif",
                  fontSize: 10,
                  fontWeight: 400,
                  lineHeight: "18px",
                }}
              >
                설정
              </span>
            </button>

            {/* 로그아웃 */}
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="flex items-center justify-center w-full rounded-[4px] bg-[#fee6e7] hover:bg-[#fdd5d7] transition-colors"
              style={{ height: 26 }}
            >
              <span
                className="text-[#6d3537] whitespace-nowrap"
                style={{
                  fontFamily: "Pretendard, sans-serif",
                  fontSize: 10,
                  fontWeight: 400,
                  lineHeight: "18px",
                }}
              >
                로그아웃
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
