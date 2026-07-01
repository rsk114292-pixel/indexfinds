'use client';

/**
 * Shop Error Boundary
 * Catches errors in all shop pages while preserving the shop layout (Header/Footer/TabBar).
 */
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

export default function ShopError({
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
        <Button variant="secondary" onClick={() => window.history.back()}>
          {t('backHome')}
        </Button>
      </div>
    </div>
  );
}
