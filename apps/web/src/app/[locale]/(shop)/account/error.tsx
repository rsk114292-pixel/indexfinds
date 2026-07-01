'use client';

/**
 * Account Error Boundary
 * Catches errors in account pages while preserving the account layout (sidebar).
 */
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

export default function AccountError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error');

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold text-foreground mb-2">
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
