import Image from 'next/image';
import { cn } from '@/lib/utils';

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
