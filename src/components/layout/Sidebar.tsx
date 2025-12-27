'use client';
import { useState } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const SIDEBAR_WIDTH = 280; // 사이드바 너비
export const VISIBLE_BUTTON_WIDTH = 40; // 접혔을 때 보이는 버튼 너비

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [expandedResources, setExpandedResources] = useState<Set<number>>(new Set());

  const toggleResource = (index: number) => {
    const newExpanded = new Set(expandedResources);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedResources(newExpanded);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-gray-100 shadow-lg transition-transform duration-300 z-50 text-black ${
        isOpen ? 'translate-x-0 overflow-y-auto' : 'overflow-visible'
      }`}
      style={{
        width: `${SIDEBAR_WIDTH}px`,
        transform: isOpen ? 'translateX(0)' : `translateX(calc(-100% + ${VISIBLE_BUTTON_WIDTH}px))`,
      }}
    >
      {/* 헤더 - 항상 보이도록 분리 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className={`text-lg font-semibold text-black ${!isOpen ? 'opacity-0' : ''}`}>
          Resource +
        </h2>
        <button
          onClick={onToggle}
          className="text-black hover:text-gray-700 text-xl font-semibold"
        >
          {isOpen ? '<<' : '>>'}
        </button>
      </div>

      <div className={`p-4 ${!isOpen ? 'opacity-0 pointer-events-none' : ''}`}>

        {/* Resource 섹션들 */}
        <div className="space-y-2 mb-8">
          {[
            { id: 1, name: '학교 공부', subItems: ['비주얼에세이', '인터랙티브디자인', '타이포그래피심화연구'] },
            { id: 2, name: 'AiDeep 프로젝트', subItems: ['기획 문서', '디자인 시스템', '프로토타입 개발', '테스트'] },
            { id: 3, name: '포트폴리오', subItems: ['웹사이트', '모바일 앱'] },
            { id: 4, name: '일정 관리 및 회의록', subItems: ['주간 회의', '월간 리뷰', '분기별 계획'] },
            { id: 5, name: '학습 자료', subItems: ['React', 'TypeScript', 'Next.js', 'GraphQL', '데이터베이스'] },
          ].map((resource) => (
            <div key={resource.id} className="flex items-start gap-2">
              <div className="border border-gray-200 rounded-lg inline-block overflow-hidden">
                <button
                  onClick={() => toggleResource(resource.id)}
                  className="px-3 py-2 flex items-center hover:bg-gray-50 gap-3"
                >
                  <span className="text-black">{resource.name}</span>
                  <span className="text-black text-xs">
                    {expandedResources.has(resource.id) ? '^' : 'v'}
                  </span>
                </button>
                {expandedResources.has(resource.id) && (
                  <div className="bg-gray-50 border-t border-gray-200 overflow-hidden">
                    {resource.subItems.map((subItem, index) => (
                      <div
                        key={index}
                        className={`px-6 py-2 text-sm text-black hover:bg-gray-100 ${
                          index === resource.subItems.length - 1 ? 'rounded-b-lg' : ''
                        }`}
                      >
                        {subItem}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // + 버튼 클릭 핸들러 (추후 구현)
                  console.log('Add button clicked for resource:', resource.id);
                }}
                className="px-2 py-2 text-black hover:bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center"
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
