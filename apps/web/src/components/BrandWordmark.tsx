import { Search } from 'lucide-react';
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
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-primary to-[#ff8a52] text-white shadow-[0_7px_18px_rgba(255,90,60,0.28)]">
        <Search className="h-[17px] w-[17px] stroke-[2.5]" />
        <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full border border-white/80 bg-[#7167ff]" />
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
