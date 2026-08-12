'use client';

import { useTranslations } from 'next-intl';
import { SocialIcon } from '@/lib/social-icons';
import { WHATSAPP_HELP_URL } from '@/lib/support-links';
import { useCookieConsent } from '@/components/CookieConsent';
import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export default function WhatsAppHelp() {
  const t = useTranslations('whatsappHelp');
  const { consent } = useCookieConsent();
  const pathname = usePathname();
  const isProductDetail = /^\/products\/[^/]+/.test(pathname);

  return (
    <a
      href={WHATSAPP_HELP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('label')}
      title={t('label')}
      className={cn(
        'whatsapp-help group fixed right-4 z-40 flex items-center gap-2 transition-[bottom,opacity,transform] sm:right-6',
        consent === 'pending'
          ? isProductDetail
            ? 'bottom-[calc(env(safe-area-inset-bottom)+132px)] lg:bottom-20'
            : 'bottom-[calc(env(safe-area-inset-bottom)+120px)] lg:bottom-20'
          : isProductDetail
            ? 'bottom-[calc(env(safe-area-inset-bottom)+76px)] lg:bottom-6'
            : 'bottom-[calc(env(safe-area-inset-bottom)+72px)] lg:bottom-6',
      )}
    >
      <span className="pointer-events-none hidden translate-x-2 rounded-full border border-border bg-surface/95 px-4 py-2 text-sm font-medium text-foreground opacity-0 shadow-lg backdrop-blur-sm transition-all group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 lg:block">
        {t('label')}
      </span>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all group-hover:scale-105 group-hover:bg-[#20BD5A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2">
        <SocialIcon name="whatsapp" className="h-6 w-6" />
      </span>
    </a>
  );
}
