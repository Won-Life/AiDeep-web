import type { Node, Edge } from "@xyflow/react";

// 색상 정의
const COLOR_SCHOOL_MAIN = "#ffffff";
const COLOR_SCHOOL_SUB = "#e3f2fd";
const COLOR_SCHOOL_SUB2 = "#bbdefb";

const COLOR_AIDEEP_MAIN = "#ffffff";
const COLOR_AIDEEP_SUB = "#e8f5e9";
const COLOR_AIDEEP_SUB2 = "#c8e6c9";

const COLOR_DESIGN_MAIN = "#ffe6e6";
const COLOR_DESIGN_SUB = "#ffebee";

// 초기 노드
export const initialNodes: Node[] = [
  { id: "school", type: "textUpdater", position: { x: -700, y: -200 }, data: { text: "✏️ 학교 공부", isMain: true, color: COLOR_SCHOOL_MAIN } },
  // { id: "design", type: "textUpdater", position: { x: -300, y: 500 }, data: { text: "🎨 디자인", isMain: true, color: COLOR_DESIGN_MAIN } },
  // { id: "aideep", type: "textUpdater", position: { x: 200, y: 100 }, data: { text: "🤔 AiDeep", isMain: true, color: COLOR_AIDEEP_MAIN } },

  { id: "visual-essay", type: "textUpdater", position: { x: -400, y: -250 }, data: { text: "비주얼에세이", isMain: false, color: COLOR_SCHOOL_SUB } },
  { id: "interactive-design", type: "textUpdater", position: { x: -400, y: -150 }, data: { text: "인터랙티브디자인", isMain: false, color: COLOR_SCHOOL_SUB } },
  { id: "typography", type: "textUpdater", position: { x: -400, y: -50 }, data: { text: "타이포그래피심화연구", isMain: false, color: COLOR_SCHOOL_SUB } },
  { id: "motion-graphics", type: "textUpdater", position: { x: -400, y: 50 }, data: { text: "모션그래픽스", isMain: false, color: COLOR_SCHOOL_SUB } },

  // { id: "design-publish", type: "textUpdater", position: { x: 100, y: 400 }, data: { text: "출판", isMain: false, color: COLOR_DESIGN_SUB } },
  // { id: "design-visual", type: "textUpdater", position: { x: 100, y: 500 }, data: { text: "시각디자인", isMain: false, color: COLOR_DESIGN_SUB } },
  // { id: "design-uiux", type: "textUpdater", position: { x: 100, y: 600 }, data: { text: "UI/UX", isMain: false, color: COLOR_DESIGN_SUB } },

  // { id: "aideep-plan", type: "textUpdater", position: { x: 500, y: 0 }, data: { text: "기획", isMain: false, color: COLOR_AIDEEP_SUB } },
  // { id: "aideep-discuss", type: "textUpdater", position: { x: 500, y: 100 }, data: { text: "의논사항", isMain: false, color: COLOR_AIDEEP_SUB } },
  // { id: "aideep-branding", type: "textUpdater", position: { x: 500, y: 200 }, data: { text: "브랜딩", isMain: false, color: COLOR_AIDEEP_SUB } },
  // { id: "aideep-design", type: "textUpdater", position: { x: 500, y: 300 }, data: { text: "디자인", isMain: false, color: COLOR_AIDEEP_SUB } },

  { id: "typography-mid", type: "textUpdater", position: { x: -100, y: -100 }, data: { text: "중간과제", isMain: false, color: COLOR_SCHOOL_SUB2 } },
  { id: "typography-final", type: "textUpdater", position: { x: -100, y: 0 }, data: { text: "기말과제", isMain: false, color: COLOR_SCHOOL_SUB2 } },

  { id: "motion-mid-poster", type: "textUpdater", position: { x: -100, y: 50 }, data: { text: "중간_모션포스터", isMain: false, color: COLOR_SCHOOL_SUB2 } },
  { id: "motion-quiz", type: "textUpdater", position: { x: -100, y: 100 }, data: { text: "퀴즈 준비", isMain: false, color: COLOR_SCHOOL_SUB2 } },
  { id: "motion-final-team", type: "textUpdater", position: { x: -100, y: 200 }, data: { text: "기말·팀플", isMain: false, color: COLOR_SCHOOL_SUB2 } },

  // { id: "aideep-wireframe", type: "textUpdater", position: { x: 800, y: 250 }, data: { text: "와이어프레임", isMain: false, color: COLOR_AIDEEP_SUB2 } },
  // { id: "aideep-prototype", type: "textUpdater", position: { x: 800, y: 350 }, data: { text: "프로토타입", isMain: false, color: COLOR_AIDEEP_SUB2 } },
];

// 초기 엣지
export const initialEdges: Edge[] = [
  { id: "e-school-visual", source: "school", target: "visual-essay", sourceHandle: "source-right", targetHandle: "target-side", type: "branch" },
  { id: "e-school-interactive", source: "school", target: "interactive-design", sourceHandle: "source-right", targetHandle: "target-side", type: "branch" },
  { id: "e-school-typography", source: "school", target: "typography", sourceHandle: "source-right", targetHandle: "target-side", type: "branch" },
  { id: "e-typography-mid", source: "typography", target: "typography-mid", sourceHandle: "source-side", targetHandle: "target-side", type: "branch" },
  { id: "e-typography-final", source: "typography", target: "typography-final", sourceHandle: "source-side", targetHandle: "target-side", type: "branch" },
  { id: "e-school-motion", source: "school", target: "motion-graphics", sourceHandle: "source-right", targetHandle: "target-side", type: "branch" },
  { id: "e-motion-mid", source: "motion-graphics", target: "motion-mid-poster", sourceHandle: "source-side", targetHandle: "target-side", type: "branch" },
  { id: "e-motion-quiz", source: "motion-graphics", target: "motion-quiz", sourceHandle: "source-side", targetHandle: "target-side", type: "branch" },
  { id: "e-motion-final", source: "motion-graphics", target: "motion-final-team", sourceHandle: "source-side", targetHandle: "target-side", type: "branch" },

  // { id: "e-aideep-plan", source: "aideep", target: "aideep-plan", sourceHandle: "source-right", targetHandle: "target-side", type: "branch" },
  // { id: "e-aideep-discuss", source: "aideep", target: "aideep-discuss", sourceHandle: "source-right", targetHandle: "target-side", type: "branch" },
  // { id: "e-aideep-branding", source: "aideep", target: "aideep-branding", sourceHandle: "source-right", targetHandle: "target-side", type: "branch" },
  // { id: "e-aideep-design", source: "aideep", target: "aideep-design", sourceHandle: "source-right", targetHandle: "target-side", type: "branch" },
  // { id: "e-aideep-wireframe", source: "aideep-design", target: "aideep-wireframe", sourceHandle: "source-side", targetHandle: "target-side", type: "branch" },
  // { id: "e-aideep-prototype", source: "aideep-design", target: "aideep-prototype", sourceHandle: "source-side", targetHandle: "target-side", type: "branch" },

  // { id: "e-design-publish", source: "design", target: "design-publish", sourceHandle: "source-right", targetHandle: "target-side", type: "branch" },
  // { id: "e-design-visual", source: "design", target: "design-visual", sourceHandle: "source-right", targetHandle: "target-side", type: "branch" },
  // { id: "e-design-uiux", source: "design", target: "design-uiux", sourceHandle: "source-right", targetHandle: "target-side", type: "branch" },
];
