'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTenant } from '@/components/TenantProvider';

interface BrandWordmarkProps {
  tone?: 'dark' | 'light';
  compact?: boolean;
  className?: string;
}

export default function BrandWordmark({
  tone = 'dark',
  compact = false,
  className,
}: BrandWordmarkProps) {
  const tenant = useTenant();
  const branding = tenant?.branding;
  const textOnly = tenant?.domain === 'itaobuyindex.com';
  const showLogo = branding?.showLogo !== false && !textOnly;
  const showWordmark = !compact || !showLogo;

  if (branding) {
    return (
      <span className={cn('inline-flex items-center gap-2.5', className)}>
        {showLogo && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-white shadow-[0_7px_18px_rgba(216,74,36,0.24)] ring-1 ring-white/15">
            <Image
              src={branding.logoPath}
              alt=""
              aria-hidden="true"
              width={32}
              height={32}
              priority
              className="h-8 w-8 object-contain"
            />
          </span>
        )}
        {showWordmark && (
          <span
            className={cn(
              'whitespace-nowrap text-[18px] font-extrabold leading-none tracking-[-0.035em]',
              tone === 'dark' ? 'text-secondary' : 'text-white',
            )}
          >
            {branding.wordmark}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] shadow-[0_7px_18px_rgba(255,90,60,0.28)]">
        <Image
          src="/icons/logo.svg"
          alt=""
          aria-hidden="true"
          width={32}
          height={32}
          priority
          className="h-8 w-8"
        />
      </span>
      {!compact && (
        <span
          className={cn(
            'whitespace-nowrap text-[19px] font-extrabold tracking-[-0.035em]',
            tone === 'dark' ? 'text-secondary' : 'text-white',
          )}
        >
          Index<span className="text-primary">Finds</span>
        </span>
      )}
    </span>
  );
}
