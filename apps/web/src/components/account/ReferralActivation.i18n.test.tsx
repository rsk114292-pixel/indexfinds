import { render, screen } from '@testing-library/react';
import { ReferralActivationGuide, type ReferralActivationProgressData } from './ReferralActivationGuide';
import { ReferralActivationNudge } from './ReferralActivationNudge';
import { MobileReferralActivationCard } from './MobileReferralActivationCard';
import { MobileReferralProgressBanner } from './MobileReferralProgressBanner';
import enMessages from '@/i18n/messages/en.json';
import zhMessages from '@/i18n/messages/zh.json';
import frMessages from '@/i18n/messages/fr.json';
import deMessages from '@/i18n/messages/de.json';
import esMessages from '@/i18n/messages/es.json';
import itMessages from '@/i18n/messages/it.json';
import ptMessages from '@/i18n/messages/pt.json';
import arMessages from '@/i18n/messages/ar.json';

const mockLocaleMessages = {
  en: enMessages,
  zh: zhMessages,
  fr: frMessages,
  de: deMessages,
  es: esMessages,
  it: itMessages,
  pt: ptMessages,
  ar: arMessages,
} as const;

const mockIntlState: {
  locale: keyof typeof mockLocaleMessages;
} = {
  locale: 'en',
};

jest.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    return (key: string, values?: Record<string, string | number>) => {
      const message = getPath(
        mockLocaleMessages[mockIntlState.locale] as Record<string, unknown>,
        `${namespace}.${key}`,
      );

      if (typeof message !== 'string') {
        return key;
      }

      return message.replace(/\{(\w+)\}/g, (_, token: string) => {
        const value = values?.[token];
        return value === undefined ? `{${token}}` : String(value);
      });
    };
  },
}));

function renderWithLocale(
  locale: keyof typeof mockLocaleMessages,
  ui: React.ReactNode,
) {
  mockIntlState.locale = locale;
  return render(ui);
}

function getPath(
  source: Record<string, unknown>,
  path: string,
): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    return (value as Record<string, unknown>)[key];
  }, source);
}

const baseData: ReferralActivationProgressData = {
  isReferred: true,
  status: 'in_progress',
  progress: {
    registered: true,
    emailVerified: false,
    productViews: 1,
    requiredProductViews: 3,
    hasAction: false,
    completedSteps: 1,
    totalSteps: 4,
  },
  blockers: {
    emailVerification: true,
    remainingProductViews: 2,
    favoriteOrPurchase: true,
  },
};

describe('Referral activation i18n', () => {
  it('ships the referral activation namespace in every supported locale', () => {
    for (const [locale, messages] of Object.entries(mockLocaleMessages)) {
      expect(getPath(messages as Record<string, unknown>, 'account.referralActivation.guide.eyebrow')).toBeTruthy();
      expect(getPath(messages as Record<string, unknown>, 'account.referralActivation.nudge.eyebrow')).toBeTruthy();
      expect(getPath(messages as Record<string, unknown>, 'account.referralActivation.mobileCard.eyebrow')).toBeTruthy();
      expect(getPath(messages as Record<string, unknown>, 'account.referralActivation.mobileBanner.eyebrow')).toBeTruthy();
      expect(getPath(messages as Record<string, unknown>, 'account.referralActivation.guide.dismiss')).toBeTruthy();
      expect(locale).toBeTruthy();
    }
  });

  it('renders the desktop guide in French instead of falling back to English', () => {
    renderWithLocale(
      'fr',
      <ReferralActivationGuide data={baseData} onVerifyEmail={jest.fn()} />,
    );

    expect(
      screen.getByText('Terminez ces étapes pour débloquer le règlement du parrainage.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: "Envoyer l'e-mail de vérification" }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Finish these steps to unlock referral settlement.')).not.toBeInTheDocument();
  });

  it('renders the product nudge in Arabic instead of falling back to English', () => {
    renderWithLocale(
      'ar',
      <ReferralActivationNudge data={baseData} surface="product" onVerifyEmail={jest.fn()} />,
    );

    expect(
      screen.getByText('تحقق من بريدك الإلكتروني أولاً حتى تواصل هذه الإحالة التقدم.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'إرسال بريد التحقق' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Verify your email first so this referral can keep moving.'),
    ).not.toBeInTheDocument();
  });

  it('renders the mobile activation card in French with localized progress copy', () => {
    const viewsData: ReferralActivationProgressData = {
      ...baseData,
      progress: {
        ...baseData.progress,
        emailVerified: true,
        completedSteps: 2,
      },
      blockers: {
        emailVerification: false,
        remainingProductViews: 2,
        favoriteOrPurchase: true,
      },
    };

    renderWithLocale(
      'fr',
      <MobileReferralActivationCard data={viewsData} onVerifyEmail={jest.fn()} />,
    );

    expect(screen.getByText('Encore 2 vues produit requises')).toBeInTheDocument();
    expect(screen.getByText('2/4')).toBeInTheDocument();
    expect(screen.queryByText('2 more product views needed')).not.toBeInTheDocument();
  });

  it('renders the mobile progress banner in Arabic with localized count copy', () => {
    const viewsData: ReferralActivationProgressData = {
      ...baseData,
      progress: {
        ...baseData.progress,
        emailVerified: true,
        productViews: 1,
        completedSteps: 2,
      },
      blockers: {
        emailVerification: false,
        remainingProductViews: 2,
        favoriteOrPurchase: true,
      },
    };

    renderWithLocale(
      'ar',
      <MobileReferralProgressBanner data={viewsData} surface="verify_email" />,
    );

    expect(screen.getByText('تحتاج إلى 2 مشاهدات منتجات إضافية')).toBeInTheDocument();
    expect(screen.getByText('اكتملت 1/3 من مشاهدات المنتجات')).toBeInTheDocument();
    expect(screen.queryByText('2 more product views needed')).not.toBeInTheDocument();
  });
});
