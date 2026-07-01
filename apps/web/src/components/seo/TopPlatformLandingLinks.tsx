'use client';

import { Link } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { ArrowRight, Layers3, Radar, Sparkles } from 'lucide-react';
import {
  ALL_PLATFORM_LANDING_PAGES,
  FEATURED_PLATFORM_LANDING_PAGES,
  PLATFORM_LANDING_INTENTS,
  getPlatformLandingSegment,
} from '@/lib/platform-landings';

const COPY = {
  en: {
    eyebrow: 'Popular Agent Guides',
    title: 'Explore popular agent spreadsheet guides',
    description:
      'Browse the most popular agent guides and jump straight into the spreadsheet paths people use most.',
    coverageTitle: 'Full coverage',
    coverageDescription:
      'These 10 guides are only the main picks. Open the full directory to browse every supported platform in one place.',
    totalLabel: 'platform guides',
    growthLabel: 'more platforms',
    topicLabel: 'guide pages',
    growthEyebrow: 'More platforms',
    growthTitle: 'More platforms worth exploring',
    growthDescription:
      'If you want to browse beyond the featured picks, the full directory is the easiest next step.',
    featuredCount: 'featured guides',
    footerStats: '10 featured, 40+ total guides',
    viewAllHint: 'View 40+ guides',
    footerTitle: 'Popular Agent Guides',
    footerDescription:
      'Quick links to the most popular spreadsheet guides.',
    viewAll: 'View all guides',
  },
  zh: {
    eyebrow: '热门代购指南',
    title: '查看热门代购平台 spreadsheet 指南',
    description: '直接进入大家最常用的代购平台指南，更快开始找货和比较。',
    coverageTitle: '全量覆盖',
    coverageDescription:
      '这里展示的是精选平台，不是全部平台。打开完整目录后，可以一次看完所有已支持的平台。',
    totalLabel: '平台专题页',
    growthLabel: '更多平台',
    topicLabel: '页面数量',
    growthEyebrow: '更多平台',
    growthTitle: '还可以继续浏览这些平台',
    growthDescription:
      '如果你想继续看更多平台，完整目录会比首页这一小块更方便。',
    featuredCount: '主推平台',
    footerStats: '10 个主推，40+ 全量指南',
    viewAllHint: '查看 40+ 指南',
    footerTitle: '热门代购指南',
    footerDescription: '快速进入最常用的 spreadsheet 专题页。',
    viewAll: '查看全部指南',
  },
  fr: {
    eyebrow: 'Guides agents',
    title: 'Explorer les guides agent spreadsheet les plus populaires',
    description:
      'Accedez directement aux guides agents les plus consultes pour commencer plus vite a parcourir les produits et comparer les options.',
    coverageTitle: 'Couverture complete',
    coverageDescription:
      'Cette section montre seulement la selection principale. Ouvre le repertoire complet pour voir toutes les plateformes prises en charge.',
    totalLabel: 'guides plateformes',
    growthLabel: 'plus de plateformes',
    topicLabel: 'pages de guide',
    growthEyebrow: 'Plus de plateformes',
    growthTitle: 'Plus de plateformes a explorer',
    growthDescription:
      'Le repertoire complet est la facon la plus simple de continuer si tu veux parcourir plus de plateformes.',
    featuredCount: 'guides principaux',
    footerStats: '10 principaux, 40+ guides au total',
    viewAllHint: 'Voir 40+ guides',
    footerTitle: 'Guides agents populaires',
    footerDescription:
      'Liens rapides vers les guides agent spreadsheet les plus consultes.',
    viewAll: 'Voir tous les guides',
  },
  de: {
    eyebrow: 'Beliebte Agent-Guides',
    title: 'Beliebte Agent-Spreadsheet-Guides entdecken',
    description:
      'Springe direkt in die meistgenutzten Agent-Guides und starte schneller mit Produktsuche und Vergleich.',
    coverageTitle: 'Volle Abdeckung',
    coverageDescription:
      'Hier siehst du nur die Hauptauswahl. Im kompletten Verzeichnis findest du alle unterstuetzten Plattformen an einem Ort.',
    totalLabel: 'Plattform-Guides',
    growthLabel: 'mehr Plattformen',
    topicLabel: 'Guide-Seiten',
    growthEyebrow: 'Mehr Plattformen',
    growthTitle: 'Mehr Plattformen zum Weiterstoebern',
    growthDescription:
      'Wenn du ueber die Hauptauswahl hinausgehen willst, ist das komplette Verzeichnis der einfachste naechste Schritt.',
    featuredCount: 'Haupt-Guides',
    footerStats: '10 Haupt-Guides, 40+ insgesamt',
    viewAllHint: '40+ Guides ansehen',
    footerTitle: 'Beliebte Agent-Guides',
    footerDescription:
      'Schnellzugriffe auf die beliebtesten Agent-Spreadsheet-Guides.',
    viewAll: 'Alle Guides ansehen',
  },
  es: {
    eyebrow: 'Guias agents',
    title: 'Explora las guias agent spreadsheet mas populares',
    description:
      'Entra directamente en las guias de agents mas usadas para empezar antes a explorar productos y comparar opciones.',
    coverageTitle: 'Cobertura completa',
    coverageDescription:
      'Aqui solo se muestra la seleccion principal. Abre el directorio completo para ver todas las plataformas disponibles.',
    totalLabel: 'guias de plataforma',
    growthLabel: 'mas plataformas',
    topicLabel: 'paginas de guia',
    growthEyebrow: 'Mas plataformas',
    growthTitle: 'Mas plataformas para explorar',
    growthDescription:
      'Si quieres seguir navegando despues de las guias principales, el directorio completo es el siguiente paso mas claro.',
    featuredCount: 'guias destacadas',
    footerStats: '10 destacadas, 40+ guias en total',
    viewAllHint: 'Ver 40+ guias',
    footerTitle: 'Guias agents populares',
    footerDescription:
      'Accesos rapidos a las guias agent spreadsheet mas populares.',
    viewAll: 'Ver todas las guias',
  },
  it: {
    eyebrow: 'Guide agents',
    title: 'Esplora le guide agent spreadsheet piu popolari',
    description:
      'Entra subito nelle guide agents piu usate per iniziare prima a esplorare prodotti e confrontare le opzioni.',
    coverageTitle: 'Copertura completa',
    coverageDescription:
      'Qui vedi solo la selezione principale. Apri la directory completa per vedere tutte le piattaforme supportate.',
    totalLabel: 'guide piattaforma',
    growthLabel: 'piu piattaforme',
    topicLabel: 'pagine guida',
    growthEyebrow: 'Piu piattaforme',
    growthTitle: 'Altre piattaforme da esplorare',
    growthDescription:
      'Se vuoi andare oltre le guide principali, la directory completa e il modo piu semplice per continuare.',
    featuredCount: 'guide principali',
    footerStats: '10 principali, 40+ guide totali',
    viewAllHint: 'Vedi 40+ guide',
    footerTitle: 'Guide agents popolari',
    footerDescription:
      'Accessi rapidi alle guide agent spreadsheet piu popolari.',
    viewAll: 'Vedi tutte le guide',
  },
  pt: {
    eyebrow: 'Guias agents',
    title: 'Explore os guias agent spreadsheet mais populares',
    description:
      'Entre direto nos guias de agents mais usados para comecar antes a explorar produtos e comparar opcoes.',
    coverageTitle: 'Cobertura total',
    coverageDescription:
      'Aqui aparece apenas a selecao principal. Abra o diretorio completo para ver todas as plataformas disponiveis.',
    totalLabel: 'guias de plataforma',
    growthLabel: 'mais plataformas',
    topicLabel: 'paginas de guia',
    growthEyebrow: 'Mais plataformas',
    growthTitle: 'Mais plataformas para explorar',
    growthDescription:
      'Se voce quiser ir alem dos destaques, o diretorio completo e o jeito mais simples de continuar navegando.',
    featuredCount: 'guias principais',
    footerStats: '10 principais, 40+ guias no total',
    viewAllHint: 'Ver 40+ guias',
    footerTitle: 'Guias agents populares',
    footerDescription:
      'Acessos rapidos aos guias agent spreadsheet mais populares.',
    viewAll: 'Ver todos os guias',
  },
  ar: {
    eyebrow: 'ادلة agents',
    title: 'استكشف ادلة agent spreadsheet الاكثر شعبية',
    description:
      'ادخل مباشرة الى ادلة agents الاكثر استخداما لتبدأ اسرع في تصفح المنتجات ومقارنة الخيارات.',
    coverageTitle: 'تغطية كاملة',
    coverageDescription:
      'المعروض هنا هو المجموعة الرئيسية فقط. افتح الدليل الكامل لرؤية كل المنصات المدعومة في مكان واحد.',
    totalLabel: 'ادلة المنصات',
    growthLabel: 'منصات اكثر',
    topicLabel: 'صفحات الدليل',
    growthEyebrow: 'منصات اكثر',
    growthTitle: 'منصات اخرى تستحق الاستكشاف',
    growthDescription:
      'اذا اردت متابعة التصفح بعد الادلة الرئيسية فالدليل الكامل هو الخطوة الابسط.',
    featuredCount: 'الادلة الرئيسية',
    footerStats: '10 رئيسية و40+ دليل كامل',
    viewAllHint: 'عرض 40+ دليلا',
    footerTitle: 'ادلة agents الشائعة',
    footerDescription:
      'روابط سريعة الى ادلة agent spreadsheet الاكثر شعبية.',
    viewAll: 'عرض كل الادلة',
  },
} as const;

