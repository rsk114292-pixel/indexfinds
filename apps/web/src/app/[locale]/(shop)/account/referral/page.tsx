'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { App } from 'antd';
import {
  ArrowRight,
  Copy,
  Users,
  CheckCircle2,
  Circle,
  Link2,
  MousePointerClick,
  Wallet,
  DollarSign,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { usePathname, useRouter } from '@/i18n/navigation';
import MobileSubPageHeader from '@/components/mobile/MobileSubPageHeader';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  copyToClipboard,
  generateTrackedShareUrl,
} from '@/lib/referral';
import { fetcher } from '@/lib/api';
import { buildAuthRedirectPath, buildLoginHref } from '@/lib/auth-redirect';
import { FIRST_WITHDRAWAL_MIN_POINTS } from '@/features/points/constants';
import {
  useReferralRewardsExperiment,
} from '@/lib/referral-experiment';
import { ReferralRewardsHub } from '@/components/referral/ReferralRewardsHub';
import { ShareChannelGrid } from '@/components/share/ShareChannelGrid';

interface ReferralCodeData {
  code: string;
  totalClicks: number;
  totalConversions: number;
}

interface ReferralDetail {
  maskedName: string;
  status: 'registered' | 'converted';
  createdAt: string;
  progress: {
    emailVerified: boolean;
    productViews: number;
    hasFavoriteOrPurchase: boolean;
  } | null;
}

interface ReferralDetailsData {
  stats: {
    totalClicks: number;
    totalRegistrations: number;
    totalConversions: number;
    totalEarnings: number;
  };
  items: ReferralDetail[];
  total: number;
}

interface PointsBalanceData {
  balance: number;
}

const DESKTOP_LIMIT = 20;
const MOBILE_LIMIT = 15;

const REFERRAL_PAGE_COPY = {
  en: {
    codeLabel: 'Referral code',
    codeDescription: 'The invite link above is the easiest way to share. Use the code only if someone prefers to enter it manually.',
    copyCode: 'Copy',
    copyCodeAria: 'Copy referral code',
  },
  zh: {
    codeLabel: '邀请码',
    codeDescription: '上方的邀请链接是最简单的分享方式。只有当对方更希望手动输入时，再使用邀请码。',
    copyCode: '复制',
    copyCodeAria: '复制邀请码',
  },
  fr: {
    codeLabel: 'Code de parrainage',
    codeDescription: "Le lien d'invitation ci-dessus est la manière la plus simple de partager. Utilisez le code seulement si quelqu'un préfère le saisir manuellement.",
    copyCode: 'Copier',
    copyCodeAria: 'Copier le code de parrainage',
  },
  de: {
    codeLabel: 'Empfehlungscode',
    codeDescription: 'Der Einladungslink oben ist der einfachste Weg zum Teilen. Verwende den Code nur, wenn ihn jemand lieber manuell eingibt.',
    copyCode: 'Kopieren',
    copyCodeAria: 'Empfehlungscode kopieren',
  },
  es: {
    codeLabel: 'Código de referido',
    codeDescription: 'El enlace de invitación de arriba es la forma más fácil de compartir. Usa el código solo si alguien prefiere introducirlo manualmente.',
    copyCode: 'Copiar',
    copyCodeAria: 'Copiar código de referido',
  },
  it: {
    codeLabel: 'Codice referral',
    codeDescription: "Il link di invito qui sopra è il modo più semplice per condividere. Usa il codice solo se qualcuno preferisce inserirlo manualmente.",
    copyCode: 'Copia',
    copyCodeAria: 'Copia il codice referral',
  },
  pt: {
    codeLabel: 'Código de indicação',
    codeDescription: 'O link de convite acima é a forma mais fácil de compartilhar. Use o código apenas se alguém preferir digitá-lo manualmente.',
    copyCode: 'Copiar',
    copyCodeAria: 'Copiar código de indicação',
  },
  ar: {
    codeLabel: 'رمز الإحالة',
    codeDescription: 'رابط الدعوة أعلاه هو أسهل طريقة للمشاركة. استخدم الرمز فقط إذا كان شخص ما يفضل إدخاله يدويًا.',
    copyCode: 'نسخ',
    copyCodeAria: 'نسخ رمز الإحالة',
  },
} as const;

