'use client';

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';

const STORAGE_KEY = 'draggable-fab-pos';
const EDGE_MARGIN = 12;
const SNAP_DURATION = 250;
const DRAG_THRESHOLD = 10; // px — 6px 太小，手指微抖就误判为拖拽
const FAB_SIZE = 52;

interface DraggableFABProps {
  children: ReactNode;
  onClick?: () => void;
  storageKey?: string;
}

/**
 * 可拖拽浮动操作按钮
 *
 * - 触摸事件处理拖拽 + tap（不依赖浏览器合成 click）
 * - 桌面端走原生 click
 * - wasDragging 标志防止 tap 和 click 双重触发
 */
export function DraggableFAB({ children, onClick, storageKey }: DraggableFABProps) {
  const fabRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: -999, y: -999 });
  const [ready, setReady] = useState(false);
  const [snapping, setSnapping] = useState(false);

  const posRef = useRef(pos);
  posRef.current = pos;

  // 始终保持最新的 onClick 引用，供 touchEnd 使用
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  // wasDragging: touchEnd 处理完后为 true，阻止紧随其后的 click 双重触发
  const wasDragging = useRef(false);

  const snapTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const dragInfo = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
  });

  const key = STORAGE_KEY + (storageKey ? `-${storageKey}` : '');

  const snapToEdge = useCallback((x: number, y: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const snapX = (x + FAB_SIZE / 2) < vw / 2
      ? EDGE_MARGIN
      : vw - FAB_SIZE - EDGE_MARGIN;
    const minY = EDGE_MARGIN + 48;
    const maxY = vh - FAB_SIZE - 72 - EDGE_MARGIN;
    const snapY = Math.min(Math.max(minY, y), maxY);

    setSnapping(true);
    setPos({ x: snapX, y: snapY });
    localStorage.setItem(key, JSON.stringify({ x: snapX, y: snapY }));
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => setSnapping(false), SNAP_DURATION);
  }, [key]);

  // 卸载时清理 snap 定时器
  useEffect(() => {
    return () => {
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    };
  }, []);

  // 初始化位置
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const p = JSON.parse(saved);
        const x = Math.min(Math.max(EDGE_MARGIN, p.x), window.innerWidth - FAB_SIZE - EDGE_MARGIN);
        const y = Math.min(Math.max(EDGE_MARGIN, p.y), window.innerHeight - FAB_SIZE - EDGE_MARGIN);
        setPos({ x, y });
        setReady(true);
        return;
      }
    } catch {}
    setPos({
      x: window.innerWidth - FAB_SIZE - EDGE_MARGIN,
      y: window.innerHeight - FAB_SIZE - 72 - EDGE_MARGIN,
    });
    setReady(true);
  }, [key]);

  // 触摸事件：拖拽 + tap 都在这里处理
  useEffect(() => {
    if (!ready) return;
    const el = fabRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      const cur = posRef.current;
      dragInfo.current = {
        active: false,
        startX: t.clientX,
        startY: t.clientY,
        startPosX: cur.x,
        startPosY: cur.y,
      };
      wasDragging.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const dx = t.clientX - dragInfo.current.startX;
      const dy = t.clientY - dragInfo.current.startY;

      if (!dragInfo.current.active && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
        dragInfo.current.active = true;
      }

      if (dragInfo.current.active) {
        e.preventDefault();
        setPos({
          x: dragInfo.current.startPosX + dx,
          y: dragInfo.current.startPosY + dy,
        });
      }
    };

    const onTouchEnd = () => {
      // 标记为已处理，阻止后续 click 双重触发
      wasDragging.current = true;

      if (dragInfo.current.active) {
        // 拖拽 → 吸附边缘
        const cur = posRef.current;
        snapToEdge(cur.x, cur.y);
      } else {
        // tap → 直接调用 onClick（不依赖浏览器合成 click）
        onClickRef.current?.();
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [ready, snapToEdge]);

  // 原生 click：桌面端使用；触摸端通过 wasDragging 跳过（已在 touchEnd 处理）
  const handleClick = useCallback(() => {
    if (wasDragging.current) {
      wasDragging.current = false;
      return;
    }
    onClick?.();
  }, [onClick]);

  return (
    <button
      ref={fabRef}
      type="button"
      onClick={handleClick}
      className={`fixed z-30 flex items-center justify-center rounded-full bg-primary text-white shadow-lg active:shadow-md ${
        ready ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        width: FAB_SIZE,
        height: FAB_SIZE,
        left: pos.x,
        top: pos.y,
        transition: snapping
          ? `all ${SNAP_DURATION}ms cubic-bezier(0.32, 0.72, 0, 1)`
          : ready ? 'opacity 200ms' : 'none',
        touchAction: 'none',
      }}
    >
      {children}
    </button>
  );
}
