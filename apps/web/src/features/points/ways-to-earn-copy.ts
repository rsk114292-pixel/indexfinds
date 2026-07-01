export const WAYS_TO_EARN_COPY = {
  en: {
    eyebrow: 'Ways to earn',
    title: 'Complete a few quick actions to start earning points.',
    starter: 'Starter tasks',
    more: 'More ways to earn',
    summaryCompleted: (done: number, total: number) =>
      `${done} of ${total} starter tasks completed`,
    summaryCashout: (points: number) =>
      points > 0
        ? `${points} more points until cash-out unlocks`
        : 'Cash-out is unlocked',
    pointsBalance: 'Points balance',
    statuses: {
      done: 'Done',
      available: 'Available',
      today: 'Today',
      open: 'Open',
      inProgress: 'In progress',
    },
    tasks: {
      verify_email: {
        title: 'Verify your email',
        description: 'Confirm your email to unlock your verification reward.',
        reward: '+5',
        cta: 'Send email',
      },
      complete_profile: {
        title: 'Complete your profile',
        description: 'Add or update your profile details to earn a starter bonus.',
        reward: '+2',
        cta: 'Edit profile',
        href: '/account',
      },
      first_intent_action: {
        title: 'Favorite or tap buy once',
        description:
          'Save a product or tap buy once to earn your first intent-action reward.',
        reward: '+2',
        cta: 'Browse products',
        href: '/products',
      },
      first_share: {
        title: 'Share your first product',
        description: 'Use a product share channel once to claim your first-share bonus.',
        reward: '+3',
        cta: 'Find a product',
        href: '/products',
      },
      daily_checkin: {
        title: 'Check in today',
        description: 'Come back each day to collect points.',
        reward: '+1',
        cta: 'Check in',
      },
      daily_browse_5_products: {
        title: 'Browse 5 products',
        description: 'View 5 different product pages today.',
        reward: '+1',
        cta: 'Browse products',
        href: '/products',
      },
      daily_favorite_product: {
        title: 'Favorite 1 product',
        description: 'Save one new product today.',
        reward: '+1',
        cta: 'Browse products',
        href: '/products',
      },
      share_product: {
        title: 'Share a product',
        description:
          'Open a product page and use a share channel to earn +1 point once per channel each day.',
        reward: '+1',
        cta: 'Find a product to share',
        href: '/products',
      },
      invite_friend: {
        title: 'Invite a friend',
        description:
          'Earn more when valid referrals complete the required steps.',
        reward: 'Earn more',
        cta: 'Invite',
        href: '/account/referral',
      },
    },
    progress: {
      checkinStreak: (count: number) =>
        count > 0 ? `${count}-day streak` : 'Available today',
      dailyProgress: (count: number, target: number) => `${count}/${target} today`,
      shareToday: (count: number, limit: number) =>
        `${count}/${limit} channels claimed today`,
      inviteStats: (
        clicks: number,
        registrations: number,
        conversions: number,
      ) => `${clicks} clicks · ${registrations} joined · ${conversions} valid`,
    },
    viewAll: 'View points center',
  },
  zh: {
    eyebrow: '赚取积分',
    title: '完成几个简单任务，开始获得积分。',
    starter: '新手任务',
    more: '更多赚分方式',
    summaryCompleted: (done: number, total: number) =>
      `已完成 ${done}/${total} 个新手任务`,
    summaryCashout: (points: number) =>
      points > 0 ? `再获得 ${points} 积分即可解锁提现` : '已解锁提现',
    pointsBalance: '当前积分',
    statuses: {
      done: '已完成',
      available: '可完成',
      today: '今日任务',
      open: '去看看',
      inProgress: '进行中',
    },
    tasks: {
      verify_email: {
        title: '验证邮箱',
        description: '完成邮箱验证即可获得验证奖励。',
        reward: '+5',
        cta: '发送邮件',
      },
      complete_profile: {
        title: '完善个人资料',
        description: '添加或更新个人资料，即可获得新手奖励。',
        reward: '+2',
        cta: '去完善',
        href: '/account',
      },
      first_intent_action: {
        title: '收藏商品或点击购买',
        description:
          '收藏一个商品或点击一次购买，即可获得首次高意图动作奖励。',
        reward: '+2',
        cta: '去逛商品',
        href: '/products',
      },
      first_share: {
        title: '首次分享商品',
        description: '使用任意商品分享渠道完成首次分享，即可领取奖励。',
        reward: '+3',
        cta: '去找商品',
        href: '/products',
      },
      daily_checkin: {
        title: '今日签到',
        description: '每天回来签到即可持续获得积分。',
        reward: '+1',
        cta: '立即签到',
      },
      daily_browse_5_products: {
        title: '浏览 5 个商品',
        description: '今天浏览 5 个不同商品详情页即可获得积分。',
        reward: '+1',
        cta: '去逛商品',
        href: '/products',
      },
      daily_favorite_product: {
        title: '收藏 1 个商品',
        description: '今天新增收藏 1 个商品即可获得积分。',
        reward: '+1',
        cta: '去逛商品',
        href: '/products',
      },
      share_product: {
        title: '分享商品',
        description:
          '进入商品详情页后，使用不同分享渠道进行分享；每个渠道每天可获得 1 次 +1 积分奖励。',
        reward: '+1',
        cta: '去找可分享商品',
        href: '/products',
      },
      invite_friend: {
        title: '邀请好友',
        description: '当有效推荐成立后，你可以持续获得更多积分。',
        reward: '更多奖励',
        cta: '去邀请',
        href: '/account/referral',
      },
    },
    progress: {
      checkinStreak: (count: number) =>
        count > 0 ? `连续 ${count} 天` : '今天可签到',
      dailyProgress: (count: number, target: number) =>
        `今日进度 ${count}/${target}`,
      shareToday: (count: number, limit: number) =>
        `今日已领取 ${count}/${limit} 个渠道奖励`,
      inviteStats: (
        clicks: number,
        registrations: number,
        conversions: number,
      ) =>
        `${clicks} 次点击 · ${registrations} 人注册 · ${conversions} 个有效邀请`,
    },
    viewAll: '查看积分中心',
  },
  fr: {
    eyebrow: 'Gagner des points',
    title:
      'Complétez quelques actions simples pour commencer à gagner des points.',
    starter: 'Premières étapes',
    more: 'Autres moyens de gagner',
    summaryCompleted: (done: number, total: number) =>
      `${done} sur ${total} tâches de démarrage terminées`,
    summaryCashout: (points: number) =>
      points > 0
        ? `Encore ${points} points avant de débloquer le retrait`
        : 'Retrait débloqué',
    pointsBalance: 'Solde de points',
    statuses: {
      done: 'Terminé',
      available: 'Disponible',
      today: "Aujourd'hui",
      open: 'Ouvrir',
      inProgress: 'En cours',
    },
    tasks: {
      verify_email: {
        title: 'Vérifiez votre e-mail',
        description:
          "Débloquez votre bonus de vérification de parrainage après validation de l'e-mail.",
        reward: '+5',
        cta: "Envoyer l'e-mail",
      },
      first_intent_action: {
        title: 'Ajoutez un favori ou touchez acheter',
        description:
          "Enregistrez un produit ou touchez acheter une fois pour obtenir votre récompense d'intention.",
        reward: '+2',
        cta: 'Voir les produits',
        href: '/products',
      },
      daily_checkin: {
        title: "Check-in du jour",
        description: 'Revenez chaque jour pour gagner des points.',
        reward: '+1',
        cta: 'Valider',
      },
      share_product: {
        title: 'Partager un produit',
        description:
          'Ouvrez une page produit puis utilisez un canal de partage pour gagner +1 point une fois par canal chaque jour.',
        reward: '+1',
        cta: 'Trouver un produit à partager',
        href: '/products',
      },
      invite_friend: {
        title: 'Inviter un ami',
        description:
          'Gagnez plus lorsque les parrainages valides terminent les étapes requises.',
        reward: 'Gagner plus',
        cta: 'Inviter',
        href: '/account/referral',
      },
    },
    progress: {
      checkinStreak: (count: number) =>
        count > 0 ? `${count} jours de suite` : "Disponible aujourd'hui",
      shareToday: (count: number, limit: number) =>
        `${count}/${limit} canaux récompensés aujourd'hui`,
      inviteStats: (
        clicks: number,
        registrations: number,
        conversions: number,
      ) =>
        `${clicks} clics · ${registrations} inscrits · ${conversions} valides`,
    },
    viewAll: 'Voir le centre des points',
  },
  de: {
    eyebrow: 'Punkte sammeln',
    title: 'Erledige ein paar schnelle Aufgaben, um Punkte zu sammeln.',
    starter: 'Erste Aufgaben',
    more: 'Weitere Möglichkeiten',
    summaryCompleted: (done: number, total: number) =>
      `${done} von ${total} Startaufgaben abgeschlossen`,
    summaryCashout: (points: number) =>
      points > 0
        ? `Noch ${points} Punkte bis zur Auszahlung`
        : 'Auszahlung freigeschaltet',
    pointsBalance: 'Punktestand',
    statuses: {
      done: 'Erledigt',
      available: 'Verfügbar',
      today: 'Heute',
      open: 'Öffnen',
      inProgress: 'In Arbeit',
    },
    tasks: {
      verify_email: {
        title: 'E-Mail verifizieren',
        description:
          'Schalte deinen Bonus für die Referral-E-Mail-Verifizierung frei.',
        reward: '+5',
        cta: 'E-Mail senden',
      },
      first_intent_action: {
        title: 'Speichern oder einmal kaufen tippen',
        description:
          'Speichere ein Produkt oder tippe einmal auf Kaufen, um deine erste Intentions-Belohnung zu erhalten.',
        reward: '+2',
        cta: 'Produkte ansehen',
        href: '/products',
      },
      daily_checkin: {
        title: 'Heute einchecken',
        description: 'Komm täglich zurück, um Punkte zu sammeln.',
        reward: '+1',
        cta: 'Einchecken',
      },
      share_product: {
        title: 'Produkt teilen',
        description:
          'Öffne eine Produktseite und nutze einen Teilen-Kanal, um einmal pro Kanal und Tag +1 Punkt zu erhalten.',
        reward: '+1',
        cta: 'Produkt zum Teilen finden',
        href: '/products',
      },
      invite_friend: {
        title: 'Freund einladen',
        description:
          'Verdiene mehr, wenn gültige Einladungen die erforderlichen Schritte abschließen.',
        reward: 'Mehr verdienen',
        cta: 'Einladen',
        href: '/account/referral',
      },
    },
    progress: {
      checkinStreak: (count: number) =>
        count > 0 ? `${count} Tage in Folge` : 'Heute verfügbar',
      shareToday: (count: number, limit: number) =>
        `${count}/${limit} Kanäle heute eingelöst`,
      inviteStats: (
        clicks: number,
        registrations: number,
        conversions: number,
      ) =>
        `${clicks} Klicks · ${registrations} Registrierungen · ${conversions} gültig`,
    },
    viewAll: 'Punktebereich ansehen',
  },
  es: {
    eyebrow: 'Ganar puntos',
    title: 'Completa unas acciones rápidas para empezar a ganar puntos.',
    starter: 'Tareas iniciales',
    more: 'Más formas de ganar',
    summaryCompleted: (done: number, total: number) =>
      `${done} de ${total} tareas iniciales completadas`,
    summaryCashout: (points: number) =>
      points > 0
        ? `Te faltan ${points} puntos para desbloquear el retiro`
        : 'Retiro desbloqueado',
    pointsBalance: 'Saldo de puntos',
    statuses: {
      done: 'Hecho',
      available: 'Disponible',
      today: 'Hoy',
      open: 'Abrir',
      inProgress: 'En progreso',
    },
    tasks: {
      verify_email: {
        title: 'Verifica tu correo',
        description:
          'Desbloquea tu bono de verificación de referido después de verificar el correo.',
        reward: '+5',
        cta: 'Enviar correo',
      },
      first_intent_action: {
        title: 'Guarda o toca comprar una vez',
        description:
          'Guarda un producto o toca comprar una vez para obtener tu recompensa por primera intención.',
        reward: '+2',
        cta: 'Ver productos',
        href: '/products',
      },
      daily_checkin: {
        title: 'Regístrate hoy',
        description: 'Vuelve cada día para ganar puntos.',
        reward: '+1',
        cta: 'Registrar',
      },
      share_product: {
        title: 'Compartir un producto',
        description:
          'Abre una página de producto y usa un canal para compartir y ganar +1 punto una vez por canal cada día.',
        reward: '+1',
        cta: 'Buscar un producto para compartir',
        href: '/products',
      },
      invite_friend: {
        title: 'Invita a un amigo',
        description:
          'Gana más cuando las referencias válidas completen los pasos requeridos.',
        reward: 'Ganar más',
        cta: 'Invitar',
        href: '/account/referral',
      },
    },
    progress: {
      checkinStreak: (count: number) =>
        count > 0 ? `${count} días seguidos` : 'Disponible hoy',
      shareToday: (count: number, limit: number) =>
        `${count}/${limit} canales reclamados hoy`,
      inviteStats: (
        clicks: number,
        registrations: number,
        conversions: number,
      ) =>
        `${clicks} clics · ${registrations} registros · ${conversions} válidos`,
    },
    viewAll: 'Ver centro de puntos',
  },
  it: {
    eyebrow: 'Guadagna punti',
    title:
      'Completa alcune azioni rapide per iniziare a guadagnare punti.',
    starter: 'Attività iniziali',
    more: 'Altri modi per guadagnare',
    summaryCompleted: (done: number, total: number) =>
      `${done} di ${total} attività iniziali completate`,
    summaryCashout: (points: number) =>
      points > 0
        ? `Ancora ${points} punti per sbloccare il prelievo`
        : 'Prelievo sbloccato',
    pointsBalance: 'Saldo punti',
    statuses: {
      done: 'Fatto',
      available: 'Disponibile',
      today: 'Oggi',
      open: 'Apri',
      inProgress: 'In corso',
    },
    tasks: {
      verify_email: {
        title: 'Verifica la tua email',
        description:
          "Sblocca il bonus per la verifica email referral dopo la conferma dell'email.",
        reward: '+5',
        cta: 'Invia email',
      },
      first_intent_action: {
        title: 'Salva o tocca acquista una volta',
        description:
          'Salva un prodotto o tocca acquista una volta per ottenere la tua ricompensa della prima intenzione.',
        reward: '+2',
        cta: 'Sfoglia prodotti',
        href: '/products',
      },
      daily_checkin: {
        title: 'Check-in di oggi',
        description: 'Torna ogni giorno per raccogliere punti.',
        reward: '+1',
        cta: 'Fai check-in',
      },
      share_product: {
        title: 'Condividi un prodotto',
        description:
          'Apri una pagina prodotto e usa un canale di condivisione per ottenere +1 punto una volta per canale al giorno.',
        reward: '+1',
        cta: 'Trova un prodotto da condividere',
        href: '/products',
      },
      invite_friend: {
        title: 'Invita un amico',
        description:
          'Guadagna di più quando i referral validi completano i passaggi richiesti.',
        reward: 'Guadagna di più',
        cta: 'Invita',
        href: '/account/referral',
      },
    },
    progress: {
      checkinStreak: (count: number) =>
        count > 0 ? `${count} giorni di fila` : 'Disponibile oggi',
      shareToday: (count: number, limit: number) =>
        `${count}/${limit} canali riscossi oggi`,
      inviteStats: (
        clicks: number,
        registrations: number,
        conversions: number,
      ) =>
        `${clicks} clic · ${registrations} iscritti · ${conversions} validi`,
    },
    viewAll: 'Vai al centro punti',
  },
  pt: {
    eyebrow: 'Ganhe pontos',
    title: 'Conclua algumas ações rápidas para começar a ganhar pontos.',
    starter: 'Tarefas iniciais',
    more: 'Mais formas de ganhar',
    summaryCompleted: (done: number, total: number) =>
      `${done} de ${total} tarefas iniciais concluídas`,
    summaryCashout: (points: number) =>
      points > 0
        ? `Faltam ${points} pontos para desbloquear o saque`
        : 'Saque desbloqueado',
    pointsBalance: 'Saldo de pontos',
    statuses: {
      done: 'Concluído',
      available: 'Disponível',
      today: 'Hoje',
      open: 'Abrir',
      inProgress: 'Em andamento',
    },
    tasks: {
      verify_email: {
        title: 'Verifique seu e-mail',
        description:
          'Desbloqueie seu bônus de verificação de indicação após confirmar o e-mail.',
        reward: '+5',
        cta: 'Enviar e-mail',
      },
      first_intent_action: {
        title: 'Salve ou toque em comprar uma vez',
        description:
          'Salve um produto ou toque em comprar uma vez para ganhar sua recompensa da primeira intenção.',
        reward: '+2',
        cta: 'Ver produtos',
        href: '/products',
      },
      daily_checkin: {
        title: 'Check-in de hoje',
        description: 'Volte todos os dias para ganhar pontos.',
        reward: '+1',
        cta: 'Fazer check-in',
      },
      share_product: {
        title: 'Compartilhe um produto',
        description:
          'Abra uma página de produto e use um canal de compartilhamento para ganhar +1 ponto uma vez por canal por dia.',
        reward: '+1',
        cta: 'Encontrar um produto para compartilhar',
        href: '/products',
      },
      invite_friend: {
        title: 'Convide um amigo',
        description:
          'Ganhe mais quando indicações válidas concluírem as etapas exigidas.',
        reward: 'Ganhe mais',
        cta: 'Convidar',
        href: '/account/referral',
      },
    },
    progress: {
      checkinStreak: (count: number) =>
        count > 0 ? `${count} dias seguidos` : 'Disponível hoje',
      shareToday: (count: number, limit: number) =>
        `${count}/${limit} canais resgatados hoje`,
      inviteStats: (
        clicks: number,
        registrations: number,
        conversions: number,
      ) =>
        `${clicks} cliques · ${registrations} cadastros · ${conversions} válidos`,
    },
    viewAll: 'Ver central de pontos',
  },
  ar: {
    eyebrow: 'طرق كسب النقاط',
    title: 'أكمل بعض الخطوات السريعة لبدء كسب النقاط.',
    starter: 'المهام الأساسية',
    more: 'طرق أخرى للكسب',
    summaryCompleted: (done: number, total: number) =>
      `أكملت ${done} من ${total} من مهام البداية`,
    summaryCashout: (points: number) =>
      points > 0 ? `تحتاج إلى ${points} نقاط إضافية لفتح السحب` : 'تم فتح السحب',
    pointsBalance: 'رصيد النقاط',
    statuses: {
      done: 'مكتمل',
      available: 'متاح',
      today: 'اليوم',
      open: 'فتح',
      inProgress: 'قيد التنفيذ',
    },
    tasks: {
      verify_email: {
        title: 'تحقق من بريدك الإلكتروني',
        description:
          'افتح مكافأة التحقق الخاصة بالإحالة بعد تأكيد البريد الإلكتروني.',
        reward: '+5',
        cta: 'إرسال البريد',
      },
      first_intent_action: {
        title: 'أضف للمفضلة أو اضغط شراء مرة واحدة',
        description:
          'احفظ منتجًا أو اضغط شراء مرة واحدة لتحصل على مكافأة أول إجراء نية.',
        reward: '+2',
        cta: 'تصفح المنتجات',
        href: '/products',
      },
      daily_checkin: {
        title: 'تسجيل اليوم',
        description: 'عد كل يوم لجمع النقاط.',
        reward: '+1',
        cta: 'سجل الآن',
      },
      share_product: {
        title: 'شارك منتجًا',
        description:
          'افتح صفحة منتج واستخدم قناة مشاركة لتحصل على +1 نقطة مرة واحدة لكل قناة يوميًا.',
        reward: '+1',
        cta: 'ابحث عن منتج للمشاركة',
        href: '/products',
      },
      invite_friend: {
        title: 'ادعُ صديقًا',
        description:
          'اكسب المزيد عندما تكمل الإحالات الصالحة الخطوات المطلوبة.',
        reward: 'اكسب المزيد',
        cta: 'ادعُ الآن',
        href: '/account/referral',
      },
    },
    progress: {
      checkinStreak: (count: number) =>
        count > 0 ? `${count} أيام متتالية` : 'متاح اليوم',
      shareToday: (count: number, limit: number) =>
        `تم تحصيل ${count}/${limit} قناة اليوم`,
      inviteStats: (
        clicks: number,
        registrations: number,
        conversions: number,
      ) =>
        `${clicks} نقرات · ${registrations} تسجيلات · ${conversions} صالحة`,
    },
    viewAll: 'عرض مركز النقاط',
  },
} as const;

export type WaysToEarnCopy = typeof WAYS_TO_EARN_COPY.en;

export function getWaysToEarnCopy(locale: string): WaysToEarnCopy {
  const fallback = WAYS_TO_EARN_COPY.en;
  const localized =
    WAYS_TO_EARN_COPY[locale as keyof typeof WAYS_TO_EARN_COPY] ?? fallback;

  return {
    ...fallback,
    ...localized,
    statuses: {
      ...fallback.statuses,
      ...localized.statuses,
    },
    tasks: {
      ...fallback.tasks,
      ...localized.tasks,
    },
    progress: {
      ...fallback.progress,
      ...localized.progress,
    },
  } as WaysToEarnCopy;
}
