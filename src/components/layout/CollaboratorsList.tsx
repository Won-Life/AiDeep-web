/*
 * CONTEXT
 * - Problem      : 현재 워크스페이스에 접속 중인 협업자들을 헤더에서 한눈에 볼 수 있어야 함.
 * - Why          : CursorsMap은 cursor_move 이벤트 기반이라 이미 소켓이 연결된 상태에서 추가
 *                  구독 없이 협업자 이름·색상을 얻을 수 있는 가장 저렴한 데이터 소스. (API 구현 시 대체 예정)
 * - Trade-offs   : cursor_move 이벤트가 없으면 목록에 나타나지 않음 (마우스를 전혀 움직이지
 *                  않은 사용자는 숨겨짐). 현재 협업 모델에서는 허용 가능한 trade-off.
 * - Edge Case    : 협업자 0명이면 현재 사용자 아바타 단독 표시.
 */
'use client';
import { useState, useRef, useEffect } from 'react';
import type { CursorsMap } from '@/hooks/useCursors';
import MembersModal from './MembersModal';
import { getCursorColor } from '@/utils/cursorColor';

const MAX_VISIBLE = 3;

function AvatarCircle({
  name,
  color,
  size = 28,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  const initial = name ? name[0].toUpperCase() : '?';
  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0 font-semibold select-none text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontFamily: 'Pretendard, sans-serif',
        fontSize: 11,
        border: '2px solid white',
      }}
    >
      {initial}
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="#2c2c2c"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface CollaboratorsListProps {
  collaborators: CursorsMap;
  workspaceId: string | null;
  currentUserId: string;
  currentUsername: string;
}

export default function CollaboratorsList({
  collaborators,
  workspaceId,
  currentUserId,
  currentUsername,
}: CollaboratorsListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const entries = Object.values(collaborators);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Element)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isSolo = entries.length === 0;
  const myColor = getCursorColor(currentUserId);
  const visible = entries.slice(0, MAX_VISIBLE);
  const hidden = entries.length - MAX_VISIBLE;

  return (
    <div ref={menuRef} className="relative flex items-center gap-1">
      {/* 겹쳐있는 아바타 원들 */}
      <div className="flex items-center">
        {isSolo ? (
          <AvatarCircle name={currentUsername} color={myColor} />
        ) : (
          <>
            {visible.map((c, i) => (
              <div
                key={c.userId}
                className="relative"
                style={{
                  marginLeft: i === 0 ? 0 : -8,
                  zIndex: MAX_VISIBLE - i,
                }}
              >
                <AvatarCircle name={c.userName} color={c.color} />
              </div>
            ))}
            {hidden > 0 && (
              <div className="relative" style={{ marginLeft: -8, zIndex: 0 }}>
                <div
                  className="flex items-center justify-center rounded-full shrink-0 bg-[#e6e6e6] text-[#2c2c2c] font-semibold select-none"
                  style={{
                    width: 28,
                    height: 28,
                    fontFamily: 'Pretendard, sans-serif',
                    fontSize: 10,
                    border: '2px solid white',
                  }}
                >
                  +{hidden}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 드롭다운 트리거 — 화살표 버튼 */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-center rounded-full transition-colors"
        style={{ width: 20, height: 20 }}
        title={
          isSolo
            ? `접속 중: ${currentUsername}`
            : `접속 중: ${entries.map((e) => e.userName).join(', ')}`
        }
      >
        <span
          className="flex items-center justify-center transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <ChevronDownIcon />
        </span>
      </button>

      {/* 참여자 목록 모달 */}
      {isOpen && (
        <MembersModal
          currentUsername={currentUsername}
          collaborators={collaborators}
        />
      )}
    </div>
  );
}
