'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleChipGridProps {
  children: ReactNode;
  /** 折叠状态的最大高度 (px)，默认约 2 行按钮 */
  collapsedMaxHeight?: number;
  showMoreLabel: string;
  showLessLabel: string;
}

const OVERFLOW_TOLERANCE = 4;

export function CollapsibleChipGrid({
  children,
  collapsedMaxHeight = 80,
  showMoreLabel,
  showLessLabel,
}: CollapsibleChipGridProps) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const checkOverflow = () => {
      setOverflows(el.scrollHeight > collapsedMaxHeight + OVERFLOW_TOLERANCE);
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);

    return () => observer.disconnect();
  }, [children, collapsedMaxHeight]);

  return (
    <div>
      <div className="relative">
        <div
          ref={contentRef}
          className="flex flex-wrap gap-2 overflow-hidden"
          style={{
            maxHeight: !overflows || expanded ? undefined : collapsedMaxHeight,
          }}
        >
          {children}
        </div>
        {overflows && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}
      </div>
      {overflows && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-0.5 mt-1.5 text-xs text-muted"
        >
          {expanded ? showLessLabel : showMoreLabel}
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
