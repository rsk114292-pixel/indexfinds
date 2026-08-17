'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

interface TriggerProps {
  controls?: string;
  expanded: boolean;
  toggle: () => void;
  close: () => void;
}

interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: (props: TriggerProps) => ReactNode;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  panelClassName?: string;
  panelRole?: 'dialog' | 'menu' | 'listbox';
}

const ALIGN_CLASS = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
} as const;

export default function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  align = 'end',
  panelClassName,
  panelRole = 'dialog',
}: PopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [side, setSide] = useState<'top' | 'bottom'>('bottom');
  const [panelMaxHeight, setPanelMaxHeight] = useState<number | null>(null);

  const updateSide = useCallback(() => {
    if (!open || !rootRef.current || !panelRef.current) return;

    const rootRect = rootRef.current.getBoundingClientRect();
    const panelRect = panelRef.current.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 12;
    const topHeader = Array.from(document.querySelectorAll('header'))
      .map((header) => header.getBoundingClientRect())
      .find((rect) => rect.top <= 0 && rect.bottom > 0);
    const topInset = topHeader
      ? Math.ceil(topHeader.bottom) + viewportPadding
      : viewportPadding;
    const availableBelow =
      window.innerHeight - rootRect.bottom - gap - viewportPadding;
    const availableAbove = rootRect.top - gap - topInset;
    const nextSide =
      panelRect.height > availableBelow && availableAbove > availableBelow
        ? 'top'
        : 'bottom';

    setSide(nextSide);
    setPanelMaxHeight(
      Math.max(
        160,
        Math.floor(nextSide === 'top' ? availableAbove : availableBelow),
      ),
    );
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    updateSide();
    const frame = window.requestAnimationFrame(updateSide);
    window.addEventListener('resize', updateSide);
    window.addEventListener('scroll', updateSide, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateSide);
      window.removeEventListener('scroll', updateSide, true);
    };
  }, [open, updateSide]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
        rootRef.current?.querySelector<HTMLElement>('[aria-expanded="true"]')?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpenChange, open]);

  return (
    <div ref={rootRef} className="relative">
      {trigger({
        controls: open ? panelId : undefined,
        expanded: open,
        toggle: () => onOpenChange(!open),
        close: () => onOpenChange(false),
      })}
      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role={panelRole}
          data-side={side}
          style={
            panelMaxHeight ? { maxHeight: `${panelMaxHeight}px` } : undefined
          }
          className={cn(
            'absolute z-[70] max-h-[calc(100svh-1rem)] overflow-y-auto overscroll-contain rounded-2xl border border-black/5 bg-white text-foreground shadow-[0_18px_50px_rgba(15,23,42,0.18)]',
            side === 'top'
              ? 'bottom-[calc(100%+0.5rem)]'
              : 'top-[calc(100%+0.5rem)]',
            ALIGN_CLASS[align],
            panelClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
