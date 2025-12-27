'use client';
import { useState } from 'react';

interface CheapHeaderProps {
  sidebarWidth: number;
}

export default function CheapHeader({ sidebarWidth }: CheapHeaderProps) {
  const [activeProject, setActiveProject] = useState('Project 1');
  const projects = ['Project 1', 'Project 2', 'Project 3', 'Project 4'];

  return (
    <header
      className="fixed top-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4 transition-all duration-300"
      style={{ left: `${sidebarWidth}px` }}
    >
      {/* 중앙: Project 탭들 */}
      <div className="flex gap-2">
        {projects.map((project) => (
          <button
            key={project}
            onClick={() => setActiveProject(project)}
            className={`px-4 py-2 rounded text-sm transition-colors ${
              activeProject === project
                ? 'bg-gray-200 text-gray-900 font-medium'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {project}
          </button>
        ))}
      </div>

      {/* 오른쪽: 사용자 정보 */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
        <span className="text-sm text-black">USER_name</span>
        <span className="text-gray-400">▼</span>
      </div>
    </header>
  );
}