const MOBILE_REFERRAL_COPY = {
  en: {
    summaryTitle: 'Invite friends',
    summaryBody: 'Share your link, earn points when referrals qualify, and cash out when you are ready.',
    currentPoints: 'Current points',
    readyToShare: 'Your invite link',
    copyInviteLink: 'Copy invite link',
    shareNow: 'Share now',
    shareHint: 'Pick the channel that feels most natural for your audience.',
    howRewardsWork: 'How rewards work',
    statsClicks: 'Clicks',
    statsRegistrations: 'Registrations',
    statsValid: 'Valid referrals',
    statsEarned: 'Earned points',
    pointsRate: '10 points = $1',
    unlocksIn: (points: number) => `${points} more points until cash-out unlocks.`,
    unlocked: 'Cash-out is unlocked.',
  },
  zh: {
    summaryTitle: '邀请好友',
    summaryBody: '分享你的链接，当推荐满足条件后获得积分，并在准备好时提现吗。',
    currentPoints: '当前积分',
    readyToShare: '你的邀请链接',
    copyInviteLink: '复制邀请链接',
    shareNow: '立即分享',
    shareHint: '选择最适合你受众的分享渠道。',
    howRewardsWork: '奖励如何生效',
    statsClicks: '点击',
    statsRegistrations: '注册',
    statsValid: '有效邀请',
    statsEarned: '获得积分',
    pointsRate: '10 积分 = $1',
    unlocksIn: (points: number) => `再获得 ${points} 积分即可解锁提现。`,
    unlocked: '已解锁提现。',
  },
  fr: {
    summaryTitle: 'Invitez des amis',
    summaryBody: 'Partagez votre lien, gagnez des points lorsque les parrainages sont valides, puis retirez-les plus tard.',
    currentPoints: 'Points actuels',
    readyToShare: "Votre lien d'invitation",
    copyInviteLink: "Copier le lien d'invitation",
    shareNow: 'Partager maintenant',
    shareHint: 'Choisissez le canal le plus naturel pour votre audience.',
    howRewardsWork: 'Comment fonctionnent les récompenses',
    statsClicks: 'Clics',
    statsRegistrations: 'Inscriptions',
    statsValid: 'Parrainages valides',
    statsEarned: 'Points gagnés',
    pointsRate: '10 points = 1 $',
    unlocksIn: (points: number) => `Encore ${points} points avant le retrait.`,
    unlocked: 'Retrait débloqué.',
  },
  de: {
    summaryTitle: 'Freunde einladen',
    summaryBody: 'Teile deinen Link, sammle Punkte bei gültigen Empfehlungen und zahle sie später aus.',
    currentPoints: 'Aktuelle Punkte',
    readyToShare: 'Dein Einladungslink',
    copyInviteLink: 'Einladungslink kopieren',
    shareNow: 'Jetzt teilen',
    shareHint: 'Wähle den Kanal, der sich für dein Publikum am natürlichsten anfühlt.',
    howRewardsWork: 'So funktionieren die Prämien',
    statsClicks: 'Klicks',
    statsRegistrations: 'Registrierungen',
    statsValid: 'Gültige Empfehlungen',
    statsEarned: 'Verdiente Punkte',
    pointsRate: '10 Punkte = 1 $',
    unlocksIn: (points: number) => `Noch ${points} Punkte bis zur Auszahlung.`,
    unlocked: 'Auszahlung freigeschaltet.',
  },
  es: {
    summaryTitle: 'Invita a tus amigos',
    summaryBody: 'Comparte tu enlace, gana puntos cuando los referidos califiquen y retíralos más tarde.',
    currentPoints: 'Puntos actuales',
    readyToShare: 'Tu enlace de invitación',
    copyInviteLink: 'Copiar enlace de invitación',
    shareNow: 'Compartir ahora',
    shareHint: 'Elige el canal que resulte más natural para tu audiencia.',
    howRewardsWork: 'Cómo funcionan las recompensas',
    statsClicks: 'Clics',
    statsRegistrations: 'Registros',
    statsValid: 'Referidos válidos',
    statsEarned: 'Puntos ganados',
    pointsRate: '10 puntos = 1 $',
    unlocksIn: (points: number) => `Te faltan ${points} puntos para desbloquear el retiro.`,
    unlocked: 'Retiro desbloqueado.',
  },
  it: {
    summaryTitle: 'Invita amici',
    summaryBody: 'Condividi il tuo link, guadagna punti quando i referral sono validi e ritirali più tardi.',
    currentPoints: 'Punti attuali',
    readyToShare: 'Il tuo link di invito',
    copyInviteLink: 'Copia link di invito',
    shareNow: 'Condividi ora',
    shareHint: 'Scegli il canale più naturale per il tuo pubblico.',
    howRewardsWork: 'Come funzionano le ricompense',
    statsClicks: 'Clic',
    statsRegistrations: 'Registrazioni',
    statsValid: 'Referral validi',
    statsEarned: 'Punti guadagnati',
    pointsRate: '10 punti = 1 $',
    unlocksIn: (points: number) => `Ancora ${points} punti per sbloccare il prelievo.`,
    unlocked: 'Prelievo sbloccato.',
  },
  pt: {
    summaryTitle: 'Convide amigos',
    summaryBody: 'Compartilhe seu link, ganhe pontos quando as indicações forem válidas e saque depois.',
    currentPoints: 'Pontos atuais',
    readyToShare: 'Seu link de convite',
    copyInviteLink: 'Copiar link de convite',
    shareNow: 'Compartilhar agora',
    shareHint: 'Escolha o canal que pareça mais natural para o seu público.',
    howRewardsWork: 'Como as recompensas funcionam',
    statsClicks: 'Cliques',
    statsRegistrations: 'Cadastros',
    statsValid: 'Indicações válidas',
    statsEarned: 'Pontos ganhos',
    pointsRate: '10 pontos = 1 $',
    unlocksIn: (points: number) => `Faltam ${points} pontos para sacar.`,
    unlocked: 'Saque liberado.',
  },
  ar: {
    summaryTitle: 'ادعُ الأصدقاء',
    summaryBody: 'شارك رابطك، واكسب النقاط عندما تصبح الإحالات مؤهلة، ثم اسحبها لاحقًا.',
    currentPoints: 'النقاط الحالية',
    readyToShare: 'رابط دعوتك',
    copyInviteLink: 'نسخ رابط الدعوة',
    shareNow: 'شارك الآن',
    shareHint: 'اختر القناة الأنسب لجمهورك.',
    howRewardsWork: 'كيف تعمل المكافآت',
    statsClicks: 'النقرات',
    statsRegistrations: 'التسجيلات',
    statsValid: 'الإحالات المؤهلة',
    statsEarned: 'النقاط المكتسبة',
    pointsRate: '10 نقاط = 1 $',
    unlocksIn: (points: number) => `تحتاج إلى ${points} نقاط إضافية للسحب.`,
    unlocked: 'تم فتح السحب.',
  },
} as const;

