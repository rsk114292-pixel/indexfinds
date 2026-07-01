import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArrowRight, Compass, ExternalLink, Search, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { FAQPageJsonLd } from '@/components/seo/FAQPageJsonLd';
import { ItemListJsonLd } from '@/components/seo/ItemListJsonLd';
import ProductCard from '@/components/ProductCard';
import { generateAlternates, getOgLocale } from '@/lib/seo';
import {
  ALL_PLATFORM_LANDING_PAGES,
  getPlatformLandingComparisonPages,
  getPlatformLandingConfigBySlugLike,
  getPlatformLandingIntentDetailCopy,
  getPlatformLandingIntentJourneyCopy,
  getPlatformLandingIntentPageUiCopy,
  getPlatformLandingIntentSeoDescription,
  getPlatformLandingIntentTitle,
  getPlatformLandingIntentUserFitCopy,
  getPlatformLandingIntentBySlug,
  getPlatformLandingPageCopy,
  getPlatformLandingTitle,
  getRelatedPlatformLandingIntents,
  PLATFORM_LANDING_INTENTS,
} from '@/lib/platform-landings';
import { API_BASE_URL } from '@/lib/constants';
import { getSiteName, getSiteUrl } from '@/lib/site-config';
import { getLocalizedName } from '@/lib/utils';
import type { ApiListResponse, Category, ProductListItem } from '@/types';
import { locales } from '@/i18n/config';
import { fetchServerApiJson } from '@/lib/server-api-fetch';

const SITE_URL = getSiteUrl();

export const revalidate = 3600;

type PageParams = {
  locale: string;
  platformSlug: string;
  intentSlug: string;
};

export async function generateStaticParams() {
  return locales.flatMap((locale) =>
    ALL_PLATFORM_LANDING_PAGES.flatMap((page) =>
      PLATFORM_LANDING_INTENTS.map((intent) => ({
        locale,
        platformSlug: page.slug,
        intentSlug: intent.slug,
      })),
    ),
  );
}

async function fetchJson<T>(path: string, revalidateSeconds: number): Promise<T | null> {
  return fetchServerApiJson<T>(`${API_BASE_URL}${path}`, {
    next: { revalidate: revalidateSeconds },
  });
}

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [
    category,
    ...(category.children ? flattenCategories(category.children) : []),
  ]);
}

async function getIntentLandingData(intentSlug: string) {
  const categoriesResponse = await fetchJson<Category[] | { data: Category[] }>(
    '/categories/home',
    3600,
  );

  const categoriesRaw = Array.isArray(categoriesResponse)
    ? categoriesResponse
    : categoriesResponse?.data || [];
  const categories = flattenCategories(categoriesRaw);
  const intent = getPlatformLandingIntentBySlug(intentSlug);

  if (!intent) {
    return null;
  }

  const category =
    categories.find((item) => intent.categoryMatches.includes(item.slug.toLowerCase())) ||
    categories.find((item) =>
      intent.categoryMatches.some((token) => item.slug.toLowerCase().includes(token)),
    ) ||
    categories.find((item) =>
      intent.categoryMatches.some((token) => item.name.toLowerCase().includes(token)),
    ) ||
    null;

  const productsResponse = await fetchJson<ApiListResponse<ProductListItem>>(
    category
      ? `/products?sortBy=popular&limit=8&categories=${category.slug}`
      : '/products?sortBy=popular&limit=8',
    900,
  );

  const products = (productsResponse?.data || []).map((product) => ({
    ...product,
    secondImage: product.secondImage,
    popularityScore: product.popularityScore ?? 0,
    price: {
      min: Number(product.price?.min ?? product.priceMin) || 0,
      max: Number(product.price?.max ?? product.priceMax) || 0,
      currency: product.price?.currency || product.currency || 'CNY',
    },
  }));

  return {
    category,
    products,
  };
}

