'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

interface Point { x: number; y: number }

interface UseFloatingWindowOptions {
  width: number;
  height: number;
  /** 처음 놓일 위치 — 사용자가 끌기 전까지만 쓰고, 끈 뒤에는 끈 위치를 지킨다 */
  initial: Point;
}

const EDGE_GAP = 8;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/** 헤더를 끌어 창을 옮긴다 — 화면 밖으로 나가지 않게 가둔다 */
export function useFloatingWindow({ width, height, initial }: UseFloatingWindowOptions) {
  const [dragged, setDragged] = useState<Point | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const dragRef = useRef<{ pointerId: number; dx: number; dy: number } | null>(null);

  useEffect(() => {
    const sync = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  const base = dragged ?? initial;
  const position = {
    x: clamp(base.x, EDGE_GAP, viewport.width - width - EDGE_GAP),
    y: clamp(base.y, EDGE_GAP, viewport.height - height - EDGE_GAP),
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    dragRef.current = { pointerId: event.pointerId, dx: event.clientX - position.x, dy: event.clientY - position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setDragged({ x: event.clientX - drag.dx, y: event.clientY - drag.dy });
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return { position, dragHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}