function ProgressStep({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${done ? 'text-green-600' : 'text-muted'}`}>
      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
      {label}
    </span>
  );
}

export default function AccountReferralPage() {
  const t = useTranslations('account');
  const locale = useLocale();
  const pageCopy = REFERRAL_PAGE_COPY[locale as keyof typeof REFERRAL_PAGE_COPY] ?? REFERRAL_PAGE_COPY.en;
  const mobileCopy = MOBILE_REFERRAL_COPY[locale as keyof typeof MOBILE_REFERRAL_COPY] ?? MOBILE_REFERRAL_COPY.en;
  const { message } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token, isAuthenticated, _hasHydrated } = useAuthStore();
  const experiment = useReferralRewardsExperiment();
  const loginHref = buildLoginHref(buildAuthRedirectPath(pathname, searchParams));

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace(loginHref);
    }
  }, [_hasHydrated, isAuthenticated, loginHref, router]);

  // Fetch referral code
  const { data: codeData, isLoading: codeLoading } = useSWR<ReferralCodeData>(
    token ? '/referral/my-code' : null,
    fetcher,
    { dedupingInterval: 300_000 },
  );

  const [detailsPage, setDetailsPage] = useState(1);

  // Fetch referral details (stats + paginated referred users list) — desktop
  const { data: detailsData, isLoading: detailsLoading } =
    useSWR<ReferralDetailsData>(
      token ? `/referral/details?page=${detailsPage}&limit=${DESKTOP_LIMIT}` : null,
      fetcher,
      { dedupingInterval: 60_000 },
    );

  const { data: pointsData, isLoading: pointsLoading } =
    useSWR<PointsBalanceData>(
      token ? '/points/balance' : null,
      fetcher,
      { dedupingInterval: 60_000 },
    );

  const handleCopyCode = async (code: string) => {
    const success = await copyToClipboard(code);
    message[success ? 'success' : 'error'](
      success ? t('copied') : t('copyFailed'),
    );
  };

  const handleCopyInviteLink = async (url: string) => {
    const success = await copyToClipboard(url);
    message[success ? 'success' : 'error'](
      success ? t('copied') : t('copyFailed'),
    );
  };

  const loading = codeLoading || detailsLoading || pointsLoading;

  if (!_hasHydrated || loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!codeData) {
    return (
      <div className="space-y-4">
        <MobileSubPageHeader title={t('referralProgram')} />
        <h2 className="text-lg font-bold text-foreground">
          {t('referralProgram')}
        </h2>
        <Card padding="lg">
          <p className="text-center text-muted">{t('unableToLoadReferral')}</p>
        </Card>
      </div>
    );
  }

  const stats = detailsData?.stats;
  const desktopDetails = detailsData?.items ?? [];
  const detailsTotalPages = detailsData ? Math.ceil(detailsData.total / DESKTOP_LIMIT) : 1;
  const shareUrl = generateTrackedShareUrl(codeData.code);

  return (
    <div className="space-y-6">
      <MobileSubPageHeader title={t('referralProgram')} />
      <h2 className="hidden lg:block text-lg font-bold text-foreground">
        {t('referralProgram')}
      </h2>

      <div className="hidden lg:block space-y-6">
        <ReferralRewardsHub
          code={codeData.code}
          totalClicks={stats?.totalClicks ?? codeData.totalClicks}
          totalRegistrations={stats?.totalRegistrations ?? 0}
          totalConversions={stats?.totalConversions ?? codeData.totalConversions}
          totalEarnings={stats?.totalEarnings ?? 0}
          pointsBalance={pointsData?.balance ?? 0}
          variantId={experiment?.variantId}
          placement="referral_page"
        />

        <Card padding="md" className="bg-stone-50/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{pageCopy.codeLabel}</p>
              <p className="mt-1 text-sm text-muted">
                {pageCopy.codeDescription}
              </p>
            </div>
            <div className="flex items-center gap-2 self-start rounded-full border border-border bg-white px-3 py-2 sm:self-center">
              <span className="text-sm font-semibold tracking-[0.18em] text-foreground">
                {codeData.code}
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(codeData.code)}
                aria-label={pageCopy.copyCodeAria}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
              >
                <Copy className="h-4 w-4" />
                {pageCopy.copyCode}
              </button>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4 lg:hidden">
        <Card padding="md" className="relative overflow-hidden border-[#ece5d8] bg-[linear-gradient(180deg,#fffdf9_0%,#ffffff_100%)] shadow-[0_8px_20px_rgba(28,25,23,0.04)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/60 via-[#d6a22a] to-transparent" />
          <div className="relative space-y-3">
            <div>
              <h3 className="text-xl font-semibold leading-tight text-[#1c1917]">
                {mobileCopy.summaryTitle}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-stone-500">
                {mobileCopy.summaryBody}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-[#ece5d8] bg-white px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                  {mobileCopy.currentPoints}
                </p>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-3xl font-semibold leading-none text-[#1c1917]">
                    {pointsData?.balance ?? 0}
                  </span>
                  <span className="pb-0.5 text-xs text-stone-500">{t('pointsUnit')}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-[#ece5d8] bg-[#fcfaf5] px-3 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600">
                  <Wallet className="h-4 w-4 text-primary" />
                  {mobileCopy.pointsRate}
                </span>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  {(pointsData?.balance ?? 0) < FIRST_WITHDRAWAL_MIN_POINTS
                    ? mobileCopy.unlocksIn(
                        FIRST_WITHDRAWAL_MIN_POINTS -
                          (pointsData?.balance ?? 0),
                      )
                    : mobileCopy.unlocked}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card padding="md" className="border-[#ece5d8] bg-white">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
            <Link2 className="h-4 w-4 text-primary" />
            {mobileCopy.readyToShare}
          </div>
          <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3">
            <p className="break-all text-sm leading-6 text-stone-700">{shareUrl}</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              size="md"
              icon={<Copy className="h-4 w-4" />}
              onClick={() => handleCopyInviteLink(shareUrl)}
            >
              {mobileCopy.copyInviteLink}
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={<ArrowRight className="h-4 w-4" />}
              onClick={() => router.push('/account')}
            >
              {t('points')}
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <MobileStatCard
            icon={MousePointerClick}
            label={mobileCopy.statsClicks}
            value={stats?.totalClicks ?? codeData.totalClicks}
            tone="orange"
          />
          <MobileStatCard
            icon={Users}
            label={mobileCopy.statsRegistrations}
            value={stats?.totalRegistrations ?? 0}
            tone="blue"
          />
          <MobileStatCard
            icon={CheckCircle2}
            label={mobileCopy.statsValid}
            value={stats?.totalConversions ?? codeData.totalConversions}
            tone="green"
          />
          <MobileStatCard
            icon={DollarSign}
            label={mobileCopy.statsEarned}
            value={stats?.totalEarnings ?? 0}
            tone="yellow"
          />
        </div>

        <details className="group overflow-hidden rounded-[20px] border border-[#ece5d8] bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-[#1c1917]">
            {mobileCopy.howRewardsWork}
            <ArrowRight className="h-4 w-4 text-stone-400 transition-transform group-open:rotate-90" />
          </summary>
          <div className="border-t border-[#f1ece2] px-4 py-3">
            <p className="text-sm leading-6 text-stone-500">
              {pageCopy.codeDescription}
            </p>
            <div className="mt-3 flex items-center gap-2 self-start rounded-full border border-border bg-stone-50 px-3 py-2">
              <span className="text-sm font-semibold tracking-[0.18em] text-foreground">
                {codeData.code}
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(codeData.code)}
                aria-label={pageCopy.copyCodeAria}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
              >
                <Copy className="h-4 w-4" />
                {pageCopy.copyCode}
              </button>
            </div>
          </div>
        </details>

        <Card padding="md" className="border-[#ece5d8] bg-white">
          <div>
            <p className="text-base font-semibold text-[#1c1917]">{mobileCopy.shareNow}</p>
            <p className="mt-1 text-sm text-stone-500">
              {mobileCopy.shareHint}
            </p>
          </div>
          <div className="mt-4">
            <ShareChannelGrid
              url={shareUrl}
              title={mobileCopy.summaryTitle}
              campaign="referral_invite"
            />
          </div>
        </Card>
      </div>

      {/* Referral Details — Desktop: pagination */}
      {Boolean(desktopDetails.length > 0 || detailsData?.total) && (
        <div className="hidden lg:block">
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {t('referralDetails')}
            </h3>
            <ReferralDetailList items={desktopDetails} locale={locale} t={t} />
            {detailsTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4 mt-4 border-t border-border">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={detailsPage <= 1}
                  onClick={() => setDetailsPage((p) => Math.max(1, p - 1))}
                >
                  &lt;
                </Button>
                <span className="text-sm text-muted">
                  {detailsPage} / {detailsTotalPages}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={detailsPage >= detailsTotalPages}
                  onClick={() => setDetailsPage((p) => p + 1)}
                >
                  &gt;
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Referral Details — Mobile: infinite scroll */}
      <div className="lg:hidden">
        <MobileReferralDetails token={token} locale={locale} t={t} />
      </div>

    </div>
  );
}

function MobileStatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof MousePointerClick;
  label: string;
  value: number;
  tone: 'orange' | 'blue' | 'green' | 'yellow';
}) {
  const toneMap = {
    orange: 'bg-orange-50 text-orange-500',
    blue: 'bg-blue-50 text-blue-500',
    green: 'bg-green-50 text-green-500',
    yellow: 'bg-yellow-50 text-yellow-500',
  };

  return (
    <Card padding="md" className="border-[#ece5d8] bg-white">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${toneMap[tone]}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="mt-3 text-2xl font-semibold leading-none text-[#1c1917]">{value}</p>
      <p className="mt-1.5 text-xs text-stone-500">{label}</p>
    </Card>
  );
}

function ReferralDetailItem({ item, locale, t }: { item: ReferralDetail; locale: string; t: (key: string) => string }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <Users className="w-4 h-4 text-muted" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{item.maskedName}</p>
            <p className="text-xs text-muted">
              {new Date(item.createdAt).toLocaleDateString(locale)}
            </p>
          </div>
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            item.status === 'converted'
              ? 'bg-green-50 text-green-600'
              : 'bg-blue-50 text-blue-600'
          }`}
        >
          {item.status === 'converted' ? t('statusConverted') : t('statusRegistered')}
        </span>
      </div>
      {item.progress && (
        <div className="mt-2 ml-11 flex flex-wrap gap-x-4 gap-y-1">
          <ProgressStep done={true} label={t('progressRegistered')} />
          <ProgressStep done={item.progress.emailVerified} label={t('progressEmailVerified')} />
          <ProgressStep
            done={item.progress.productViews >= 3}
            label={`${t('progressProductViews')} ${item.progress.productViews}/3`}
          />
          <ProgressStep done={item.progress.hasFavoriteOrPurchase} label={t('progressFavorite')} />
        </div>
      )}
    </div>
  );
}

