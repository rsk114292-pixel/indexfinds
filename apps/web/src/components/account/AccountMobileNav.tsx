'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useRef, useEffect } from 'react';
import { menuItems } from './AccountSidebar';

export default function AccountMobileNav() {
  const t = useTranslations('account');
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  const isActive = (href: string) => {
    if (href === '/account') return pathname === '/account';
    return pathname.startsWith(href);
  };

  // Auto-scroll to active tab
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const active = activeRef.current;
      const scrollLeft = active.offsetLeft - container.offsetWidth / 2 + active.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [pathname]);

  return (
    <nav
      ref={scrollRef}
      className="flex gap-1 overflow-x-auto px-4 py-2 bg-surface border-b border-border
                 scrollbar-none -mx-4"
      aria-label={t('accountNavigation')}
    >
      {menuItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            ref={active ? activeRef : undefined}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-full text-sm whitespace-nowrap
              shrink-0 transition-colors duration-200
              ${active
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted hover:text-foreground hover:bg-gray-50'
              }
            `}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
