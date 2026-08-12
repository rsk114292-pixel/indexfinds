'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TriggerProps {
  controls: string;
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
  const panelId = useId();

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
        controls: panelId,
        expanded: open,
        toggle: () => onOpenChange(!open),
        close: () => onOpenChange(false),
      })}
      {open ? (
        <div
          id={panelId}
          role={panelRole}
          className={cn(
            'absolute top-[calc(100%+0.5rem)] z-[70] rounded-2xl border border-black/5 bg-white text-foreground shadow-[0_18px_50px_rgba(15,23,42,0.18)]',
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
