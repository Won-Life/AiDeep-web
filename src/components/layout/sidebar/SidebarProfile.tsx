'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaceLayout } from '@/app/workspace/context';
import { logout } from '@/api/auth';
import { SHOW_TEMP_HIDDEN_UI } from '@/lib/uiFlags';
import { Avatar, MenuItem } from './SidebarParts';

// X2 프로필 메뉴 아이콘
function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 6a4 4 0 0 0 4.5 5.5l3 3-2 2-3-3A4 4 0 0 1 6 9l3 2 2-2Z" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
      <path d="M7 4a9 9 0 0 1 13 12M17 20A9 9 0 0 1 4 8M8 17c1-3 5-4 8-1M10 8a3 3 0 0 1 4 4M3 3l18 18" />
    </svg>
  );
}

/*
 * CONTEXT
 * - Problem      : 기존 메뉴가 프로필과 겹치고 시안의 파란 외곽·행 크기와 다르다.
 * - Why          : 프로필 위 12px 간격에 같은 폭의 메뉴를 두고 전용 스타일을 적용한다.
 * - Alternatives : 공통 MenuItem 수정은 워크스페이스 메뉴까지 바꾸므로 범위를 제한한다.
 * - Trade-offs   : 접힌 사이드바에서도 읽기 쉬운 고정 메뉴 폭을 유지한다.
 * - Edge Case    : 긴 이름·메일은 말줄임 처리하고 바깥 클릭·Escape·재클릭으로 닫는다.
 */
export default function ProfileRow({ collapsed, onOpenArchive }: { collapsed?: boolean; onOpenArchive?: () => void }) {
  const router = useRouter();
  const { userMe } = useWorkspaceLayout();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const name = userMe?.username ?? '';
  const email = userMe?.email ?? '';

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    router.replace('/login');
  };

  return (
    <div className={`relative shrink-0 ${collapsed ? 'px-3 pt-3 pb-8' : 'sidebar-profile-wrap'}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setMenuOpen(false);
          triggerRef.current?.focus();
        }
      }}>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
        aria-label={collapsed ? "프로필 메뉴" : undefined}
        className={`relative z-50 flex w-full items-center gap-2.5 transition-colors ${collapsed ? "justify-center rounded-full hover:bg-surface" : "sidebar-profile"}`}
      >
        <Avatar name={name} size={collapsed ? 48 : 36} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[11px] font-semibold text-main-blue-deep">
                {name}
              </span>
              <span className="block truncate text-[9.5px] text-main-blue">
                {email}
              </span>
            </span>
            <span className="sidebar-caret" aria-hidden="true" />
          </>
        )}
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="sidebar-profile-menu absolute left-3 z-50" aria-label="프로필 메뉴">
            {/* 프로필 헤더 (X2) — 아바타 + 이름 + 이메일 */}
            <div className="sidebar-profile-menu-header flex items-center gap-2.5">
              <Avatar name={name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[10px] font-semibold text-main-blue-deep">
                  {name || '사용자'}
                </span>
                <span className="block truncate text-[8px] text-main-blue">
                  {email}
                </span>
              </span>
            </div>
            <MenuItem className="sidebar-profile-settings" onClick={() => { setMenuOpen(false); router.push('/settings'); }}>
              <GearIcon />
              설정
            </MenuItem>
            {SHOW_TEMP_HIDDEN_UI && onOpenArchive && (
              <MenuItem onClick={() => { setMenuOpen(false); onOpenArchive(); }}>
                보관함
              </MenuItem>
            )}
            <MenuItem
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}
            >
              <LogoutIcon />
              로그아웃
            </MenuItem>
          </div>
        </>
      )}
    </div>
  );
}
