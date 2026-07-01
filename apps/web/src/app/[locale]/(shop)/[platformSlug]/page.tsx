import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArrowRight, Compass, Layers3, Link2, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { FAQPageJsonLd } from '@/components/seo/FAQPageJsonLd';
import { ItemListJsonLd } from '@/components/seo/ItemListJsonLd';
import ProductCard from '@/components/ProductCard';
import BrandCard from '@/components/brands/BrandCard';
import { generateAlternates, getOgLocale } from '@/lib/seo';
import {
  ALL_PLATFORM_LANDING_PAGES,
  getPlatformLandingComparisonPages,
  getPlatformLandingConfigBySlugLike,
  getPlatformLandingFaqItems,
  getPlatformLandingIntentBySlug,
  PLATFORM_LANDING_INTENTS,
  getPlatformLandingPageCopy,
  getPlatformLandingPageStrategyCopy,
  getPlatformLandingQueryVariants,
  getPlatformLandingSeo,
  getPlatformLandingIntentTitle,
  getPlatformLandingUserFitCopy,
  getPlatformLandingNarrativeOverrides,
} from '@/lib/platform-landings';
import { API_BASE_URL } from '@/lib/constants';
import { getSiteName, getSiteUrl } from '@/lib/site-config';
import { getLocalizedName } from '@/lib/utils';
import type { ApiListResponse, Brand, Category, ProductListItem } from '@/types';
import { locales } from '@/i18n/config';
import { fetchServerApiJson } from '@/lib/server-api-fetch';

const SITE_URL = getSiteUrl();

export const revalidate = 3600;

type PageParams = {
  locale: string;
  platformSlug: string;
};