function getCopy(locale: string) {
  if (locale.startsWith('zh')) return COPY.zh;
  if (locale.startsWith('fr')) return COPY.fr;
  if (locale.startsWith('de')) return COPY.de;
  if (locale.startsWith('es')) return COPY.es;
  if (locale.startsWith('it')) return COPY.it;
  if (locale.startsWith('pt')) return COPY.pt;
  if (locale.startsWith('ar')) return COPY.ar;
  return COPY.en;
}

interface TopPlatformLandingLinksProps {
  variant?: 'home' | 'footer';
}

export default function TopPlatformLandingLinks({
  variant = 'home',
}: TopPlatformLandingLinksProps) {
  const locale = useLocale();
  const copy = getCopy(locale);
  const growthPlatforms = ALL_PLATFORM_LANDING_PAGES.filter(
    (page) => getPlatformLandingSegment(page) === 'growth',
  ).slice(0, 6);
  const totalTopicRoutes = ALL_PLATFORM_LANDING_PAGES.length * PLATFORM_LANDING_INTENTS.length;

  if (variant === 'footer') {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            {copy.footerTitle}
          </h3>
          <p className="mt-1 text-sm leading-6 text-white/55">
            {copy.footerDescription}
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-white/40">
            {copy.footerStats}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          {FEATURED_PLATFORM_LANDING_PAGES.map((page) => (
            <Link
              key={page.slug}
              href={`/${page.slug}`}
              className="group inline-flex min-h-10 items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm font-medium text-white/80 transition-colors duration-200 hover:bg-white/[0.08] hover:text-white"
            >
              <span>{page.name}</span>
              <ArrowRight className="h-3.5 w-3.5 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
        <div className="mt-4">
          <Link
            href="/agents"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary transition-colors duration-200 hover:text-white"
          >
            {copy.viewAllHint}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm md:p-8">
        <div className="max-w-3xl">
          <span className="inline-flex min-h-8 items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {copy.eyebrow}
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {copy.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted md:text-base">
            {copy.description}
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {FEATURED_PLATFORM_LANDING_PAGES.map((page) => (
            <Link
              key={page.slug}
              href={`/${page.slug}`}
              className="group rounded-2xl border border-border bg-background px-4 py-4 transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                    {page.name} Spreadsheet
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    {page.primaryQuery} spreadsheet, yupoo, links
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/[0.08] via-transparent to-secondary/[0.08] p-5 md:p-6">
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="inline-flex min-h-8 items-center rounded-full bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {copy.coverageTitle}
              </span>
              <h3 className="mt-4 text-xl font-bold tracking-tight text-foreground md:text-2xl">
                {copy.growthTitle}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                {copy.coverageDescription}
              </p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                {copy.growthDescription}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-background px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                        {copy.totalLabel}
                      </p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                        {ALL_PLATFORM_LANDING_PAGES.length}
                      </p>
                    </div>
                    <Layers3 className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                        {copy.growthLabel}
                      </p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                        {growthPlatforms.length}
                      </p>
                    </div>
                    <Radar className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                        {copy.topicLabel}
                      </p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                        {totalTopicRoutes}
                      </p>
                    </div>
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    {copy.growthEyebrow}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">
                    {copy.viewAllHint}
                  </h3>
                </div>
                <span className="inline-flex min-h-8 items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  {FEATURED_PLATFORM_LANDING_PAGES.length} {copy.featuredCount}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {growthPlatforms.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/${page.slug}`}
                    className="inline-flex min-h-10 items-center rounded-full border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:border-primary/30 hover:text-primary"
                  >
                    {page.name}
                  </Link>
                ))}
              </div>

              <div className="mt-5">
                <Link
                  href="/agents"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover"
                >
                  {copy.viewAllHint}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <Link
            href="/agents"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary transition-colors duration-200 hover:text-primary-hover"
          >
            {copy.viewAllHint}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