function buildIntentQueryVariants(platformQuery: string, intentQuery: string, alternateQueries: string[]) {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  const stems = [intentQuery, ...alternateQueries];

  return stems.flatMap((query) => [
    `${platformQuery} ${query}`,
    `${platformQuery} ${query} spreadsheet`,
    `${platformQuery} ${query} yupoo`,
    `${platformQuery} ${query} links`,
    `${platformQuery} ${query} taobao`,
    `${platformQuery} ${query} ${currentYear}`,
    `${platformQuery} ${query} ${previousYear}`,
  ]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, platformSlug, intentSlug } = await params;
  const config = getPlatformLandingConfigBySlugLike(platformSlug);
  const intent = getPlatformLandingIntentBySlug(intentSlug);

  if (!config || !intent) {
    return {};
  }

  const title = getPlatformLandingIntentTitle(config, intent, locale);
  const description = getPlatformLandingIntentSeoDescription(config, intent, locale);

  return {
    title,
    description,
    keywords: buildIntentQueryVariants(
      config.primaryQuery,
      intent.query,
      intent.alternateQueries || [],
    ),
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/${config.slug}/${intent.slug}`,
      siteName: getSiteName(),
      type: 'website',
      locale: getOgLocale(locale),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: generateAlternates(`/${config.slug}/${intent.slug}`, locale),
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PlatformIntentLandingPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, platformSlug, intentSlug } = await params;
  const tCommon = await getTranslations({ locale, namespace: 'common' });
  const config = getPlatformLandingConfigBySlugLike(platformSlug);
  const intent = getPlatformLandingIntentBySlug(intentSlug);

  if (!config || !intent) {
    notFound();
  }

  if (platformSlug !== config.slug) {
    permanentRedirect(`/${locale}/${config.slug}/${intent.slug}`);
  }

  const data = await getIntentLandingData(intent.slug);

  if (!data) {
    notFound();
  }

  const siteName = getSiteName();
  const landingCopy = getPlatformLandingPageCopy(locale);
  const pageCopy = getPlatformLandingIntentPageUiCopy(locale);
  const detailCopy = getPlatformLandingIntentDetailCopy(intent, locale, config);
  const userFitCopy = getPlatformLandingIntentUserFitCopy(intent, locale, config);
  const journeyCopy = getPlatformLandingIntentJourneyCopy(intent, locale, config);
  const faqItems = detailCopy.faqItems(siteName, config.name);
  const intentQueries = buildIntentQueryVariants(
    config.primaryQuery,
    intent.query,
    intent.alternateQueries || [],
  ).slice(0, 8);
  const categoryLabel = data.category ? getLocalizedName(data.category, locale) : null;
  const userFitCards = userFitCopy.cards(
    config.name,
    intent.name,
    intent.query,
    categoryLabel,
  );
  const comparisonPages = getPlatformLandingComparisonPages(config.slug).slice(0, 6);
  const relatedIntentPages = getRelatedPlatformLandingIntents(
    intent.slug,
    4,
    categoryLabel,
  );
  const comparisonItems = comparisonPages.map((page) => ({
    name: getPlatformLandingIntentTitle(page, intent, locale),
    url: `${SITE_URL}/${locale}/${page.slug}/${intent.slug}`,
  }));

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale}
        homeName={tCommon('home')}
        items={[
          { name: landingCopy.productsLabel, url: '/products' },
          { name: getPlatformLandingTitle(config, locale), url: `/${config.slug}` },
          { name: getPlatformLandingIntentTitle(config, intent, locale), url: `/${config.slug}/${intent.slug}` },
        ]}
      />
      <ItemListJsonLd
        name={getPlatformLandingIntentTitle(config, intent, locale)}
        items={comparisonItems}
      />
      <FAQPageJsonLd items={faqItems} />

      <div className="bg-background">
        <section className="relative overflow-hidden bg-secondary">
          <div
            className="absolute -top-1/3 -right-1/4 h-[28rem] w-[28rem] rounded-full opacity-20 blur-[120px]"
            style={{ background: 'radial-gradient(circle, #FF6B47 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-1/3 -left-1/4 h-[24rem] w-[24rem] rounded-full opacity-15 blur-[100px]"
            style={{ background: 'radial-gradient(circle, #FFB347 0%, transparent 70%)' }}
          />

          <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
            <div className="max-w-4xl">
              <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {config.name} {intent.name}
              </span>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {getPlatformLandingIntentTitle(config, intent, locale)}
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-white/70 sm:text-lg">
                {detailCopy.heroDescription(config.name, siteName)}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={data.category ? `/products?sortBy=popular&categories=${data.category.slug}` : '/products?sortBy=popular'}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover"
                >
                  {pageCopy.browseLabel(intent.name)}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={`/${config.slug}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10"
                >
                  {pageCopy.backToGuideLabel(config.name)}
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {intentQueries.map((query) => (
                  <span
                    key={query}
                    className="inline-flex min-h-8 items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/72"
                  >
                    {query}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 md:py-14">
          <div className="grid gap-4 lg:grid-cols-3">
            {detailCopy.cards(config.name).map((card, index) => {
              const Icon = index === 0 ? Search : index === 1 ? Compass : Sparkles;

              return (
                <div
                  key={card.title}
                  className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {card.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{card.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-10 md:pb-14">
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-border bg-surface p-6 md:p-8">
                <h2 className="text-2xl font-bold text-foreground">
                  {detailCopy.searchAnglesTitle}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {detailCopy.searchAnglesDescription(config.name)}
                </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {intentQueries.map((query) => (
                  <span
                    key={query}
                    className="inline-flex min-h-8 items-center rounded-full bg-secondary/5 px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {query}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-6 md:p-8">
                <h2 className="text-2xl font-bold text-foreground">
                  {detailCopy.nextClickTitle}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {detailCopy.nextClickDescription(config.name)}
                </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={data.category ? `/categories/${data.category.slug}` : '/products?sortBy=popular'}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover"
                >
                  {data.category
                    ? pageCopy.openCategoryLabel(getLocalizedName(data.category, locale))
                    : pageCopy.browseProductsLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={`/${config.slug}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
                >
                  {pageCopy.openMainPageLabel(config.name)}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-10 md:pb-14">
          <div className="rounded-3xl border border-border bg-surface p-6 md:p-8">
            <div className="max-w-3xl">
                <h2 className="text-2xl font-bold text-foreground">
                  {userFitCopy.sectionTitle(config.name, intent.name)}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {userFitCopy.sectionDescription(config.name, intent.query, categoryLabel)}
                </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {userFitCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-border bg-background p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    {card.eyebrow}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold text-foreground">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-10 md:pb-14">
          <div className="rounded-3xl border border-border bg-surface p-6 md:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {detailCopy.productsTitle(config.name)}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {detailCopy.productsDescription(config.name)}
                </p>
              </div>
              <Link
                href={data.category ? `/products?sortBy=popular&categories=${data.category.slug}` : '/products?sortBy=popular'}
                className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary transition-colors duration-200 hover:text-primary-hover"
              >
                {pageCopy.viewAllLabel(intent.name)}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {data.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isHot={product.isFeatured || (product.popularityScore ?? 0) > 0}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-10 md:pb-14">
          <div className="rounded-3xl border border-border bg-surface p-6 md:p-8">
            <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {journeyCopy.relatedRoutesTitle(config.name, intent.name)}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                  {journeyCopy.relatedRoutesDescription(config.name, intent.query)}
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {relatedIntentPages.map((relatedIntent) => (
                    <Link
                      key={relatedIntent.slug}
                      href={`/${config.slug}/${relatedIntent.slug}`}
                      className="group rounded-2xl border border-border bg-background px-4 py-4 transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                            {getPlatformLandingIntentTitle(config, relatedIntent, locale)}
                          </h3>
                          <p className="mt-1 text-xs text-muted">
                            {config.primaryQuery} {relatedIntent.query}, spreadsheet, links
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-5">
                <h3 className="text-lg font-semibold text-foreground">
                  {journeyCopy.sessionTitle}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {journeyCopy.sessionDescription(config.name, intent.name)}
                </p>
                <div className="mt-5 space-y-3">
                  <Link
                    href={`/${config.slug}`}
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div>
                        <h4 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                          {journeyCopy.guideLabel(config.name)}
                        </h4>
                        <p className="mt-1 text-xs text-muted">
                          {journeyCopy.guideDescription(config.name)}
                        </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                  {comparisonPages.slice(0, 2).map((page) => (
                    <Link
                      key={`adjacent-${page.slug}`}
                      href={`/${page.slug}/${intent.slug}`}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div>
                        <h4 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                          {journeyCopy.compareLabel(page.name, intent.name)}
                        </h4>
                        <p className="mt-1 text-xs text-muted">
                          {journeyCopy.compareDescription(page.name, intent.name)}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-14 md:pb-20">
          <div className="rounded-3xl border border-border bg-surface p-6 md:p-8">
            <h2 className="text-2xl font-bold text-foreground">
              {detailCopy.compareTitle(intent.name)}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              {detailCopy.compareDescription(config.name, intent.name)}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {comparisonPages.map((page) => (
                <Link
                  key={`${page.slug}-${intent.slug}`}
                  href={`/${page.slug}/${intent.slug}`}
                  className="group rounded-2xl border border-border bg-background px-4 py-4 transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                        {getPlatformLandingIntentTitle(page, intent, locale)}
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        {page.primaryQuery} {intent.query}, spreadsheet, yupoo
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-14 md:pb-20">
          <div className="rounded-3xl border border-border bg-surface p-6 md:p-8">
            <h2 className="text-2xl font-bold text-foreground">
              {detailCopy.faqTitle(config.name)}
            </h2>
            <div className="mt-6 space-y-3">
              {faqItems.map((item) => (
                <details
                  key={item.question}
                  className="rounded-2xl border border-border bg-background px-5 py-4"
                >
                  <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
                    {item.question}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-muted">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
