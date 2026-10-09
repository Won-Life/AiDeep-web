'use client';

import { Handle, type HandleProps } from '@xyflow/react';
import type { CSSProperties } from 'react';

/*
 * CONTEXT
 * - Problem      : 프로젝트의 14px 포트는 주변을 눌렀을 때 연결 드래그가 시작되지 않는다.
 * - Why          : 실제 Handle 크기를 28px로 늘리고 안쪽 원만 14px로 유지해 hit test와 연결 좌표를 일치시킨다.
 * - Alternatives : 가상 요소만 늘리면 React Flow가 측정한 연결 인식 범위는 그대로 남는다.
 * - Trade-offs   : 시각적 크기는 같지만 가로·세로 클릭 범위가 각각 두 배가 된다.
 * - Edge Case    : 확대 배율을 따라 함께 커지고 투명 target 핸들보다 source를 앞에 둔다.
 */
export function GraphHandle({ enlarged, style, ...props }: HandleProps & {
  enlarged?: boolean; style?: CSSProperties;
}) {
  if (!enlarged) return <Handle {...props} style={style} />;
  return (
    <Handle {...props} style={{ ...style, width: 28, height: 28, minWidth: 28, minHeight: 28,
      border: 0, background: 'transparent', boxShadow: 'none', zIndex: 2 }}>
      <span aria-hidden="true" style={{ ...style, position: 'absolute', width: 14, height: 14,
        minWidth: 14, minHeight: 14, boxSizing: 'border-box', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)', pointerEvents: 'none', opacity: 1 }} />
    </Handle>
  );
}
