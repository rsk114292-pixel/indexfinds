'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MobileDescriptionProps {
  description: string;
}

export function MobileDescription({ description }: MobileDescriptionProps) {
  const t = useTranslations('product');
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      setClamped(el.scrollHeight > el.clientHeight + 1);
    }
  }, [description]);

  const plainText = description.replace(/<[^>]*>/g, '');

  return (
    <div className="px-4 py-4 border-t border-border">
      <div
        ref={ref}
        className={`text-sm text-foreground leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}
      >
        {plainText}
      </div>
      {(clamped || expanded) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-0.5 mt-2 text-xs text-primary font-medium"
        >
          {expanded ? (
            <>
              {t('showLess')}
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              {t('readMore')}
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
