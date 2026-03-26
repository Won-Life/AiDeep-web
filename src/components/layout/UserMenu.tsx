"use client";
import { useState, useRef, useEffect } from "react";

interface UserMenuProps {
  username: string;
  email: string;
  onLogout: () => void;
}

export default function UserMenu({ username, email, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const initial = username.charAt(0).toUpperCase() || "?";

  return (
    <div ref={menuRef} className="fixed top-4 right-4 z-30">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-700 text-white text-sm font-semibold hover:bg-gray-600 shadow-md transition-colors"
        title={username}
      >
        {initial}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {username}
            </p>
            <p className="text-xs text-gray-500 truncate">{email}</p>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