export async function generateStaticParams() {
  return locales.flatMap((locale) =>
    ALL_PLATFORM_LANDING_PAGES.map((page) => ({ locale, platformSlug: page.slug })),
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

function findCategoryForIntent(
  intent: NonNullable<ReturnType<typeof getPlatformLandingIntentBySlug>>,
  categories: Category[],
) {
  return (
    categories.find((item) => intent.categoryMatches.includes(item.slug.toLowerCase())) ||
    categories.find((item) =>
      intent.categoryMatches.some((token) => item.slug.toLowerCase().includes(token)),
    ) ||
    categories.find((item) =>
      intent.categoryMatches.some((token) => item.name.toLowerCase().includes(token)),
    ) ||
    null
  );
}

async function getLandingData(
  intentPages: NonNullable<ReturnType<typeof getPlatformLandingIntentBySlug>>[],
) {
  const [brandsResponse, categoriesResponse] = await Promise.all([
    fetchJson<ApiListResponse<Brand>>('/brands?status=active&isFeatured=true&limit=6', 3600),
    fetchJson<Category[] | { data: Category[] }>('/categories/home', 300),
  ]);

  const brands = brandsResponse?.data || [];
  const categoriesRaw = Array.isArray(categoriesResponse)
    ? categoriesResponse
    : categoriesResponse?.data || [];
  const flattenedCategories = flattenCategories(categoriesRaw);
  const intentCategoryPairs = intentPages
    .map((intent) => ({
      intent,
      category: findCategoryForIntent(intent, flattenedCategories),
    }))
    .filter(
      (pair): pair is { intent: NonNullable<typeof pair.intent>; category: Category } =>
        Boolean(pair.category),
    )
    .filter(
      (pair, index, pairs) =>
        pairs.findIndex((item) => item.category.slug === pair.category.slug) === index,
    );
  const fallbackCategories = [...categoriesRaw]
    .sort((a, b) => (b.productCount || 0) - (a.productCount || 0))
    .slice(0, 8);
  const categories = intentCategoryPairs.length > 0
    ? intentCategoryPairs.map((pair) => pair.category).slice(0, 8)
    : fallbackCategories;
  const featuredCategory = intentCategoryPairs[0]?.category || categories[0] || null;
  const productsResponse = await fetchJson<ApiListResponse<ProductListItem>>(
    featuredCategory
      ? `/products?sortBy=popular&limit=8&categories=${featuredCategory.slug}`
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
    brands,
    categories,
    intentCategoryPairs,
    featuredCategory,
    products,
  };
}

function getPlatformLandingUiLabels(locale: string) {
  switch (locale) {
    case 'zh':
      return {
        jumpToTopics: '先看热门内容',
        coverageEyebrow: 'QUICK START',
        coverageTitle: '这个页面可以看什么',
        coverageDescription:
          '你可以先看热门内容，再继续浏览品牌、分类和真实商品，整体路径会比零散搜索更顺。',
        routesLabel: '热门内容',
        routesDescription: '先从最常看的入口开始',
        keywordLabel: '热门搜索',
        keywordDescription: '常见 spreadsheet、links、yupoo 搜索都已覆盖',
        brandLabel: '热门品牌',
        brandDescription: '适合先按品牌开始看',
        categoryLabel: '热门分类',
        categoryDescription: '帮助你更快缩小范围',
        productLabel: '热门精选',
        productDescription: '直接从真实商品开始浏览',
        refreshLabel: '持续更新',
        refreshDescription: '品牌、分类和商品会持续刷新，不只是静态介绍页。',
        refreshValue: '15-60 分钟',
        quickJumpLabel: '直接看',
        quickJumpTopics: '热门内容',
        quickJumpBrands: '品牌',
        quickJumpCategories: '分类',
        quickJumpProducts: '商品',
      };
    case 'fr':
      return {
        jumpToTopics: 'Voir les contenus populaires',
        coverageEyebrow: 'DEMARRAGE RAPIDE',
        coverageTitle: "Ce que vous pouvez parcourir ici",
        coverageDescription:
          'Commencez par les contenus les plus consultes, puis continuez avec les marques, les categories et les produits visibles.',
        routesLabel: 'Contenus populaires',
        routesDescription: 'Les points d’entree les plus utiles en premier',
        keywordLabel: 'Recherches populaires',
        keywordDescription: 'Les recherches spreadsheet, links et yupoo sont deja couvertes',
        brandLabel: 'Marques populaires',
        brandDescription: 'Un bon point de depart si vous cherchez deja une marque',
        categoryLabel: 'Categories populaires',
        categoryDescription: 'Pour filtrer plus vite apres une recherche large',
        productLabel: 'Selections visibles',
        productDescription: 'De vrais produits affiches des le premier ecran',
        refreshLabel: 'Mis a jour regulierement',
        refreshDescription:
          'Les categories et les produits se renouvellent en continu, pas comme une page figee.',
        refreshValue: '15-60 min',
        quickJumpLabel: 'Voir direct',
        quickJumpTopics: 'Contenus',
        quickJumpBrands: 'Marques',
        quickJumpCategories: 'Categories',
        quickJumpProducts: 'Produits',
      };
    case 'de':
      return {
        jumpToTopics: 'Direkt zu beliebten Inhalten',
        coverageEyebrow: 'SCHNELLER START',
        coverageTitle: 'Was du hier ansehen kannst',
        coverageDescription:
          'Starte mit den beliebtesten Inhalten und geh dann weiter zu Marken, Kategorien und echten Produkten.',
        routesLabel: 'Beliebte Inhalte',
        routesDescription: 'Die nuetzlichsten Einstiege zuerst',
        keywordLabel: 'Beliebte Suchen',
        keywordDescription: 'Spreadsheet-, links- und yupoo-Suchen sind bereits abgedeckt',
        brandLabel: 'Beliebte Marken',
        brandDescription: 'Gut, wenn du schon nach einer Marke suchst',
        categoryLabel: 'Beliebte Kategorien',
        categoryDescription: 'Zum schnelleren Eingrenzen nach einer breiten Suche',
        productLabel: 'Beliebte Picks',
        productDescription: 'Sichtbare echte Produkte direkt im ersten Bereich',
        refreshLabel: 'Regelmaessig aktualisiert',
        refreshDescription:
          'Kategorien und Produkte werden laufend aktualisiert und wirken nicht wie eine statische Seite.',
        refreshValue: '15-60 Min.',
        quickJumpLabel: 'Direkt ansehen',
        quickJumpTopics: 'Inhalte',
        quickJumpBrands: 'Marken',
        quickJumpCategories: 'Kategorien',
        quickJumpProducts: 'Produkte',
      };
    case 'es':
      return {
        jumpToTopics: 'Ir a lo mas visto',
        coverageEyebrow: 'EMPEZAR RAPIDO',
        coverageTitle: 'Lo que puedes ver aqui',
        coverageDescription:
          'Empieza por los contenidos mas consultados y luego sigue con marcas, categorias y productos reales.',
        routesLabel: 'Contenidos populares',
        routesDescription: 'Primero las entradas mas utiles',
        keywordLabel: 'Busquedas populares',
        keywordDescription: 'Las busquedas spreadsheet, links y yupoo ya estan cubiertas',
        brandLabel: 'Marcas populares',
        brandDescription: 'Ideal si ya quieres empezar por una marca',
        categoryLabel: 'Categorias populares',
        categoryDescription: 'Ayuda a acotar mas rapido despues de una busqueda amplia',
        productLabel: 'Selecciones visibles',
        productDescription: 'Productos reales visibles desde el primer bloque',
        refreshLabel: 'Actualizado con frecuencia',
        refreshDescription:
          'Las categorias y los productos se actualizan continuamente, no quedan como una pagina estatica.',
        refreshValue: '15-60 min',
        quickJumpLabel: 'Ver ahora',
        quickJumpTopics: 'Contenidos',
        quickJumpBrands: 'Marcas',
        quickJumpCategories: 'Categorias',
        quickJumpProducts: 'Productos',
      };
    case 'it':
      return {
        jumpToTopics: 'Vai ai contenuti piu visti',
        coverageEyebrow: 'PARTENZA RAPIDA',
        coverageTitle: 'Cosa puoi vedere qui',
        coverageDescription:
          'Parti dai contenuti piu consultati e poi continua con brand, categorie e prodotti reali.',
        routesLabel: 'Contenuti popolari',
        routesDescription: 'Prima gli ingressi piu utili',
        keywordLabel: 'Ricerche popolari',
        keywordDescription: 'Le ricerche spreadsheet, links e yupoo sono gia coperte',
        brandLabel: 'Brand popolari',
        brandDescription: 'Utile se vuoi iniziare da un brand',
        categoryLabel: 'Categorie popolari',
        categoryDescription: 'Aiuta a restringere piu in fretta dopo una ricerca ampia',
        productLabel: 'Selezioni visibili',
        productDescription: 'Prodotti reali subito nel primo blocco',
        refreshLabel: 'Aggiornato regolarmente',
        refreshDescription:
          'Categorie e prodotti si aggiornano in modo continuo, non come una pagina statica.',
        refreshValue: '15-60 min',
        quickJumpLabel: 'Vai subito',
        quickJumpTopics: 'Contenuti',
        quickJumpBrands: 'Brand',
        quickJumpCategories: 'Categorie',
        quickJumpProducts: 'Prodotti',
      };
    case 'pt':
      return {
        jumpToTopics: 'Ir para o que mais interessa',
        coverageEyebrow: 'COMECO RAPIDO',
        coverageTitle: 'O que voce pode ver aqui',
        coverageDescription:
          'Comece pelos conteudos mais vistos e depois siga para marcas, categorias e produtos reais.',
        routesLabel: 'Conteudos populares',
        routesDescription: 'Primeiro as entradas mais uteis',
        keywordLabel: 'Buscas populares',
        keywordDescription: 'As buscas spreadsheet, links e yupoo ja estao cobertas',
        brandLabel: 'Marcas populares',
        brandDescription: 'Um bom ponto de partida se voce ja busca por marca',
        categoryLabel: 'Categorias populares',
        categoryDescription: 'Ajuda a afunilar mais rapido depois de uma busca ampla',
        productLabel: 'Selecoes visiveis',
        productDescription: 'Produtos reais logo no primeiro bloco',
        refreshLabel: 'Atualizado com frequencia',
        refreshDescription:
          'Categorias e produtos se renovam continuamente, sem parecer uma pagina estatica.',
        refreshValue: '15-60 min',
        quickJumpLabel: 'Ver agora',
        quickJumpTopics: 'Conteudos',
        quickJumpBrands: 'Marcas',
        quickJumpCategories: 'Categorias',
        quickJumpProducts: 'Produtos',
      };
    case 'ar':
      return {
        jumpToTopics: 'الانتقال إلى الأهم',
        coverageEyebrow: 'QUICK START',
        coverageTitle: 'ما الذي يمكنك تصفحه هنا',
        coverageDescription:
          'ابدأ بالمحتوى الأكثر فائدة ثم واصل التصفح عبر العلامات والفئات والمنتجات الحقيقية.',
        routesLabel: 'المحتوى الشائع',
        routesDescription: 'ابدأ من أكثر المداخل فائدة',
        keywordLabel: 'عمليات البحث الشائعة',
        keywordDescription: 'تمت تغطية spreadsheet و links و yupoo',
        brandLabel: 'العلامات الشائعة',
        brandDescription: 'مناسب إذا كنت تريد البدء من علامة معينة',
        categoryLabel: 'الفئات الشائعة',
        categoryDescription: 'تساعدك على تضييق النطاق بسرعة بعد البحث العام',
        productLabel: 'اختيارات ظاهرة',
        productDescription: 'منتجات حقيقية ظاهرة من أول الشاشة',
        refreshLabel: 'تحديث مستمر',
        refreshDescription:
          'الفئات والمنتجات تتجدد باستمرار ولا تبدو كصفحة ثابتة فقط.',
        refreshValue: '15-60 دقيقة',
        quickJumpLabel: 'شاهد مباشرة',
        quickJumpTopics: 'المحتوى',
        quickJumpBrands: 'العلامات',
        quickJumpCategories: 'الفئات',
        quickJumpProducts: 'المنتجات',
      };
    default:
      return {
        jumpToTopics: 'Jump to popular sections',
        coverageEyebrow: 'QUICK START',
        coverageTitle: 'What you can browse here',
        coverageDescription:
          'Start with the most useful sections, then keep browsing through brands, categories and real product picks.',
        routesLabel: 'Popular sections',
        routesDescription: 'The most useful places to start',
        keywordLabel: 'Popular searches',
        keywordDescription: 'Spreadsheet, links and yupoo searches already covered',
        brandLabel: 'Featured brands',
        brandDescription: 'A strong starting point for brand-led browsing',
        categoryLabel: 'Popular categories',
        categoryDescription: 'Helpful when you want to narrow faster after a broad search',
        productLabel: 'Popular picks',
        productDescription: 'Real products visible right away',
        refreshLabel: 'Updated regularly',
        refreshDescription: 'Brands, categories and products refresh continuously instead of sitting like a static guide.',
        refreshValue: '15-60 mins',
        quickJumpLabel: 'See now',
        quickJumpTopics: 'Sections',
        quickJumpBrands: 'Brands',
        quickJumpCategories: 'Categories',
        quickJumpProducts: 'Products',
      };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, platformSlug } = await params;
  const config = getPlatformLandingConfigBySlugLike(platformSlug);

  if (!config) {
    return {};
  }

  const seo = getPlatformLandingSeo(config, locale);

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    openGraph: {
      title: seo.ogTitle,
      description: seo.ogDescription,
      url: `${SITE_URL}/${locale}/${config.slug}`,
      siteName: getSiteName(),
      type: 'website',
      locale: getOgLocale(locale),
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.ogTitle,
      description: seo.ogDescription,
    },
    alternates: generateAlternates(`/${config.slug}`, locale),
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PlatformLandingPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, platformSlug } = await params;
  const tCommon = await getTranslations({ locale, namespace: 'common' });
  const config = getPlatformLandingConfigBySlugLike(platformSlug);

  if (!config) {
    notFound();
  }

  if (platformSlug !== config.slug) {
    permanentRedirect(`/${locale}/${config.slug}`);
  }

  const siteName = getSiteName();
  const copy = getPlatformLandingPageCopy(locale);
  const strategyCopy = getPlatformLandingPageStrategyCopy(config, locale);
  const userFitCopy = getPlatformLandingUserFitCopy(config, locale);
  const narrativeOverrides = getPlatformLandingNarrativeOverrides(config, locale);
  const seo = getPlatformLandingSeo(config, locale);
  const faqItems = getPlatformLandingFaqItems(config, locale);
  const queryVariants = getPlatformLandingQueryVariants(config).slice(0, 6);
  const comparisonPages = getPlatformLandingComparisonPages(config.slug);
  const intentPages = PLATFORM_LANDING_INTENTS
    .map((intent) => getPlatformLandingIntentBySlug(intent.slug))
    .filter((intent): intent is NonNullable<typeof intent> => Boolean(intent));
  const uiLabels = getPlatformLandingUiLabels(locale);
  const coreIntentSlugs = new Set(['shoes', 'bags', 'hoodies', 'watches', 'jewelry', 'pants']);
  const coreIntentPages = intentPages.filter((intent) => coreIntentSlugs.has(intent.slug));
  const adjacentIntentPages = intentPages.filter((intent) => !coreIntentSlugs.has(intent.slug));
  const { brands, categories, intentCategoryPairs, featuredCategory, products } = await getLandingData(coreIntentPages);
  const coverageStats = [
    {
      label: uiLabels.routesLabel,
      value: String(coreIntentPages.length),
      description: uiLabels.routesDescription,
    },
    {
      label: uiLabels.keywordLabel,
      value: String(queryVariants.length),
      description: uiLabels.keywordDescription,
    },
    {
      label: uiLabels.brandLabel,
      value: String(brands.length),
      description: uiLabels.brandDescription,
    },
    {
      label: uiLabels.categoryLabel,
      value: String(categories.length),
      description: uiLabels.categoryDescription,
    },
    {
      label: uiLabels.productLabel,
      value: String(products.length),
      description: uiLabels.productDescription,
    },
    {
      label: uiLabels.refreshLabel,
      value: uiLabels.refreshValue,
      description: uiLabels.refreshDescription,
    },
  ];

  const relatedItems = comparisonPages.slice(0, 10).map((page) => ({
    name: copy.heroTitle(page.name),
    url: `${SITE_URL}/${locale}/${page.slug}`,
  }));

  const intentCardCopy = copy.intentCards(siteName, config.name);
  const intentCards = [
    { icon: Search, ...intentCardCopy[0] },
    { icon: Link2, ...intentCardCopy[1] },
    { icon: Compass, ...intentCardCopy[2] },
  ];
  const workflowSteps = copy.workflowSteps(config.primaryQuery, config.name);
  const aliasCount = config.aliases?.length || 0;
  const guideCards = userFitCopy.cards(config.name, config.primaryQuery, aliasCount);

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale}
        homeName={tCommon('home')}
        items={[
          { name: copy.productsLabel, url: '/products' },
          { name: copy.heroTitle(config.name), url: `/${config.slug}` },
        ]}
      />
      <FAQPageJsonLd items={faqItems} />
      <ItemListJsonLd name={copy.itemListName(config.name)} items={relatedItems} />

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
                {copy.heroEyebrow}
              </span>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {copy.heroTitle(config.name)}
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-white/70 sm:text-lg">
                {narrativeOverrides?.heroDescription(siteName, config.name)
                  || copy.heroDescription(seo.description, config.name)}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={
                    featuredCategory
                      ? `/products?sortBy=popular&categories=${featuredCategory.slug}`
                      : '/products?sortBy=popular'
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover"
                >
                  {copy.browsePopularProducts}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#platform-topics"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10"
                >
                  {uiLabels.jumpToTopics}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {queryVariants.map((variant) => (
                  <span
                    key={variant}
                    className="inline-flex min-h-8 items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/72"
                  >
                    {variant}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 md:py-14">
          <div className="rounded-3xl border border-border bg-surface p-6 md:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {uiLabels.coverageEyebrow}
                </p>
                <h2 className="mt-3 text-2xl font-bold text-foreground">
                  {uiLabels.coverageTitle}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {uiLabels.coverageDescription}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href="#platform-topics"
                  className="inline-flex min-h-9 items-center rounded-full border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
                >
                  {uiLabels.quickJumpLabel}: {uiLabels.quickJumpTopics}
                </a>
                <a
                  href="#platform-brands"
                  className="inline-flex min-h-9 items-center rounded-full border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
                >
                  {uiLabels.quickJumpBrands}
                </a>
                <a
                  href="#platform-categories"
                  className="inline-flex min-h-9 items-center rounded-full border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
                >
                  {uiLabels.quickJumpCategories}
                </a>
                <a
                  href="#platform-products"
                  className="inline-flex min-h-9 items-center rounded-full border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
                >
                  {uiLabels.quickJumpProducts}
                </a>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {coverageStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-border bg-background px-4 py-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {stat.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-10 md:pb-14">
          <div className="grid gap-4 lg:grid-cols-3">
            {intentCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">{card.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{card.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-10 md:pb-14">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-border bg-surface p-6 md:p-8">
              <h2 className="text-2xl font-bold text-foreground">
                {copy.searchAnglesTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                {narrativeOverrides?.searchAnglesDescription(config.name)
                  || copy.searchAnglesDescription(config.name)}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {getPlatformLandingQueryVariants(config).map((variant) => (
                  <span
                    key={variant}
                    className="inline-flex min-h-8 items-center rounded-full bg-secondary/5 px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {variant}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-6 md:p-8">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {copy.workflowTitle}
              </h2>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-muted">
                {workflowSteps.map((step) => (
                  <li key={step} className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-primary" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-10 md:pb-14">
          <div className="rounded-3xl border border-border bg-surface p-6 md:p-8">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-foreground">
                {userFitCopy.sectionTitle(config.name)}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                {userFitCopy.sectionDescription(config.name)}
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {guideCards.map((card) => (
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

        <section id="platform-topics" className="container mx-auto px-4 pb-10 md:pb-14">
          <div className="rounded-3xl border border-border bg-surface p-6 md:p-8">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div>
                  <h2 className="text-2xl font-bold text-foreground">
                  {strategyCopy.topicSectionTitle(config.name)}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                  {strategyCopy.topicSectionDescription(config.name)}
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {coreIntentPages.map((intent) => (
                    <Link
                      key={intent.slug}
                      href={`/${config.slug}/${intent.slug}`}
                      className="group rounded-2xl border border-border bg-background px-4 py-4 transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                            {getPlatformLandingIntentTitle(config, intent, locale)}
                          </h3>
                          <p className="mt-1 text-xs text-muted">
                            {config.primaryQuery} {intent.query}, spreadsheet, yupoo, links
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
                  {strategyCopy.adjacentSectionTitle}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {strategyCopy.adjacentSectionDescription(config.name)}
                </p>
                <div className="mt-5 space-y-3">
                  {adjacentIntentPages.map((intent) => (
                    <Link
                      key={intent.slug}
                      href={`/${config.slug}/${intent.slug}`}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div>
                        <h4 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                          {config.name} {intent.name}
                        </h4>
                        <p className="mt-1 text-xs text-muted">
                          {config.primaryQuery} {intent.query}, spreadsheet, links
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

        <section className="container mx-auto px-4 pb-10 md:pb-14">
          <div className="grid gap-6 xl:grid-cols-2">
            <div id="platform-brands" className="rounded-3xl border border-border bg-surface p-6 md:p-8">
              <div className="flex items-center gap-3">
                <Layers3 className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">
                  {copy.brandsTitle(config.name)}
                </h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                {copy.brandsDescription}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {brands.map((brand) => (
                  <BrandCard key={brand.id} brand={brand} />
                ))}
              </div>
            </div>

            <div id="platform-categories" className="rounded-3xl border border-border bg-surface p-6 md:p-8">
              <div className="flex items-center gap-3">
                <Compass className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">
                  {copy.categoriesTitle}
                </h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                {copy.categoriesDescription}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {categories.map((category) => {
                  const matchedIntent = intentCategoryPairs.find(
                    (pair) => pair.category.slug === category.slug,
                  )?.intent;

                  return (
                    <Link
                      key={category.id}
                      href={`/categories/${category.slug}`}
                      className="rounded-2xl border border-border bg-background px-4 py-4 transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">
                            {getLocalizedName(category, locale)}
                          </h3>
                          <p className="mt-1 text-xs text-muted">
                            {matchedIntent
                              ? `${config.name} ${matchedIntent.query}`
                              : copy.categoryCardDescription}
                          </p>
                        </div>
                        <span className="rounded-full bg-secondary/5 px-2.5 py-1 text-xs font-medium text-muted">
                          {category.productCount || 0}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="platform-products" className="container mx-auto px-4 pb-10 md:pb-14">
          <div className="rounded-3xl border border-border bg-surface p-6 md:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {copy.productsTitle(config.name)}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {copy.productsDescription}
                </p>
              </div>
              <Link
                href={
                  featuredCategory
                    ? `/products?sortBy=popular&categories=${featuredCategory.slug}`
                    : '/products?sortBy=popular'
                }
                className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary transition-colors duration-200 hover:text-primary-hover"
              >
                {copy.viewAllProducts}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
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
            <h2 className="text-2xl font-bold text-foreground">
              {copy.compareTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              {narrativeOverrides?.compareDescription(config.name) || copy.compareDescription}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {comparisonPages.map((page) => (
                <Link
                  key={page.slug}
                  href={`/${page.slug}`}
                  className="group rounded-2xl border border-border bg-background px-4 py-4 transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                        {copy.heroTitle(page.name)}
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        {copy.compareCardDescription(page.primaryQuery)}
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
              {copy.faqTitle(config.name)}
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
