'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { SocialIcon, type SocialLink } from '@/lib/social-icons';
import {
  X,
  Home,
  LayoutGrid,
  Tag,
  Sparkles,
  HelpCircle,
  BookOpen,
  Gift,
  Globe,
  DollarSign,
  Store,
  ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCurrentPlatform } from '@/stores/usePlatformStore';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { type Locale } from '@/i18n/config';
import {
  PUBLIC_AUTH_ENTRY_ENABLED,
  PUBLIC_REGISTRATION_ENABLED,
} from '@/lib/features';
import { MobileDrawer } from './ui/MobileDrawer';
import MobilePlatformSheet from './MobilePlatformSheet';
import MobileSettingsSheet from './MobileSettingsSheet';

interface MobileHamburgerDrawerProps {
  open: boolean;
  onClose: () => void;
}

const LANGUAGE_LABELS: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  ar: 'العربية',
};

export default function MobileHamburgerDrawer({
  open,
  onClose,
}: MobileHamburgerDrawerProps) {
  const { user, isAuthenticated, _hasHydrated: authHydrated } = useAuthStore();
  const currentPlatform = useCurrentPlatform();
  const { currency } = useCurrencyStore();
  const locale = useLocale() as Locale;
  const t = useTranslations('drawer');
  const tc = useTranslations('common');
  const [avatarError, setAvatarError] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: socialLinks } = useSWR<SocialLink[]>(
    open ? '/social-links' : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const handleAvatarError = useCallback(() => setAvatarError(true), []);
  const showAvatar = isAuthenticated && user?.avatar && !avatarError;

  return (
    <>
      <MobileDrawer open={open} onClose={onClose} title={t('menu')}>
        <div className="flex flex-col">
          {/* Close button */}
          <div className="flex justify-end px-4 pt-3 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full active:bg-gray-100 transition-colors"
              aria-label={tc('close')}
            >
              <X className="h-5 w-5 text-muted" />
            </button>
          </div>

          {/* User card */}
          <div className="px-4 pb-4">
            {authHydrated && isAuthenticated && user ? (
              <Link
                href="/account"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 active:bg-gray-100 transition-colors"
              >
                <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden bg-gray-200">
                  {showAvatar ? (
                    <Image
                      src={user.avatar!}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="40px"
                      onError={handleAvatarError}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-medium text-muted">
                      {(user.username || user.email)?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {user.username || user.email?.split('@')[0]}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {user.email}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </Link>
            ) : authHydrated && PUBLIC_AUTH_ENTRY_ENABLED ? (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  onClick={onClose}
                  className="flex-1 rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-white active:opacity-90 transition-opacity"
                >
                  {t('login')}
                </Link>
                {PUBLIC_REGISTRATION_ENABLED ? (
                  <Link
                    href="/register"
                    onClick={onClose}
                    className="flex-1 rounded-lg border border-gray-200 py-2.5 text-center text-sm font-medium text-foreground active:bg-gray-50 transition-colors"
                  >
                    {t('register')}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100" />

          {/* Main navigation */}
          <nav className="py-2">
            <DrawerLink href="/" icon={Home} label={t('home')} onClose={onClose} />
            <DrawerLink href="/categories" icon={LayoutGrid} label={t('categories')} onClose={onClose} />
            <DrawerLink href="/brands" icon={Tag} label={t('brands')} onClose={onClose} />
            <DrawerLink href="/products" icon={Sparkles} label={t('allProducts')} onClose={onClose} />
          </nav>

          <div className="h-px bg-gray-100" />

          {/* Info pages */}
          <nav className="py-2">
            <DrawerLink href="/how-it-works" icon={BookOpen} label={t('howItWorks')} onClose={onClose} />
            <DrawerLink href="/help" icon={HelpCircle} label={t('helpCenter')} onClose={onClose} />
          </nav>

          <div className="h-px bg-gray-100" />

          {/* Growth & Social */}
          <nav className="py-2">
            <DrawerLink href="/account/referral" icon={Gift} label={t('referralProgram')} onClose={onClose} />
            {socialLinks?.map((link) => (
              <DrawerExternalLink
                key={link.id}
                href={link.url}
                label={link.label}
                icon={link.icon}
              />
            ))}
          </nav>

          <div className="h-px bg-gray-100" />

          {/* Settings */}
          <div className="py-2">
            <DrawerSettingButton
              icon={Globe}
              label={t('language')}
              value={LANGUAGE_LABELS[locale]}
              onClick={() => setSettingsOpen(true)}
            />
            <DrawerSettingButton
              icon={DollarSign}
              label={t('currency')}
              value={currency}
              onClick={() => setSettingsOpen(true)}
            />
            <DrawerSettingButton
              icon={Store}
              label={t('platform')}
              value={currentPlatform?.name || t('selectPlatform')}
              onClick={() => setPlatformOpen(true)}
            />
          </div>

          <div className="h-px bg-gray-100" />

          {/* Legal links */}
          <div className="flex items-center justify-center gap-3 py-4 px-4">
            <Link
              href="/terms"
              onClick={onClose}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              {t('terms')}
            </Link>
            <span className="text-xs text-gray-300">·</span>
            <Link
              href="/privacy"
              onClick={onClose}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              {t('privacy')}
            </Link>
          </div>
        </div>
      </MobileDrawer>

      {/* Sub-sheets */}
      <MobilePlatformSheet
        open={platformOpen}
        onClose={() => setPlatformOpen(false)}
      />
      <MobileSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}

/* ─── Sub-components ─── */

function DrawerLink({
  href,
  icon: Icon,
  label,
  onClose,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center gap-3 px-4 py-3 text-sm text-foreground active:bg-gray-50 transition-colors"
    >
      <Icon className="h-5 w-5 text-muted" />
      <span>{label}</span>
    </Link>
  );
}

function DrawerExternalLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3 text-sm text-foreground active:bg-gray-50 transition-colors"
    >
      <SocialIcon name={icon} className="h-5 w-5 text-muted" />
      <span>{label}</span>
    </a>
  );
}

function DrawerSettingButton({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-sm active:bg-gray-50 transition-colors"
    >
      <Icon className="h-5 w-5 text-muted" />
      <span className="flex-1 text-left text-foreground">{label}</span>
      <span className="text-xs text-muted">{value}</span>
      <ChevronRight className="h-4 w-4 text-muted" />
    </button>
  );
}
