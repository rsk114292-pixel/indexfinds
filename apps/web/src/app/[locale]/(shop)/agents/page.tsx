import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, Layers3, Radar, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ItemListJsonLd } from '@/components/seo/ItemListJsonLd';
import {
  ALL_PLATFORM_LANDING_PAGES,
  FEATURED_PLATFORM_LANDING_PAGES,
  PLATFORM_LANDING_INTENTS,
  getPlatformLandingSegment,
} from '@/lib/platform-landings';
import { defaultGoogleBot, generateAlternates, getOgLocale } from '@/lib/seo';
import { getSiteName, getSiteUrl } from '@/lib/site-config';

const SITE_URL = getSiteUrl();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  const title = t('agentsTitle');
  const description = t('agentsDescription');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/agents`,
      siteName: getSiteName(),
      type: 'website',
      locale: getOgLocale(locale),
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    alternates: generateAlternates('/agents', locale),
    robots: { index: true, follow: true, googleBot: defaultGoogleBot },
  };
}

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: 'agentsPage' }),
    getTranslations({ locale, namespace: 'common' }),
  ]);

  const growthPlatforms = ALL_PLATFORM_LANDING_PAGES.filter(
    (page) => getPlatformLandingSegment(page) === 'growth',
  );
  const longTailPlatforms = ALL_PLATFORM_LANDING_PAGES.filter(
    (page) => getPlatformLandingSegment(page) === 'long_tail',
  );
  const alphabeticalPlatforms = [...ALL_PLATFORM_LANDING_PAGES].sort((left, right) =>
    left.name.localeCompare(right.name, 'en'),
  );
  const groupedPlatforms = alphabeticalPlatforms.reduce<Record<string, typeof alphabeticalPlatforms>>(
    (groups, page) => {
      const letter = page.name.charAt(0).toUpperCase();
      const groupKey = /^[A-Z]$/.test(letter) ? letter : '#';

      groups[groupKey] = [...(groups[groupKey] || []), page];
      return groups;
    },
    {},
  );
  const availableLetters = Object.keys(groupedPlatforms).sort((left, right) =>
    left.localeCompare(right, 'en'),
  );
  const coverageStats = [
    { label: t('totalPlatforms'), value: ALL_PLATFORM_LANDING_PAGES.length, icon: Layers3 },
    { label: t('featuredPlatforms'), value: FEATURED_PLATFORM_LANDING_PAGES.length, icon: Sparkles },
    { label: t('growthPlatforms'), value: growthPlatforms.length, icon: Radar },
    { label: t('longTailPlatforms'), value: longTailPlatforms.length, icon: ArrowRight },
    {
      label: t('topicRoutes'),
      value: ALL_PLATFORM_LANDING_PAGES.length * PLATFORM_LANDING_INTENTS.length,
      icon: Layers3,
    },
  ];

  const listItems = ALL_PLATFORM_LANDING_PAGES.map((page) => ({
    name: `${page.name} Spreadsheet`,
    url: `${SITE_URL}/${locale}/${page.slug}`,
  }));
  const featuredTopics = PLATFORM_LANDING_INTENTS.filter((intent) =>
    ['shoes', 'bags', 'hoodies', 'jewelry', 'watches', 'pants'].includes(intent.slug),
  );

  return (
    <>
      <ItemListJsonLd name={t('listName')} items={listItems} />

      <div id="top" className="bg-background">
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm md:p-8">
            <div className="max-w-3xl">
              <span className="inline-flex min-h-8 items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t('eyebrow')}
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {t('heading')}
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted md:text-base">
                {t('body')}
              </p>
            </div>

            <div className="mt-8 rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/[0.08] via-transparent to-secondary/[0.08] p-5 md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <span className="inline-flex min-h-8 items-center rounded-full bg-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    {t('directoryEyebrow')}
                  </span>
                  <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
                    {t('statsTitle')}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {t('directoryHint')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableLetters.map((letter) => (
                    <a
                      key={letter}
                      href={`#agents-letter-${letter}`}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition-colors duration-200 hover:border-primary/30 hover:text-primary"
                    >
                      {letter}
                    </a>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {coverageStats.map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-border bg-background px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                            {stat.label}
                          </p>
                          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                            {stat.value}
                          </p>
                        </div>
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground md:text-xl">
                    {t('featuredTitle')}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {t('featuredDescription')}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
                        <p className="mt-1 text-xs text-muted">{t('cardSuffix')}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-10">
              <div>
                <h2 className="text-lg font-semibold text-foreground md:text-xl">
                  {t('growthTitle')}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {t('growthDescription')}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {growthPlatforms.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/${page.slug}`}
                    className="group rounded-2xl border border-border bg-background px-4 py-4 transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="inline-flex min-h-7 items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                          {t('growthBadge')}
                        </div>
                        <h3 className="mt-3 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                          {page.name} Spreadsheet
                        </h3>
                        <p className="mt-1 text-xs text-muted">
                          {page.primaryQuery} {t('cardSuffix')}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-10">
              <div>
                <h2 className="text-lg font-semibold text-foreground md:text-xl">
                  {t('topicTitle')}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {t('topicDescription')}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {FEATURED_PLATFORM_LANDING_PAGES.flatMap((page) =>
                  featuredTopics.map((intent) => (
                    <Link
                      key={`${page.slug}-${intent.slug}`}
                      href={`/${page.slug}/${intent.slug}`}
                      className="group rounded-2xl border border-border bg-background px-4 py-4 transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                            {page.name} {intent.name}
                          </h3>
                          <p className="mt-1 text-xs text-muted">
                            {page.primaryQuery} {intent.query}, spreadsheet, yupoo
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                    </Link>
                  )),
                )}
              </div>
            </div>

            <div className="mt-10">
              <div>
                <h2 className="text-lg font-semibold text-foreground md:text-xl">
                  {t('directoryTitle')}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {t('directoryDescription')}
                </p>
              </div>

              <div className="mt-6 space-y-8">
                {availableLetters.map((letter) => (
                  <div key={letter} id={`agents-letter-${letter}`} className="scroll-mt-24">
                    <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                          {letter}
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {t('jumpTo')} {letter}
                          </h3>
                          <p className="text-sm text-muted">
                            {groupedPlatforms[letter]?.length || 0} {t('groupCountLabel')}
                          </p>
                        </div>
                      </div>
                      <a
                        href="#top"
                        className="text-sm font-medium text-primary transition-colors duration-200 hover:text-primary-hover"
                      >
                        {tCommon('backToTop')}
                      </a>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {groupedPlatforms[letter].map((page) => {
                        const segment = getPlatformLandingSegment(page);
                        const segmentLabel =
                          segment === 'featured'
                            ? t('featuredBadge')
                            : segment === 'growth'
                              ? t('growthBadge')
                              : t('longTailBadge');
                        const segmentClasses =
                          segment === 'featured'
                            ? 'bg-primary/10 text-primary'
                            : segment === 'growth'
                              ? 'bg-secondary/15 text-foreground'
                              : 'bg-muted/15 text-muted';

                        return (
                          <Link
                            key={page.slug}
                            href={`/${page.slug}`}
                            className="group rounded-2xl border border-border bg-background px-4 py-4 transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div
                                  className={`inline-flex min-h-7 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${segmentClasses}`}
                                >
                                  {segmentLabel}
                                </div>
                                <h3 className="mt-3 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                                  {page.name} Spreadsheet
                                </h3>
                                <p className="mt-1 text-xs text-muted">
                                  {page.primaryQuery} {t('cardSuffix')}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
