'use client';

/**
 * Product Detail Error Boundary
 * Catches errors in product detail page while preserving the shop layout.
 */
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';

export default function ProductDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error');

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold text-foreground mb-2">
        {t('errorTitle')}
      </h1>
      <p className="text-muted mb-8 text-center max-w-md">
        {t('errorDesc')}
      </p>
      <div className="flex gap-3">
        <Button variant="primary" onClick={reset}>
          {t('tryAgain')}
        </Button>
        <Link
          href="/products"
          className="inline-flex items-center px-5 py-3 border border-border text-foreground rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
        >
          {t('backHome')}
        </Link>
      </div>
    </div>
  );
}
