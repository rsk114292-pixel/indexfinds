'use client';

import { useEffect, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { App } from 'antd';
import {
  ArrowRight,
  CheckCircle2,
  Coins,
  Copy,
  DollarSign,
  Gift,
  Link2,
  MousePointerClick,
  Users,
  Wallet,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShareChannelGrid } from '@/components/share/ShareChannelGrid';
import {
  FIRST_WITHDRAWAL_MIN_POINTS,
  POINTS_PER_USD,
} from '@/features/points/constants';
import {
  copyToClipboard,
  generateTrackedShareUrl,
} from '@/lib/referral';
import {
  type ReferralRewardsVariant,
  trackReferralExperimentEvent,
} from '@/lib/referral-experiment';
import { post } from '@/lib/api';

interface ReferralRewardsHubProps {
  code: string;
  totalClicks: number;
  totalRegistrations: number;
  totalConversions: number;
  totalEarnings: number;
  pointsBalance: number;
  variantId?: ReferralRewardsVariant;
  placement: 'account_page' | 'welcome_modal' | 'referral_page';
  compact?: boolean;
  mobileSummary?: boolean;
  onSecondaryAction?: () => void;
}

const REWARDS_COPY = {
  en: {
    variants: {
      control: {
        eyebrow: 'Referral rewards',
        title: 'Invite friends',
        body: 'Share your link, earn points when referrals qualify, and cash out when you are ready.',
        primaryCta: 'Copy invite link',
        secondaryCta: 'View rewards center',
        helper: 'Friends need to verify their email and complete the required steps before rewards unlock.',
      },
      rewards_push: {
        eyebrow: 'Referral rewards',
        title: 'Invite friends',
        body: 'Share your link, earn points when referrals qualify, and cash out when you are ready.',
        primaryCta: 'Copy my invite link',
        secondaryCta: 'Open rewards center',
        helper: 'Rewards unlock after valid referrals are completed, with cash out available via PayPal or Crypto.',
      },
    },
    metrics: { clicks: 'Clicks', registrations: 'Registrations', validReferrals: 'Valid referrals', earnedPoints: 'Earned points' },
    copySuccess: 'Invite link copied.',
    copyFail: 'Failed to copy invite link.',
    inviteFriends: 'Invite friends',
    pointsRate: '10 points = $1',
    cashoutMethods: 'PayPal / Crypto cash out',
    rewardsUnlock: 'Rewards unlock after verified referrals',
    inviteLink: 'Your invite link',
    viewDetails: 'View details',
    cashoutProgress: 'Cash-out progress',
    points: 'points',
    cashoutUnlocks: (points: number) => `${points} more points until cash-out unlocks.`,
    cashoutUnlocked: 'Cash-out is unlocked.',
    joined: (count: number) => `${count} joined`,
    valid: (count: number) => `${count} valid`,
    availableToCashOut: 'Available to cash out',
    firstCashoutUnlocks: (points: number) => `${points} more points until your first cash-out unlocks.`,
    firstCashoutUnlocked: 'Your first cash-out is unlocked.',
    inviteLinkTitle: 'Your invite link',
    howRewardsWork: 'How rewards work',
    howSteps: [
      'Friend signs up with your link',
      'Friend verifies email and completes the required steps',
      'You earn points that can be cashed out later',
    ],
    shareNow: 'Share now',
    shareHint: 'Pick the channel that feels most natural for your audience.',
    shareTitle: 'Join me and earn rewards',
  },
  zh: {
    variants: {
      control: {
        eyebrow: '推荐奖励',
        title: '邀请好友',
        body: '分享你的链接，当推荐满足条件后获得积分，并在准备好时提现吗。',
        primaryCta: '复制邀请链接',
        secondaryCta: '查看奖励中心',
        helper: '好友需要验证邮箱并完成所需步骤后，奖励才会解锁。',
      },
      rewards_push: {
        eyebrow: '推荐奖励',
        title: '邀请好友',
        body: '分享你的链接，当推荐满足条件后获得积分，并在准备好时提现吗。',
        primaryCta: '复制我的邀请链接',
        secondaryCta: '打开奖励中心',
        helper: '有效推荐完成后奖励解锁，支持 PayPal 或 Crypto 提现。',
      },
    },
    metrics: { clicks: '点击', registrations: '注册', validReferrals: '有效邀请', earnedPoints: '获得积分' },
    copySuccess: '邀请链接已复制。',
    copyFail: '邀请链接复制失败。',
    inviteFriends: '邀请好友',
    pointsRate: '10 积分 = $1',
    cashoutMethods: 'PayPal / Crypto 提现',
    rewardsUnlock: '验证通过的推荐后解锁奖励',
    inviteLink: '你的邀请链接',
    viewDetails: '查看详情',
    cashoutProgress: '提现进度',
    points: '积分',
    cashoutUnlocks: (points: number) => `再获得 ${points} 积分即可解锁提现。`,
    cashoutUnlocked: '已解锁提现。',
    joined: (count: number) => `${count} 人加入`,
    valid: (count: number) => `${count} 个有效`,
    availableToCashOut: '可提现积分',
    firstCashoutUnlocks: (points: number) => `再获得 ${points} 积分即可解锁首次提现。`,
    firstCashoutUnlocked: '首次提现已解锁。',
    inviteLinkTitle: '你的邀请链接',
    howRewardsWork: '奖励如何生效',
    howSteps: [
      '好友通过你的链接注册',
      '好友验证邮箱并完成所需步骤',
      '你获得可后续提现的积分',
    ],
    shareNow: '立即分享',
    shareHint: '选择最适合你受众的分享渠道。',
    shareTitle: '和我一起赚取奖励',
  },
  fr: {
    variants: {
      control: {
        eyebrow: 'Récompenses de parrainage',
        title: 'Invitez des amis',
        body: 'Partagez votre lien, gagnez des points lorsque les parrainages sont valides, puis retirez-les plus tard.',
        primaryCta: "Copier le lien d'invitation",
        secondaryCta: 'Voir le centre de récompenses',
        helper: 'Les amis doivent vérifier leur e-mail et terminer les étapes requises avant le déblocage des récompenses.',
      },
      rewards_push: {
        eyebrow: 'Récompenses de parrainage',
        title: 'Invitez des amis',
        body: 'Partagez votre lien, gagnez des points lorsque les parrainages sont valides, puis retirez-les plus tard.',
        primaryCta: "Copier mon lien d'invitation",
        secondaryCta: 'Ouvrir le centre de récompenses',
        helper: 'Les récompenses se débloquent après des parrainages valides, avec retrait via PayPal ou Crypto.',
      },
    },
    metrics: { clicks: 'Clics', registrations: 'Inscriptions', validReferrals: 'Parrainages valides', earnedPoints: 'Points gagnés' },
    copySuccess: "Lien d'invitation copié.",
    copyFail: "Échec de la copie du lien d'invitation.",
    inviteFriends: 'Inviter des amis',
    pointsRate: '10 points = 1 $',
    cashoutMethods: 'Retrait PayPal / Crypto',
    rewardsUnlock: 'Récompenses débloquées après validation',
    inviteLink: "Votre lien d'invitation",
    viewDetails: 'Voir les détails',
    cashoutProgress: 'Progression du retrait',
    points: 'points',
    cashoutUnlocks: (points: number) => `Encore ${points} points avant de débloquer le retrait.`,
    cashoutUnlocked: 'Retrait débloqué.',
    joined: (count: number) => `${count} inscrits`,
    valid: (count: number) => `${count} valides`,
    availableToCashOut: 'Disponible au retrait',
    firstCashoutUnlocks: (points: number) => `Encore ${points} points avant votre premier retrait.`,
    firstCashoutUnlocked: 'Votre premier retrait est débloqué.',
    inviteLinkTitle: "Votre lien d'invitation",
    howRewardsWork: 'Comment fonctionnent les récompenses',
    howSteps: [
      "L'ami s'inscrit avec votre lien",
      "L'ami vérifie son e-mail et termine les étapes requises",
      'Vous gagnez des points retirables plus tard',
    ],
    shareNow: 'Partager maintenant',
    shareHint: 'Choisissez le canal le plus naturel pour votre audience.',
    shareTitle: 'Rejoignez-moi et gagnez des récompenses',
  },
  de: {
    variants: {
      control: {
        eyebrow: 'Empfehlungsprämien',
        title: 'Freunde einladen',
        body: 'Teile deinen Link, sammle Punkte bei gültigen Empfehlungen und zahle sie später aus.',
        primaryCta: 'Einladungslink kopieren',
        secondaryCta: 'Prämiencenter ansehen',
        helper: 'Freunde müssen ihre E-Mail verifizieren und die erforderlichen Schritte abschließen, bevor Prämien freigeschaltet werden.',
      },
      rewards_push: {
        eyebrow: 'Empfehlungsprämien',
        title: 'Freunde einladen',
        body: 'Teile deinen Link, sammle Punkte bei gültigen Empfehlungen und zahle sie später aus.',
        primaryCta: 'Meinen Einladungslink kopieren',
        secondaryCta: 'Prämiencenter öffnen',
        helper: 'Prämien werden nach gültigen Empfehlungen freigeschaltet, Auszahlung via PayPal oder Crypto.',
      },
    },
    metrics: { clicks: 'Klicks', registrations: 'Registrierungen', validReferrals: 'Gültige Empfehlungen', earnedPoints: 'Verdiente Punkte' },
    copySuccess: 'Einladungslink kopiert.',
    copyFail: 'Einladungslink konnte nicht kopiert werden.',
    inviteFriends: 'Freunde einladen',
    pointsRate: '10 Punkte = 1 $',
    cashoutMethods: 'PayPal / Crypto Auszahlung',
    rewardsUnlock: 'Prämien nach verifizierten Empfehlungen',
    inviteLink: 'Dein Einladungslink',
    viewDetails: 'Details ansehen',
    cashoutProgress: 'Auszahlungsfortschritt',
    points: 'Punkte',
    cashoutUnlocks: (points: number) => `Noch ${points} Punkte bis zur Auszahlung.`,
    cashoutUnlocked: 'Auszahlung freigeschaltet.',
    joined: (count: number) => `${count} beigetreten`,
    valid: (count: number) => `${count} gültig`,
    availableToCashOut: 'Zur Auszahlung verfügbar',
    firstCashoutUnlocks: (points: number) => `Noch ${points} Punkte bis zur ersten Auszahlung.`,
    firstCashoutUnlocked: 'Die erste Auszahlung ist freigeschaltet.',
    inviteLinkTitle: 'Dein Einladungslink',
    howRewardsWork: 'So funktionieren die Prämien',
    howSteps: [
      'Ein Freund registriert sich über deinen Link',
      'Der Freund verifiziert die E-Mail und erledigt die erforderlichen Schritte',
      'Du erhältst Punkte, die später ausgezahlt werden können',
    ],
    shareNow: 'Jetzt teilen',
    shareHint: 'Wähle den Kanal, der sich für dein Publikum am natürlichsten anfühlt.',
    shareTitle: 'Mach mit und verdiene Prämien',
  },
  es: {
    variants: {
      control: {
        eyebrow: 'Recompensas por referidos',
        title: 'Invita a tus amigos',
        body: 'Comparte tu enlace, gana puntos cuando los referidos califiquen y retíralos más tarde.',
        primaryCta: 'Copiar enlace de invitación',
        secondaryCta: 'Ver centro de recompensas',
        helper: 'Tus amigos deben verificar su correo y completar los pasos requeridos antes de desbloquear las recompensas.',
      },
      rewards_push: {
        eyebrow: 'Recompensas por referidos',
        title: 'Invita a tus amigos',
        body: 'Comparte tu enlace, gana puntos cuando los referidos califiquen y retíralos más tarde.',
        primaryCta: 'Copiar mi enlace de invitación',
        secondaryCta: 'Abrir centro de recompensas',
        helper: 'Las recompensas se desbloquean tras referidos válidos, con retiro vía PayPal o Crypto.',
      },
    },
    metrics: { clicks: 'Clics', registrations: 'Registros', validReferrals: 'Referidos válidos', earnedPoints: 'Puntos ganados' },
    copySuccess: 'Enlace de invitación copiado.',
    copyFail: 'No se pudo copiar el enlace de invitación.',
    inviteFriends: 'Invita a tus amigos',
    pointsRate: '10 puntos = 1 $',
    cashoutMethods: 'Retiro por PayPal / Crypto',
    rewardsUnlock: 'Recompensas tras referidos verificados',
    inviteLink: 'Tu enlace de invitación',
    viewDetails: 'Ver detalles',
    cashoutProgress: 'Progreso de retiro',
    points: 'puntos',
    cashoutUnlocks: (points: number) => `Te faltan ${points} puntos para desbloquear el retiro.`,
    cashoutUnlocked: 'Retiro desbloqueado.',
    joined: (count: number) => `${count} se unieron`,
    valid: (count: number) => `${count} válidos`,
    availableToCashOut: 'Disponible para retirar',
    firstCashoutUnlocks: (points: number) => `Te faltan ${points} puntos para tu primer retiro.`,
    firstCashoutUnlocked: 'Tu primer retiro está desbloqueado.',
    inviteLinkTitle: 'Tu enlace de invitación',
    howRewardsWork: 'Cómo funcionan las recompensas',
    howSteps: [
      'Tu amigo se registra con tu enlace',
      'Tu amigo verifica su correo y completa los pasos requeridos',
      'Tú ganas puntos que podrás retirar después',
    ],
    shareNow: 'Compartir ahora',
    shareHint: 'Elige el canal que resulte más natural para tu audiencia.',
    shareTitle: 'Únete conmigo y gana recompensas',
  },
  it: {
    variants: {
      control: {
        eyebrow: 'Ricompense referral',
        title: 'Invita amici',
        body: 'Condividi il tuo link, guadagna punti quando i referral sono validi e ritirali più tardi.',
        primaryCta: 'Copia link di invito',
        secondaryCta: 'Vedi centro ricompense',
        helper: "Gli amici devono verificare l'e-mail e completare i passaggi richiesti prima che le ricompense si sblocchino.",
      },
      rewards_push: {
        eyebrow: 'Ricompense referral',
        title: 'Invita amici',
        body: 'Condividi il tuo link, guadagna punti quando i referral sono validi e ritirali più tardi.',
        primaryCta: 'Copia il mio link di invito',
        secondaryCta: 'Apri centro ricompense',
        helper: 'Le ricompense si sbloccano dopo referral validi, con prelievo via PayPal o Crypto.',
      },
    },
    metrics: { clicks: 'Clic', registrations: 'Registrazioni', validReferrals: 'Referral validi', earnedPoints: 'Punti guadagnati' },
    copySuccess: 'Link di invito copiato.',
    copyFail: 'Impossibile copiare il link di invito.',
    inviteFriends: 'Invita amici',
    pointsRate: '10 punti = 1 $',
    cashoutMethods: 'Prelievo PayPal / Crypto',
    rewardsUnlock: 'Ricompense dopo referral verificati',
    inviteLink: 'Il tuo link di invito',
    viewDetails: 'Vedi dettagli',
    cashoutProgress: 'Progresso prelievo',
    points: 'punti',
    cashoutUnlocks: (points: number) => `Ancora ${points} punti per sbloccare il prelievo.`,
    cashoutUnlocked: 'Prelievo sbloccato.',
    joined: (count: number) => `${count} iscritti`,
    valid: (count: number) => `${count} validi`,
    availableToCashOut: 'Disponibile al prelievo',
    firstCashoutUnlocks: (points: number) => `Ancora ${points} punti per il primo prelievo.`,
    firstCashoutUnlocked: 'Il tuo primo prelievo è sbloccato.',
    inviteLinkTitle: 'Il tuo link di invito',
    howRewardsWork: 'Come funzionano le ricompense',
    howSteps: [
      "L'amico si registra con il tuo link",
      "L'amico verifica l'e-mail e completa i passaggi richiesti",
      'Tu guadagni punti prelevabili in seguito',
    ],
    shareNow: 'Condividi ora',
    shareHint: 'Scegli il canale più naturale per il tuo pubblico.',
    shareTitle: 'Unisciti a me e guadagna ricompense',
  },
  pt: {
    variants: {
      control: {
        eyebrow: 'Recompensas por indicação',
        title: 'Convide amigos',
        body: 'Compartilhe seu link, ganhe pontos quando as indicações forem válidas e saque depois.',
        primaryCta: 'Copiar link de convite',
        secondaryCta: 'Ver central de recompensas',
        helper: 'Seus amigos precisam verificar o e-mail e concluir as etapas exigidas antes de liberar as recompensas.',
      },
      rewards_push: {
        eyebrow: 'Recompensas por indicação',
        title: 'Convide amigos',
        body: 'Compartilhe seu link, ganhe pontos quando as indicações forem válidas e saque depois.',
        primaryCta: 'Copiar meu link de convite',
        secondaryCta: 'Abrir central de recompensas',
        helper: 'As recompensas são liberadas após indicações válidas, com saque via PayPal ou Crypto.',
      },
    },
    metrics: { clicks: 'Cliques', registrations: 'Cadastros', validReferrals: 'Indicações válidas', earnedPoints: 'Pontos ganhos' },
    copySuccess: 'Link de convite copiado.',
    copyFail: 'Falha ao copiar o link de convite.',
    inviteFriends: 'Convide amigos',
    pointsRate: '10 pontos = 1 $',
    cashoutMethods: 'Saque via PayPal / Crypto',
    rewardsUnlock: 'Recompensas após indicações verificadas',
    inviteLink: 'Seu link de convite',
    viewDetails: 'Ver detalhes',
    cashoutProgress: 'Progresso do saque',
    points: 'pontos',
    cashoutUnlocks: (points: number) => `Faltam ${points} pontos para liberar o saque.`,
    cashoutUnlocked: 'Saque liberado.',
    joined: (count: number) => `${count} entraram`,
    valid: (count: number) => `${count} válidas`,
    availableToCashOut: 'Disponível para saque',
    firstCashoutUnlocks: (points: number) => `Faltam ${points} pontos para o primeiro saque.`,
    firstCashoutUnlocked: 'Seu primeiro saque está liberado.',
    inviteLinkTitle: 'Seu link de convite',
    howRewardsWork: 'Como funcionam as recompensas',
    howSteps: [
      'Seu amigo se cadastra com seu link',
      'Seu amigo verifica o e-mail e conclui as etapas exigidas',
      'Você ganha pontos para sacar depois',
    ],
    shareNow: 'Compartilhar agora',
    shareHint: 'Escolha o canal que pareça mais natural para seu público.',
    shareTitle: 'Junte-se a mim e ganhe recompensas',
  },
  ar: {
    variants: {
      control: {
        eyebrow: 'مكافآت الإحالة',
        title: 'ادعُ الأصدقاء',
        body: 'شارك رابطك، واكسب نقاطًا عندما تصبح الإحالات مؤهلة، ثم اسحبها لاحقًا.',
        primaryCta: 'نسخ رابط الدعوة',
        secondaryCta: 'عرض مركز المكافآت',
        helper: 'يجب على الأصدقاء توثيق البريد الإلكتروني وإكمال الخطوات المطلوبة قبل فتح المكافآت.',
      },
      rewards_push: {
        eyebrow: 'مكافآت الإحالة',
        title: 'ادعُ الأصدقاء',
        body: 'شارك رابطك، واكسب نقاطًا عندما تصبح الإحالات مؤهلة، ثم اسحبها لاحقًا.',
        primaryCta: 'نسخ رابط دعوتي',
        secondaryCta: 'فتح مركز المكافآت',
        helper: 'تُفتح المكافآت بعد اكتمال إحالات صالحة، مع السحب عبر PayPal أو Crypto.',
      },
    },
    metrics: { clicks: 'النقرات', registrations: 'التسجيلات', validReferrals: 'الإحالات الصالحة', earnedPoints: 'النقاط المكتسبة' },
    copySuccess: 'تم نسخ رابط الدعوة.',
    copyFail: 'تعذر نسخ رابط الدعوة.',
    inviteFriends: 'ادعُ الأصدقاء',
    pointsRate: '10 نقاط = 1 $',
    cashoutMethods: 'السحب عبر PayPal / Crypto',
    rewardsUnlock: 'تُفتح المكافآت بعد الإحالات الموثقة',
    inviteLink: 'رابط دعوتك',
    viewDetails: 'عرض التفاصيل',
    cashoutProgress: 'تقدم السحب',
    points: 'نقطة',
    cashoutUnlocks: (points: number) => `تحتاج إلى ${points} نقاط إضافية لفتح السحب.`,
    cashoutUnlocked: 'تم فتح السحب.',
    joined: (count: number) => `${count} انضموا`,
    valid: (count: number) => `${count} صالح`,
    availableToCashOut: 'المتاح للسحب',
    firstCashoutUnlocks: (points: number) => `تحتاج إلى ${points} نقاط إضافية لفتح أول سحب.`,
    firstCashoutUnlocked: 'تم فتح أول سحب لك.',
    inviteLinkTitle: 'رابط دعوتك',
    howRewardsWork: 'كيف تعمل المكافآت',
    howSteps: [
      'يسجل الصديق عبر رابطك',
      'يوثق الصديق بريده الإلكتروني ويكمل الخطوات المطلوبة',
      'تحصل على نقاط يمكن سحبها لاحقًا',
    ],
    shareNow: 'شارك الآن',
    shareHint: 'اختر القناة الأنسب لجمهورك.',
    shareTitle: 'انضم إليّ واكسب المكافآت',
  },
} as const;

export function ReferralRewardsHub({
  code,
  totalClicks,
  totalRegistrations,
  totalConversions,
  totalEarnings,
  pointsBalance,
  variantId = 'control',
  placement,
  compact = false,
  mobileSummary = false,
  onSecondaryAction,
}: ReferralRewardsHubProps) {
  const locale = useLocale();
  const { message } = App.useApp();
  const localeCopy = REWARDS_COPY[locale as keyof typeof REWARDS_COPY] ?? REWARDS_COPY.en;
  const copy = localeCopy.variants[variantId];
  const shareUrl = useMemo(() => generateTrackedShareUrl(code), [code]);
  const pointsToCashout = Math.max(
    0,
    FIRST_WITHDRAWAL_MIN_POINTS - pointsBalance,
  );
  const metrics = [
    { icon: MousePointerClick, label: localeCopy.metrics.clicks, value: totalClicks, tone: 'orange' as const },
    { icon: Users, label: localeCopy.metrics.registrations, value: totalRegistrations, tone: 'blue' as const },
    { icon: Link2, label: localeCopy.metrics.validReferrals, value: totalConversions, tone: 'green' as const },
    { icon: DollarSign, label: localeCopy.metrics.earnedPoints, value: totalEarnings, tone: 'yellow' as const },
  ];

  useEffect(() => {
    trackReferralExperimentEvent({
      eventType: placement === 'welcome_modal' ? 'modal_exposure' : 'hub_exposure',
      placement,
      onceKey: `${placement}:${code}`,
    });
  }, [placement, code]);

  const handleCopy = async () => {
    const success = await copyToClipboard(shareUrl);
    message[success ? 'success' : 'error'](
      success ? localeCopy.copySuccess : localeCopy.copyFail,
    );

    if (success) {
      await trackReferralExperimentEvent({
        eventType: 'copy_link',
        placement,
      });
    }
  };

  const handleShareSuccess = async (channelId: string) => {
    await Promise.allSettled([
      post('/points/track-share', { channel: channelId }),
      trackReferralExperimentEvent({
        eventType: 'share_invite',
        placement,
        channelId,
      }),
    ]);
  };

  if (compact) {
    if (mobileSummary) {
      return (
        <Card
          padding="md"
          className="relative overflow-hidden border-[#ece5d8] bg-[linear-gradient(180deg,#fffdf9_0%,#ffffff_100%)] shadow-[0_8px_20px_rgba(28,25,23,0.04)]"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/60 via-[#d6a22a] to-transparent" />
          <div className="relative space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fff3e8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                  <Gift className="h-3 w-3" />
                  {localeCopy.inviteFriends}
                </div>
                <h3 className="mt-2 text-lg font-semibold leading-tight text-[#1c1917]">
                  {copy.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-stone-500">
                  {localeCopy.rewardsUnlock}
                </p>
              </div>

              {onSecondaryAction && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  icon={<ArrowRight className="h-4 w-4" />}
                  onClick={onSecondaryAction}
                >
                  {localeCopy.viewDetails}
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <StatChip icon={Wallet} label={`${pointsBalance} ${localeCopy.points}`} />
              <StatChip icon={CheckCircle2} label={localeCopy.valid(totalConversions)} />
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card
        padding="lg"
        className="relative overflow-hidden border-[#e7e1d6] bg-[linear-gradient(180deg,#fffdf9_0%,#ffffff_100%)] shadow-[0_12px_30px_rgba(28,25,23,0.05)]"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/70 via-[#d6a22a] to-transparent" />
        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#fff3e8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                <Gift className="h-3.5 w-3.5" />
                {localeCopy.inviteFriends}
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-semibold leading-tight text-[#1c1917]">
                  {copy.title}
                </h3>
                <p className="max-w-2xl text-sm leading-6 text-stone-500">
                  {copy.body}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#ece5d8] bg-white px-3 py-2 text-sm text-stone-600">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-medium">{localeCopy.pointsRate}</span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="min-w-0 rounded-[22px] border border-[#ece5d8] bg-stone-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
                <Link2 className="h-4 w-4 text-primary" />
                {localeCopy.inviteLink}
              </div>
              <div className="mt-3 min-w-0 rounded-2xl border border-stone-200 bg-white px-4 py-3">
                <p className="truncate text-sm text-stone-700 sm:text-[15px]">{shareUrl}</p>
              </div>
              <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                <Button
                  size="md"
                  className="sm:flex-none"
                  icon={<Copy className="h-4 w-4" />}
                  onClick={handleCopy}
                >
                  {copy.primaryCta}
                </Button>
                {onSecondaryAction && (
                  <Button
                    variant="secondary"
                    size="md"
                    className="sm:flex-none"
                    icon={<ArrowRight className="h-4 w-4" />}
                    onClick={onSecondaryAction}
                  >
                    {localeCopy.viewDetails}
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-[22px] border border-[#ece5d8] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                {localeCopy.cashoutProgress}
              </p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-4xl font-semibold leading-none text-[#1c1917]">
                  {pointsBalance}
                </span>
                <span className="pb-1 text-sm text-stone-500">{localeCopy.points}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-stone-500">
                {pointsToCashout > 0
                  ? localeCopy.cashoutUnlocks(pointsToCashout)
                  : localeCopy.cashoutUnlocked}
              </p>
              <div className="mt-4 h-2 rounded-full bg-stone-100">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-primary to-[#d6a22a] transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (pointsBalance / FIRST_WITHDRAWAL_MIN_POINTS) * 100,
                    )}%`,
                  }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatChip icon={Users} label={localeCopy.joined(totalRegistrations)} />
                <StatChip icon={CheckCircle2} label={localeCopy.valid(totalConversions)} />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      padding="lg"
      className="relative overflow-hidden border-[#e7e1d6] bg-[linear-gradient(180deg,#fffdf9_0%,#ffffff_48%,#fcfbf8_100%)] shadow-[0_12px_30px_rgba(28,25,23,0.06)]"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/70 via-[#d6a22a] to-transparent" />
      <div className="relative space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#fff3e8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Gift className="h-3.5 w-3.5" />
              {copy.eyebrow}
            </div>
            <div className="space-y-2">
              <h3 className="text-[1.85rem] font-semibold leading-tight text-[#1c1917]">
                {copy.title}
              </h3>
              <p className="max-w-2xl text-[15px] leading-7 text-stone-500">
                {copy.body}
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 text-sm text-stone-600">
              <InfoPill icon={Gift}>{localeCopy.pointsRate}</InfoPill>
              <InfoPill icon={Wallet}>{localeCopy.cashoutMethods}</InfoPill>
              <InfoPill icon={CheckCircle2}>{localeCopy.rewardsUnlock}</InfoPill>
            </div>
          </div>

          <div className="w-full rounded-[24px] border border-[#ece5d8] bg-white/90 p-4 sm:max-w-[280px] lg:w-[280px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
              {localeCopy.availableToCashOut}
            </p>
            <div className="mt-3 flex items-end gap-3">
              <p className="text-5xl font-semibold leading-none text-[#1c1917]">
                {pointsBalance}
              </p>
              <span className="pb-1 text-sm text-stone-500">{localeCopy.points}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-500">
              {pointsToCashout > 0
                ? localeCopy.firstCashoutUnlocks(pointsToCashout)
                : localeCopy.firstCashoutUnlocked}
            </p>
            <div className="mt-4 h-2 rounded-full bg-stone-100">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-primary to-[#d6a22a] transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (pointsBalance / FIRST_WITHDRAWAL_MIN_POINTS) * 100,
                    )}%`,
                  }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-stone-400">
              <span>0</span>
              <span className="font-semibold text-primary">
                {FIRST_WITHDRAWAL_MIN_POINTS / POINTS_PER_USD}$ / {FIRST_WITHDRAWAL_MIN_POINTS} pts
              </span>
            </div>
          </div>
        </div>

        <div className={`grid gap-4 ${compact ? 'xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]' : 'xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.55fr)]'}`}>
          <div className="min-w-0 rounded-[24px] border border-[#ece5d8] bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
              <Link2 className="h-4 w-4 text-primary" />
              {localeCopy.inviteLinkTitle}
            </div>
            <div className="mt-3 min-w-0 rounded-[18px] border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="break-all text-[15px] leading-6 text-stone-700">{shareUrl}</p>
            </div>
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              <Button
                size="lg"
                className="sm:flex-1"
                icon={<Copy className="h-4 w-4" />}
                onClick={handleCopy}
              >
                {copy.primaryCta}
              </Button>
              {onSecondaryAction && (
                <Button
                  variant="secondary"
                  size="lg"
                  className="sm:flex-1"
                  icon={<ArrowRight className="h-4 w-4" />}
                  onClick={onSecondaryAction}
                >
                  {copy.secondaryCta}
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#ece5d8] bg-[#fcfaf5] p-4 sm:p-5">
            <p className="text-sm font-medium text-stone-500">{localeCopy.howRewardsWork}</p>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              {copy.helper}
            </p>
            <div className="mt-4 space-y-2.5">
              {localeCopy.howSteps.map((step) => (
                <HowItWorksItem key={step}>{step}</HowItWorksItem>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              icon={metric.icon}
              label={metric.label}
              value={metric.value}
              tone={metric.tone}
            />
          ))}
        </div>

        {!compact && (
          <div className="rounded-[24px] border border-[#ece5d8] bg-white p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-base font-semibold text-[#1c1917]">{localeCopy.shareNow}</p>
                <p className="text-sm text-stone-500">
                  {localeCopy.shareHint}
                </p>
              </div>
            </div>
            <ShareChannelGrid
              url={shareUrl}
              title={localeCopy.shareTitle}
              campaign="referral_invite"
              onShareSuccess={handleShareSuccess}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Coins;
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
    <div className="rounded-[22px] border border-[#ece5d8] bg-white p-4">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${toneMap[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-3xl font-semibold leading-none text-[#1c1917]">{value}</p>
      <p className="mt-2 text-sm text-stone-500">{label}</p>
    </div>
  );
}

function InfoPill({
  icon: Icon,
  children,
}: {
  icon: typeof Gift;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#ece5d8] bg-white/90 px-3 py-2">
      <Icon className="h-4 w-4 text-primary" />
      <span>{children}</span>
    </span>
  );
}

function HowItWorksItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm leading-6 text-stone-600">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#15803d]" />
      <span>{children}</span>
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
}: {
  icon: typeof Users;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-600">
      <Icon className="h-3.5 w-3.5 text-stone-400" />
      {label}
    </span>
  );
}
