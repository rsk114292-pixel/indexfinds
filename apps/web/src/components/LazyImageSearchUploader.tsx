'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Camera } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

const ImageSearchUploader = dynamic(() => import('./ImageSearchUploader'), {
  ssr: false,
});

interface LazyImageSearchUploaderProps {
  variant?: 'icon' | 'button' | 'text' | 'inline' | 'tab';
  className?: string;
}

export default function LazyImageSearchUploader({
  variant = 'icon',
  className = '',
}: LazyImageSearchUploaderProps) {
  const [active, setActive] = useState(false);
  const t = useTranslations('visualSearch');

  if (active) {
    return (
      <ImageSearchUploader
        variant={variant}
        className={className}
        initiallyOpen
        hideTrigger
        onClose={() => setActive(false)}
      />
    );
  }

  switch (variant) {
    case 'tab':
      return (
        <button
          type="button"
          onClick={() => setActive(true)}
          className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-semibold text-white/65 transition-colors hover:bg-white/10 hover:text-white ${className}`}
        >
          <Camera className="h-3.5 w-3.5" />
          {t('imageSearch')}
        </button>
      );
    case 'button':
      return (
        <Button
          variant="secondary"
          icon={<Camera className="h-4 w-4" />}
          onClick={() => setActive(true)}
          className={className}
        >
          {t('title')}
        </Button>
      );
    case 'text':
      return (
        <Button
          variant="link"
          icon={<Camera className="h-4 w-4" />}
          onClick={() => setActive(true)}
          className={className}
        >
          {t('title')}
        </Button>
      );
    case 'inline':
      return (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.stopPropagation();
            setActive(true);
          }}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-[#FF8F6B] px-3 py-1.5 text-sm font-medium text-white transition-all hover:brightness-110 ${className}`}
          aria-label={t('imageSearch')}
        >
          <Camera className="h-4 w-4" />
          <span className="hidden sm:inline">{t('imageSearch')}</span>
        </button>
      );
    default:
      return (
        <button
          type="button"
          onClick={() => setActive(true)}
          className={`flex items-center justify-center p-2 text-muted transition-colors hover:text-foreground ${className}`}
          title={t('title')}
          aria-label={t('title')}
        >
          <Camera className="h-[18px] w-[18px]" />
        </button>
      );
  }
}