function ReferralDetailList({ items, locale, t }: { items: ReferralDetail[]; locale: string; t: (key: string) => string }) {
  return (
    <div className="divide-y divide-border">
      {items.map((item, index) => (
        <ReferralDetailItem key={index} item={item} locale={locale} t={t} />
      ))}
    </div>
  );
}

function MobileReferralDetails({ token, locale, t }: { token: string | null; locale: string; t: (key: string) => string }) {
  const [items, setItems] = useState<ReferralDetail[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (!token) return;
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const data = await fetcher<ReferralDetailsData>(`/referral/details?page=${pageNum}&limit=${MOBILE_LIMIT}`);
      const newItems = data?.items ?? [];
      if (append) {
        setItems((prev) => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
      setHasMore(newItems.length >= MOBILE_LIMIT);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const next = page + 1;
          setPage(next);
          fetchPage(next, true);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, fetchPage]);

  if (loading) {
    return <div className="flex justify-center py-8"><Spinner /></div>;
  }

  if (!items.length) return null;

  return (
    <Card padding="lg">
      <h3 className="text-sm font-semibold text-foreground mb-3">{t('referralDetails')}</h3>
      <ReferralDetailList items={items} locale={locale} t={t} />
      <div ref={sentinelRef} className="h-1" />
      {loadingMore && (
        <div className="flex justify-center py-4"><Spinner /></div>
      )}
    </Card>
  );
}
