'use client';
import { useState } from 'react';

interface DropDownProps {
  sidebarWidth: number;
}

export default function DropDown({ sidebarWidth }: DropDownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="fixed bottom-4 z-30 transition-all duration-300"
      style={{ left: `${sidebarWidth + 16}px` }}
    >
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <span className="text-black font-semibold">AIDeep 도구</span>
          <span className="text-black">{isOpen ? '^' : 'v'}</span>
        </button>
        {isOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-black hover:bg-gray-100 px-2 py-2 rounded cursor-pointer">
                <span className="w-4 h-4 bg-green-500 rounded"></span>
                AI 내용 요약
              </li>
              <li className="flex items-center gap-2 text-sm text-black hover:bg-gray-100 px-2 py-2 rounded cursor-pointer">
                <span className="w-4 h-4 bg-orange-500 rounded"></span>
                AI 자동 구조화
              </li>
              <li className="flex items-center gap-2 text-sm text-black hover:bg-gray-100 px-2 py-2 rounded cursor-pointer">
                <span className="w-4 h-4 bg-blue-500 rounded-full"></span>
                AI 챗봇 사용하기
              </li>
              <li className="flex items-center gap-2 text-sm text-black hover:bg-gray-100 px-2 py-2 rounded cursor-pointer">
                <span className="w-4 h-4 bg-purple-500 rounded font-bold text-white text-xs flex items-center justify-center">
                  W
                </span>
                단어 정의 사전
              </li>
            </ul>
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
              <button className="text-black hover:text-gray-600">?</button>
              <button className="text-black hover:text-gray-600">□</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

