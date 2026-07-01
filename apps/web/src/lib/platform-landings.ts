import { defaultLocale, locales, type Locale } from '@/i18n/config';
import { getSiteName } from '@/lib/site-config';

export interface PlatformLandingConfig {
  key: string;
  slug: string;
  name: string;
  primaryQuery: string;
  alternateQueries?: string[];
  aliases?: string[];
}

type PlatformLandingDefinition = {
  key: string;
  name: string;
  primaryQuery?: string;
  alternateQueries?: string[];
  aliases?: string[];
};

export interface PlatformLandingIntentConfig {
  slug: string;
  name: string;
  query: string;
  alternateQueries?: string[];
  categoryMatches: string[];
}

type PlatformLandingIntentJourneyCopy = {
  relatedRoutesTitle: (platformName: string, intentName: string) => string;
  relatedRoutesDescription: (platformName: string, intentQuery: string) => string;
  sessionTitle: string;
  sessionDescription: (platformName: string, intentName: string) => string;
  guideLabel: (platformName: string) => string;
  guideDescription: (platformName: string) => string;
  compareLabel: (pageName: string, intentName: string) => string;
  compareDescription: (pageName: string, intentName: string) => string;
};

type PlatformLandingIntentDetailCopy = {
  heroDescription: (platformName: string, siteName: string) => string;
  cards: (platformName: string) => Array<{
    title: string;
    description: string;
  }>;
  searchAnglesTitle: string;
  searchAnglesDescription: (platformName: string) => string;
  nextClickTitle: string;
  nextClickDescription: (platformName: string) => string;
  productsTitle: (platformName: string) => string;
  productsDescription: (platformName: string) => string;
  compareTitle: (intentName: string) => string;
  compareDescription: (platformName: string, intentName: string) => string;
  faqTitle: (platformName: string) => string;
  faqItems: (siteName: string, platformName: string) => Array<{
    question: string;
    answer: string;
  }>;
};

type PlatformLandingIntentPageUiCopy = {
  browseLabel: (intentName: string) => string;
  backToGuideLabel: (platformName: string) => string;
  matchedCategoryDescription: (categoryLabel: string) => string;
  noExactCategoryDescription: string;
  openCategoryLabel: (categoryLabel: string) => string;
  browseProductsLabel: string;
  openMainPageLabel: (platformName: string) => string;
  viewAllLabel: (intentName: string) => string;
};

type PlatformLandingPageCopy = {
  productsLabel: string;
  itemListName: (platformName: string) => string;
  heroEyebrow: string;
  heroTitle: (platformName: string) => string;
  heroDescription: (seoDescription: string, platformName: string) => string;
  browsePopularProducts: string;
  researchToCheckout: string;
  intentCards: (siteName: string, platformName: string) => Array<{
    title: string;
    description: string;
  }>;
  workflowTitle: string;
  workflowSteps: (platformQuery: string, platformName: string) => string[];
  searchAnglesTitle: string;
  searchAnglesDescription: (platformName: string) => string;
  brandsTitle: (platformName: string) => string;
  brandsDescription: string;
  categoriesTitle: string;
  categoriesDescription: string;
  categoryCardDescription: string;
  productsTitle: (platformName: string) => string;
  productsDescription: string;
  viewAllProducts: string;
  compareTitle: string;
  compareDescription: string;
  compareCardDescription: (platformQuery: string) => string;
  faqTitle: (platformName: string) => string;
  seoDescription: (siteName: string, platformName: string) => string;
  faqItems: (
    siteName: string,
    platformName: string,
    platformQuery: string,
  ) => Array<{ question: string; answer: string }>;
};

type PlatformLandingSegment = 'featured' | 'growth' | 'long_tail';

type PlatformLandingPageStrategyCopy = {
  heroContext: (platformName: string) => string;
  topicSectionTitle: (platformName: string) => string;
  topicSectionDescription: (platformName: string) => string;
  adjacentSectionTitle: string;
  adjacentSectionDescription: (platformName: string) => string;
};

type PlatformLandingUserFitCopy = {
  sectionTitle: (platformName: string) => string;
  sectionDescription: (platformName: string) => string;
  cards: (
    platformName: string,
    platformQuery: string,
    aliasCount: number,
  ) => Array<{
    eyebrow: string;
    title: string;
    description: string;
  }>;
};

type PlatformLandingIntentUserFitCopy = {
  sectionTitle: (platformName: string, intentName: string) => string;
  sectionDescription: (
    platformName: string,
    intentQuery: string,
    categoryLabel: string | null,
  ) => string;
  cards: (
    platformName: string,
    intentName: string,
    intentQuery: string,
    categoryLabel: string | null,
  ) => Array<{
    eyebrow: string;
    title: string;
    description: string;
  }>;
};

type PlatformLandingNarrativeOverrides = {
  seoDescription: (siteName: string, platformName: string) => string;
  heroDescription: (siteName: string, platformName: string) => string;
  searchAnglesDescription: (platformName: string) => string;
  compareDescription: (platformName: string) => string;
};

function normalizeLocale(locale: string): Locale {
  return (locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : defaultLocale;
}

const PLATFORM_LANDING_COPY: Record<Locale, PlatformLandingPageCopy> = {
  en: {
    productsLabel: 'Products',
    itemListName: (platformName) => `${platformName} spreadsheet hubs`,
    heroEyebrow: 'Popular Agent Guide',
    heroTitle: (platformName) => `${platformName} Spreadsheet Finds`,
    heroDescription: (seoDescription, platformName) =>
      `${seoDescription} Start here if you want to browse ${platformName} finds, compare brands and categories, and get to useful product pages faster.`,
    browsePopularProducts: 'Browse Popular Products',
    researchToCheckout: 'How It Works',
    intentCards: (siteName, platformName) => [
      {
        title: `Find ${platformName} picks faster`,
        description:
          `Turn broad ${platformName} spreadsheet searches into a clearer browsing path inside ${siteName}.`,
      },
      {
        title: 'Keep useful links together',
        description:
          `Browse spreadsheet, yupoo, links, Taobao and 1688 paths for ${platformName} without jumping between scattered sources.`,
      },
      {
        title: 'Go from browsing to buying',
        description:
          'Start with brands, categories and products here, then continue to your preferred agent platform when you are ready to buy.',
      },
    ],
    workflowTitle: 'How to use this page',
    workflowSteps: (platformQuery, platformName) => [
      `Start by browsing the common ${platformQuery} spreadsheet terms shown above.`,
      'Use brands and categories below to narrow the catalog faster.',
      'Open product pages to review QC photos, SKU options and details.',
      `Move to ${platformName} or another agent platform when you want to purchase.`,
    ],
    searchAnglesTitle: 'Popular searches people start with',
    searchAnglesDescription: (platformName) =>
      `These are some of the most common ways people search around ${platformName}. Start with the one that matches what you want to browse.`,
    brandsTitle: (platformName) => `Popular brands for ${platformName} users`,
    brandsDescription:
      'Start with recognizable brands if you already know the style or labels you want to browse.',
    categoriesTitle: 'Popular categories to browse',
    categoriesDescription:
      'Jump into the categories people usually browse next after searching for this platform.',
    categoryCardDescription: 'Browse products and finds in this category.',
    productsTitle: (platformName) => `Popular finds for ${platformName} users`,
    productsDescription:
      'These picks help you move straight into product discovery instead of starting from a blank search.',
    viewAllProducts: 'View all products',
    compareTitle: 'Explore more agent guides',
    compareDescription:
      'Browse similar guides for other agents if you want to compare pages, links and product discovery paths.',
    compareCardDescription: (platformQuery) => `${platformQuery} finds, yupoo and links`,
    faqTitle: (platformName) => `${platformName} spreadsheet FAQ`,
    seoDescription: (siteName, platformName) =>
      `Explore ${platformName} spreadsheet finds on ${siteName}. Browse Weidian, Taobao and 1688 products with QC photos, SKU details and organized links.`,
    faqItems: (siteName, platformName, platformQuery) => [
      {
        question: `What is a ${platformName} spreadsheet page?`,
        answer:
          `${platformName} spreadsheet searches usually refer to curated product finds, organized links, and QC-photo research for Weidian, Taobao and 1688 items. ` +
          `${siteName} turns that research into an easier page to browse.`,
      },
      {
        question: `Can I use ${platformName} with Weidian or Taobao links?`,
        answer:
          `Yes. ${siteName} is built to help you discover Weidian, Taobao and 1688 products first, then continue to your preferred agent platform when you are ready to buy.`,
      },
      {
        question: `Does ${siteName} sell products directly?`,
        answer:
          `${siteName} is an independent product discovery site, not the official ${platformName} platform. You use it to research products, compare brands and categories, and then move to checkout on an agent platform.`,
      },
      {
        question: `Which searches should I use with ${platformName}?`,
        answer:
          `The most common variants are ${platformQuery} spreadsheet, ${platformQuery} yupoo, ${platformQuery} links and ${platformQuery} taobao. This page keeps those browsing paths in one place.`,
      },
    ],
  },
  zh: {
    productsLabel: '商品',
    itemListName: (platformName) => `${platformName} Spreadsheet 专题聚合`,
    heroEyebrow: '热门代购指南',
    heroTitle: (platformName) => `${platformName} Spreadsheet 精选`,
    heroDescription: (seoDescription, platformName) =>
      `${seoDescription} 如果你想更快开始浏览 ${platformName} 相关商品、筛品牌和分类、再进入具体商品页，就可以从这个页面开始。`,
    browsePopularProducts: '浏览热门商品',
    researchToCheckout: '使用方式',
    intentCards: (siteName, platformName) => [
      {
        title: `更快找到 ${platformName} 热门精选`,
        description: `把常见的 ${platformName} spreadsheet 搜索整理成更清晰的浏览路径。`,
      },
      {
        title: '把常用入口放在一起看',
        description: `把 spreadsheet、yupoo、links、Taobao 和 1688 这些常见找货入口集中在一个页面里。`,
      },
      {
        title: '从浏览到下单更顺畅',
        description: '先在这里看品牌、分类和商品，再在你准备购买时跳转到偏好的代购平台。',
      },
    ],
    workflowTitle: '这个页面怎么用',
    workflowSteps: (platformQuery, platformName) => [
      `先从上面的 ${platformQuery} spreadsheet 等常见词开始浏览。`,
      '通过下面的品牌和分类更快缩小范围。',
      '进入商品页查看 QC 实拍、SKU 选项和细节信息。',
      `准备购买时，再跳转到 ${platformName} 或其他代购平台。`,
    ],
    searchAnglesTitle: '大家常用的搜索词',
    searchAnglesDescription: (platformName) =>
      `这些都是围绕 ${platformName} 的常见搜索方式。你可以直接从最符合自己需求的词开始浏览。`,
    brandsTitle: (platformName) => `${platformName} 用户常看的品牌`,
    brandsDescription: '如果你已经有想看的风格或品牌，可以从这里直接开始筛选。',
    categoriesTitle: '热门分类入口',
    categoriesDescription: '从大家最常继续浏览的分类开始，更容易快速缩小范围。',
    categoryCardDescription: '查看这个分类下的商品和相关精选。',
    productsTitle: (platformName) => `${platformName} 用户常看的热门商品`,
    productsDescription: '如果你想直接开始看商品，可以从这批热门精选往下逛。',
    viewAllProducts: '查看全部商品',
    compareTitle: '查看更多代购平台指南',
    compareDescription: '如果你还想比较其他代购平台，可以继续看这些相关专题页。',
    compareCardDescription: (platformQuery) => `${platformQuery} 精选、yupoo 和 links`,
    faqTitle: (platformName) => `${platformName} spreadsheet 常见问题`,
    seoDescription: (siteName, platformName) =>
      `在 ${siteName} 浏览 ${platformName} spreadsheet 精选。发现来自 Weidian、Taobao 和 1688 的商品，查看 QC 实拍、SKU 细节和整理好的链接。`,
    faqItems: (siteName, platformName, platformQuery) => [
      {
        question: `${platformName} spreadsheet 页面是什么？`,
        answer:
          `${platformName} spreadsheet 相关搜索通常指的是整理好的商品精选、链接集合，以及针对 Weidian、Taobao 和 1688 商品的 QC 实拍研究。${siteName} 把这些需求整理成了可浏览的专题页。`,
      },
      {
        question: `我可以把 ${platformName} 和 Weidian 或 Taobao 链接一起用吗？`,
        answer:
          `可以。${siteName} 的作用是先帮助你发现 Weidian、Taobao 和 1688 商品，然后在你准备购买时继续跳转到偏好的代购平台。`,
      },
      {
        question: `${siteName} 会直接卖商品吗？`,
        answer:
          `${siteName} 是独立的商品发现网站，不是官方的 ${platformName} 平台。你可以在这里做商品研究、比较品牌和分类，然后再去代购平台完成下单。`,
      },
      {
        question: `搜索 ${platformName} 时我应该用哪些词？`,
        answer:
          `最常见的意图变体包括 ${platformQuery} spreadsheet、${platformQuery} yupoo、${platformQuery} links 和 ${platformQuery} taobao。这个专题页就是把这些找货路径集中到一个地方。`,
      },
    ],
  },
  fr: {
    productsLabel: 'Produits',
    itemListName: (platformName) => `Guides spreadsheet ${platformName}`,
    heroEyebrow: 'Guide plateforme populaire',
    heroTitle: (platformName) => `Selections ${platformName} Spreadsheet`,
    heroDescription: (seoDescription, platformName) =>
      `${seoDescription} Commencez ici pour parcourir les trouvailles ${platformName}, comparer des marques et des categories, puis ouvrir plus vite les fiches produit utiles.`,
    browsePopularProducts: 'Parcourir les produits populaires',
    researchToCheckout: 'Comment l\'utiliser',
    intentCards: (_siteName, platformName) => [
      {
        title: `Trouver plus vite des selections ${platformName}`,
        description: `Utilisez cette page pour transformer une recherche large ${platformName} spreadsheet en parcours de navigation plus clair.`,
      },
      {
        title: 'Garder les entrees utiles au meme endroit',
        description: `Retrouvez spreadsheet, yupoo, links, Taobao et 1688 pour ${platformName} sans multiplier les sources.`,
      },
      {
        title: 'Passer de la decouverte a l\'achat',
        description: 'Commencez ici par les marques, les categories et les produits, puis continuez vers votre plateforme preferee lorsque vous etes pret a acheter.',
      },
    ],
    workflowTitle: 'Comment utiliser cette page',
    workflowSteps: (platformQuery, platformName) => [
      `Commencez par parcourir les termes ${platformQuery} spreadsheet les plus courants affiches ci-dessus.`,
      'Servez-vous des marques et des categories ci-dessous pour filtrer plus vite.',
      'Ouvrez les fiches produit pour verifier les photos QC, les SKU et les details utiles.',
      `Passez ensuite vers ${platformName} ou une autre plateforme lorsque vous voulez commander.`,
    ],
    searchAnglesTitle: 'Recherches populaires pour commencer',
    searchAnglesDescription: (platformName) =>
      `Voici quelques-unes des recherches les plus frequentes autour de ${platformName}. Commencez par celle qui correspond le mieux a ce que vous voulez parcourir.`,
    brandsTitle: (platformName) => `Marques populaires pour les utilisateurs ${platformName}`,
    brandsDescription:
      'Commencez par les marques les plus reconnaissables si vous savez deja quels styles ou labels vous voulez parcourir.',
    categoriesTitle: 'Categories populaires a parcourir',
    categoriesDescription:
      'Accedez directement aux categories que les visiteurs consultent le plus souvent apres une recherche sur cette plateforme.',
    categoryCardDescription: 'Voir les produits et trouvailles de cette categorie.',
    productsTitle: (platformName) => `Selections populaires pour ${platformName}`,
    productsDescription:
      'Ces selections vous aident a passer directement a la decouverte produit au lieu de repartir d\'une recherche vide.',
    viewAllProducts: 'Voir tous les produits',
    compareTitle: 'Explorer d\'autres guides de plateforme',
    compareDescription:
      'Parcourez d\'autres guides de plateforme si vous voulez comparer plus facilement les parcours, les liens et les produits.',
    compareCardDescription: (platformQuery) => `${platformQuery} spreadsheet, yupoo et links`,
    faqTitle: (platformName) => `Questions frequentes ${platformName} spreadsheet`,
    seoDescription: (siteName, platformName) =>
      `Explorez les selections ${platformName} spreadsheet sur ${siteName}. Parcourez des produits Weidian, Taobao et 1688 avec photos QC, details SKU et liens organises.`,
    faqItems: (siteName, platformName, platformQuery) => [
      {
        question: `Qu'est-ce qu'une page ${platformName} spreadsheet ?`,
        answer:
          `Les recherches ${platformName} spreadsheet renvoient generalement a des selections de produits, des liens organises et de la recherche QC autour d'articles Weidian, Taobao et 1688. ${siteName} transforme ce besoin en page navigable.`,
      },
      {
        question: `Puis-je utiliser ${platformName} avec des liens Weidian ou Taobao ?`,
        answer:
          `Oui. ${siteName} vous aide d'abord a reperer des produits Weidian, Taobao et 1688, puis a poursuivre vers votre plateforme preferee au moment d'acheter.`,
      },
      {
        question: `${siteName} vend-il directement des produits ?`,
        answer:
          `${siteName} est un site independant de decouverte produit, et non la plateforme officielle ${platformName}. Vous l'utilisez pour rechercher, comparer des marques et des categories, puis passer a l'achat sur une plateforme tierce.`,
      },
      {
        question: `Quelles recherches utiliser avec ${platformName} ?`,
        answer:
          `Les variantes les plus courantes sont ${platformQuery} spreadsheet, ${platformQuery} yupoo, ${platformQuery} links et ${platformQuery} taobao. Cette page rassemble ces chemins de navigation au meme endroit.`,
      },
    ],
  },
  de: {
    productsLabel: 'Produkte',
    itemListName: (platformName) => `${platformName} Spreadsheet-Hubs`,
    heroEyebrow: 'Beliebter Plattform-Guide',
    heroTitle: (platformName) => `${platformName} Spreadsheet-Auswahl`,
    heroDescription: (seoDescription, platformName) =>
      `${seoDescription} Starte hier, wenn du ${platformName} Auswahl durchsuchen, Marken und Kategorien vergleichen und schneller zu passenden Produktseiten kommen willst.`,
    browsePopularProducts: 'Beliebte Produkte ansehen',
    researchToCheckout: 'So nutzt du die Seite',
    intentCards: (_siteName, platformName) => [
      {
        title: `${platformName} Auswahl schneller finden`,
        description: `Verwandle breite ${platformName} spreadsheet Suchen in einen klareren Navigationspfad auf dieser Seite.`,
      },
      {
        title: 'Nutzliche Einstiege zusammenhalten',
        description: `Durchsuche spreadsheet, yupoo, links, Taobao und 1688 rund um ${platformName}, ohne zwischen verstreuten Quellen zu springen.`,
      },
      {
        title: 'Von der Entdeckung zum Kauf',
        description: 'Starte hier mit Marken, Kategorien und Produkten und wechsle erst dann zu deiner bevorzugten Agent-Plattform, wenn du kaufen willst.',
      },
    ],
    workflowTitle: 'So verwendest du diese Seite',
    workflowSteps: (platformQuery, platformName) => [
      `Starte mit den haufigen ${platformQuery} spreadsheet Begriffen oben auf der Seite.`,
      'Nutze Marken und Kategorien unten, um den Katalog schneller einzugrenzen.',
      'Offne Produktseiten fur QC-Fotos, SKU-Optionen und relevante Details.',
      `Wechsle zu ${platformName} oder einer anderen Agent-Plattform, wenn du kaufen mochtest.`,
    ],
    searchAnglesTitle: 'Beliebte Suchen zum Start',
    searchAnglesDescription: (platformName) =>
      `Das sind einige der haufigsten Suchvarianten rund um ${platformName}. Starte mit der Variante, die am besten zu dem passt, was du durchsuchen willst.`,
    brandsTitle: (platformName) => `Beliebte Marken fur ${platformName}-Nutzer`,
    brandsDescription:
      'Beginne mit bekannten Marken, wenn du schon weisst, welchen Stil oder welches Label du ansehen willst.',
    categoriesTitle: 'Beliebte Kategorien zum Stobern',
    categoriesDescription:
      'Springe direkt in die Kategorien, die Besucher nach einer Suche zu dieser Plattform am haufigsten als Nächstes ansehen.',
    categoryCardDescription: 'Kategorie-Discovery und passende Produkte dazu ansehen.',
    productsTitle: (platformName) => `Beliebte Auswahl fur ${platformName}`,
    productsDescription:
      'Diese Auswahl hilft dir, direkt mit der Produktsuche zu beginnen, statt wieder bei einer leeren Suche zu starten.',
    viewAllProducts: 'Alle Produkte ansehen',
    compareTitle: 'Weitere Plattform-Guides ansehen',
    compareDescription:
      'Sieh dir weitere Plattform-Guides an, wenn du Seiten, Links und Entdeckungswege leichter vergleichen willst.',
    compareCardDescription: (platformQuery) => `${platformQuery} spreadsheet, yupoo und links`,
    faqTitle: (platformName) => `Haufige Fragen zu ${platformName} spreadsheet`,
    seoDescription: (siteName, platformName) =>
      `Entdecke ${platformName} spreadsheet-Auswahl auf ${siteName}. Durchsuche Produkte von Weidian, Taobao und 1688 mit QC-Fotos, SKU-Details und organisierten Links.`,
    faqItems: (siteName, platformName, platformQuery) => [
      {
        question: `Was ist eine ${platformName} spreadsheet Seite?`,
        answer:
          `${platformName} spreadsheet Suchen beziehen sich meist auf kuratierte Produkte, organisierte Links und QC-Recherche rund um Weidian-, Taobao- und 1688-Artikel. ${siteName} macht daraus eine leicht zu durchsuchende Seite.`,
      },
      {
        question: `Kann ich ${platformName} mit Weidian- oder Taobao-Links nutzen?`,
        answer:
          `Ja. ${siteName} hilft dir zuerst bei der Produktsuche auf Weidian, Taobao und 1688 und fuhrt dich danach zu deiner bevorzugten Agent-Plattform weiter, wenn du kaufen willst.`,
      },
      {
        question: `Verkauft ${siteName} Produkte direkt?`,
        answer:
          `${siteName} ist eine unabhangige Produktentdeckungsseite und nicht die offizielle ${platformName}-Plattform. Du nutzt sie fur Recherche, Marken- und Kategorievergleich und wechselst danach zum Checkout auf einer Agent-Plattform.`,
      },
      {
        question: `Welche Suchen sollte ich mit ${platformName} verwenden?`,
        answer:
          `Die haufigsten Varianten sind ${platformQuery} spreadsheet, ${platformQuery} yupoo, ${platformQuery} links und ${platformQuery} taobao. Diese Seite bundelt genau diese Pfade an einem Ort.`,
      },
    ],
  },
  es: {
    productsLabel: 'Productos',
    itemListName: (platformName) => `Hubs spreadsheet de ${platformName}`,
    heroEyebrow: 'Guia de plataforma popular',
    heroTitle: (platformName) => `Selecciones ${platformName} Spreadsheet`,
    heroDescription: (seoDescription, platformName) =>
      `${seoDescription} Empieza aqui si quieres explorar selecciones de ${platformName}, comparar marcas y categorias y llegar mas rapido a paginas de producto utiles.`,
    browsePopularProducts: 'Ver productos populares',
    researchToCheckout: 'Como usar esta pagina',
    intentCards: (_siteName, platformName) => [
      {
        title: `Encuentra selecciones de ${platformName} mas rapido`,
        description: `Convierte una busqueda amplia de ${platformName} spreadsheet en una ruta de navegacion mas clara.`,
      },
      {
        title: 'Mantener juntas las entradas utiles',
        description: `Reune spreadsheet, yupoo, links, Taobao y 1688 para ${platformName} sin saltar entre fuentes dispersas.`,
      },
      {
        title: 'De descubrir a comprar',
        description: 'Empieza aqui con marcas, categorias y productos, y pasa a tu plataforma agente preferida solo cuando estes listo para comprar.',
      },
    ],
    workflowTitle: 'Como usar esta pagina',
    workflowSteps: (platformQuery, platformName) => [
      `Empieza por las expresiones ${platformQuery} spreadsheet mas comunes que ves arriba.`,
      'Usa las marcas y categorias de abajo para reducir el catalogo mas rapido.',
      'Abre las paginas de producto para revisar fotos QC, opciones SKU y detalles utiles.',
      `Pasa a ${platformName} u otra plataforma agente cuando quieras comprar.`,
    ],
    searchAnglesTitle: 'Busquedas populares para empezar',
    searchAnglesDescription: (platformName) =>
      `Estas son algunas de las busquedas mas comunes alrededor de ${platformName}. Empieza por la que mejor encaje con lo que quieres explorar.`,
    brandsTitle: (platformName) => `Marcas populares para usuarios de ${platformName}`,
    brandsDescription:
      'Empieza por marcas reconocibles si ya sabes el estilo o las etiquetas que quieres ver.',
    categoriesTitle: 'Categorias populares para explorar',
    categoriesDescription:
      'Ve directamente a las categorias que los usuarios suelen abrir justo despues de buscar esta plataforma.',
    categoryCardDescription: 'Explora esta categoria y los productos relacionados.',
    productsTitle: (platformName) => `Selecciones populares para ${platformName}`,
    productsDescription:
      'Estas selecciones te ayudan a pasar directo al descubrimiento de producto en vez de empezar desde una busqueda vacia.',
    viewAllProducts: 'Ver todos los productos',
    compareTitle: 'Explora mas guias de plataforma',
    compareDescription:
      'Consulta mas guias de plataforma si quieres comparar mejor rutas, enlaces y caminos de descubrimiento.',
    compareCardDescription: (platformQuery) => `${platformQuery} spreadsheet, yupoo y links`,
    faqTitle: (platformName) => `Preguntas frecuentes de ${platformName} spreadsheet`,
    seoDescription: (siteName, platformName) =>
      `Explora las selecciones ${platformName} spreadsheet en ${siteName}. Descubre productos de Weidian, Taobao y 1688 con fotos QC, detalles SKU y enlaces bien organizados.`,
    faqItems: (siteName, platformName, platformQuery) => [
      {
        question: `Que es una pagina ${platformName} spreadsheet?`,
        answer:
          `Las busquedas ${platformName} spreadsheet suelen referirse a selecciones curadas, enlaces organizados e investigacion QC alrededor de articulos de Weidian, Taobao y 1688. ${siteName} convierte esa necesidad en una pagina mas facil de recorrer.`,
      },
      {
        question: `Puedo usar ${platformName} con enlaces de Weidian o Taobao?`,
        answer:
          `Si. ${siteName} te ayuda primero a descubrir productos de Weidian, Taobao y 1688, y despues a continuar hacia tu plataforma agente preferida cuando ya quieras comprar.`,
      },
      {
        question: `Vende ${siteName} productos directamente?`,
        answer:
          `${siteName} es un sitio independiente de descubrimiento de productos, no la plataforma oficial ${platformName}. Lo usas para investigar, comparar marcas y categorias, y luego pasar al checkout en una plataforma agente.`,
      },
      {
        question: `Que busquedas debo usar con ${platformName}?`,
        answer:
          `Las variantes mas comunes son ${platformQuery} spreadsheet, ${platformQuery} yupoo, ${platformQuery} links y ${platformQuery} taobao. Esta pagina mantiene esas rutas de navegacion en un solo lugar.`,
      },
    ],
  },
  it: {
    productsLabel: 'Prodotti',
    itemListName: (platformName) => `Hub spreadsheet ${platformName}`,
    heroEyebrow: 'Guida piattaforma popolare',
    heroTitle: (platformName) => `Selezioni ${platformName} Spreadsheet`,
    heroDescription: (seoDescription, platformName) =>
      `${seoDescription} Inizia qui se vuoi esplorare le selezioni di ${platformName}, confrontare brand e categorie e arrivare piu velocemente alle pagine prodotto utili.`,
    browsePopularProducts: 'Sfoglia i prodotti popolari',
    researchToCheckout: 'Come usare questa pagina',
    intentCards: (_siteName, platformName) => [
      {
        title: `Trova piu velocemente le selezioni ${platformName}`,
        description: `Trasforma una ricerca ampia ${platformName} spreadsheet in un percorso di navigazione piu chiaro.`,
      },
      {
        title: 'Tieni insieme gli ingressi utili',
        description: `Riunisci spreadsheet, yupoo, links, Taobao e 1688 per ${platformName} senza spargere la ricerca tra troppe fonti.`,
      },
      {
        title: 'Dalla scoperta al checkout',
        description: 'Inizia qui con brand, categorie e prodotti, poi passa alla tua piattaforma agente preferita quando sei davvero pronto a comprare.',
      },
    ],
    workflowTitle: 'Come usare questa pagina',
    workflowSteps: (platformQuery, platformName) => [
      `Inizia dai termini ${platformQuery} spreadsheet piu comuni mostrati qui sopra.`,
      'Usa brand e categorie qui sotto per restringere il catalogo piu velocemente.',
      'Apri le pagine prodotto per controllare foto QC, opzioni SKU e dettagli utili.',
      `Passa a ${platformName} o a un altra piattaforma agente quando vuoi acquistare.`,
    ],
    searchAnglesTitle: 'Ricerche popolari da cui partire',
    searchAnglesDescription: (platformName) =>
      `Queste sono alcune delle ricerche piu comuni intorno a ${platformName}. Parti da quella che corrisponde meglio a cio che vuoi esplorare.`,
    brandsTitle: (platformName) => `Brand popolari per utenti ${platformName}`,
    brandsDescription:
      'Parti dai brand piu riconoscibili se hai gia in mente lo stile o le etichette che vuoi vedere.',
    categoriesTitle: 'Categorie popolari da esplorare',
    categoriesDescription:
      'Vai direttamente nelle categorie che gli utenti aprono piu spesso subito dopo una ricerca su questa piattaforma.',
    categoryCardDescription: 'Esplora questa categoria e i prodotti collegati.',
    productsTitle: (platformName) => `Selezioni popolari per ${platformName}`,
    productsDescription:
      'Queste selezioni ti aiutano a iniziare subito la scoperta prodotto invece di ripartire da una ricerca vuota.',
    viewAllProducts: 'Vedi tutti i prodotti',
    compareTitle: 'Esplora altre guide piattaforma',
    compareDescription:
      'Guarda altre guide piattaforma se vuoi confrontare meglio percorsi, link e modi diversi di scoprire prodotti.',
    compareCardDescription: (platformQuery) => `${platformQuery} spreadsheet, yupoo e links`,
    faqTitle: (platformName) => `Domande frequenti ${platformName} spreadsheet`,
    seoDescription: (siteName, platformName) =>
      `Esplora le selezioni ${platformName} spreadsheet su ${siteName}. Scopri prodotti da Weidian, Taobao e 1688 con foto QC, dettagli SKU e link ben organizzati.`,
    faqItems: (siteName, platformName, platformQuery) => [
      {
        question: `Che cos e una pagina ${platformName} spreadsheet?`,
        answer:
          `Le ricerche ${platformName} spreadsheet di solito indicano selezioni curate di prodotti, link organizzati e ricerca QC attorno ad articoli di Weidian, Taobao e 1688. ${siteName} trasforma tutto questo in una pagina piu facile da esplorare.`,
      },
      {
        question: `Posso usare ${platformName} con link Weidian o Taobao?`,
        answer:
          `Si. ${siteName} ti aiuta prima a scoprire prodotti da Weidian, Taobao e 1688 e poi a passare alla piattaforma agente che preferisci quando sei pronto a comprare.`,
      },
      {
        question: `${siteName} vende prodotti direttamente?`,
        answer:
          `${siteName} e un sito indipendente di product discovery, non la piattaforma ufficiale ${platformName}. Lo usi per fare ricerca, confrontare brand e categorie e poi passare al checkout su una piattaforma agente.`,
      },
      {
        question: `Quali ricerche dovrei usare con ${platformName}?`,
        answer:
          `Le varianti piu comuni sono ${platformQuery} spreadsheet, ${platformQuery} yupoo, ${platformQuery} links e ${platformQuery} taobao. Questa pagina raccoglie questi percorsi in un unico posto.`,
      },
    ],
  },
  pt: {
    productsLabel: 'Produtos',
    itemListName: (platformName) => `Hubs spreadsheet de ${platformName}`,
    heroEyebrow: 'Guia de plataforma popular',
    heroTitle: (platformName) => `Selecoes ${platformName} Spreadsheet`,
    heroDescription: (seoDescription, platformName) =>
      `${seoDescription} Comece aqui se quiser explorar selecoes de ${platformName}, comparar marcas e categorias e chegar mais rapido a paginas de produto uteis.`,
    browsePopularProducts: 'Ver produtos populares',
    researchToCheckout: 'Como usar esta pagina',
    intentCards: (_siteName, platformName) => [
      {
        title: `Encontre selecoes de ${platformName} mais rapido`,
        description: `Transforme uma busca ampla por ${platformName} spreadsheet em um caminho de navegacao mais claro.`,
      },
      {
        title: 'Mantenha os atalhos uteis juntos',
        description: `Reuna spreadsheet, yupoo, links, Taobao e 1688 ligados a ${platformName} sem espalhar a busca por varias fontes.`,
      },
      {
        title: 'Da descoberta a compra',
        description: 'Comece aqui por marcas, categorias e produtos e avance para sua plataforma agente preferida somente quando estiver pronto para comprar.',
      },
    ],
    workflowTitle: 'Como usar esta pagina',
    workflowSteps: (platformQuery, platformName) => [
      `Comece pelos termos ${platformQuery} spreadsheet mais comuns mostrados acima.`,
      'Use as marcas e categorias abaixo para reduzir o catalogo mais rapidamente.',
      'Abra as paginas de produto para revisar fotos QC, opcoes de SKU e detalhes.',
      `Siga para ${platformName} ou outra plataforma agente quando quiser comprar.`,
    ],
    searchAnglesTitle: 'Buscas populares para comecar',
    searchAnglesDescription: (platformName) =>
      `Estas sao algumas das buscas mais comuns em torno de ${platformName}. Comece pela que mais combina com o que voce quer explorar.`,
    brandsTitle: (platformName) => `Marcas populares para usuarios de ${platformName}`,
    brandsDescription:
      'Comece por marcas reconheciveis se voce ja souber qual estilo ou quais labels quer ver.',
    categoriesTitle: 'Categorias populares para explorar',
    categoriesDescription:
      'Vá direto para as categorias que os visitantes mais costumam abrir logo depois de pesquisar esta plataforma.',
    categoryCardDescription: 'Explore esta categoria e os produtos relacionados.',
    productsTitle: (platformName) => `Selecoes populares para ${platformName}`,
    productsDescription:
      'Estas selecoes ajudam voce a entrar direto na descoberta de produtos em vez de recomecar com uma busca vazia.',
    viewAllProducts: 'Ver todos os produtos',
    compareTitle: 'Explore mais guias de plataforma',
    compareDescription:
      'Veja mais guias de plataforma se quiser comparar melhor paginas, links e caminhos de descoberta.',
    compareCardDescription: (platformQuery) => `${platformQuery} spreadsheet, yupoo e links`,
    faqTitle: (platformName) => `Perguntas frequentes de ${platformName} spreadsheet`,
    seoDescription: (siteName, platformName) =>
      `Explore as selecoes ${platformName} spreadsheet no ${siteName}. Descubra produtos de Weidian, Taobao e 1688 com fotos QC, detalhes de SKU e links bem organizados.`,
    faqItems: (siteName, platformName, platformQuery) => [
      {
        question: `O que e uma pagina ${platformName} spreadsheet?`,
        answer:
          `Buscas por ${platformName} spreadsheet geralmente se referem a selecoes curadas de produtos, links organizados e pesquisa QC em torno de itens de Weidian, Taobao e 1688. ${siteName} transforma isso em uma pagina mais facil de navegar.`,
      },
      {
        question: `Posso usar ${platformName} com links de Weidian ou Taobao?`,
        answer:
          `Sim. ${siteName} ajuda primeiro a descobrir produtos de Weidian, Taobao e 1688 e depois a continuar para sua plataforma agente preferida quando voce estiver pronto para comprar.`,
      },
      {
        question: `${siteName} vende produtos diretamente?`,
        answer:
          `${siteName} e um site independente de descoberta de produtos, nao a plataforma oficial ${platformName}. Voce o usa para pesquisar, comparar marcas e categorias e depois ir ao checkout em uma plataforma agente.`,
      },
      {
        question: `Quais buscas devo usar com ${platformName}?`,
        answer:
          `As variacoes mais comuns sao ${platformQuery} spreadsheet, ${platformQuery} yupoo, ${platformQuery} links e ${platformQuery} taobao. Esta pagina mantem esses caminhos em um so lugar.`,
      },
    ],
  },
  ar: {
    productsLabel: 'المنتجات',
    itemListName: (platformName) => `دليل ${platformName} spreadsheet`,
    heroEyebrow: 'دليل منصة شائع',
    heroTitle: (platformName) => `مختارات ${platformName} spreadsheet`,
    heroDescription: (seoDescription, platformName) =>
      `${seoDescription} ابدأ من هنا اذا كنت تريد تصفح مختارات ${platformName} ومقارنة العلامات التجارية والفئات والوصول بشكل اسرع الى صفحات المنتجات المفيدة.`,
    browsePopularProducts: 'تصفح المنتجات الشائعة',
    researchToCheckout: 'كيفية استخدام الصفحة',
    intentCards: (_siteName, platformName) => [
      {
        title: `اعثر على اختيارات ${platformName} بشكل اسرع`,
        description: `حوّل بحث ${platformName} spreadsheet الواسع الى مسار تصفح اوضح داخل الصفحة.`,
      },
      {
        title: 'اجمع المداخل المفيدة في مكان واحد',
        description: `استعرض spreadsheet و yupoo و links و Taobao و 1688 الخاصة بـ ${platformName} من دون التنقل بين مصادر متفرقة.`,
      },
      {
        title: 'من الاكتشاف الى الشراء',
        description: 'ابدأ هنا بالعلامات التجارية والفئات والمنتجات ثم انتقل الى منصة الوكيل المفضلة لديك عندما تكون جاهزا للشراء.',
      },
    ],
    workflowTitle: 'كيفية استخدام هذه الصفحة',
    workflowSteps: (platformQuery, platformName) => [
      `ابدأ بعبارات ${platformQuery} spreadsheet الشائعة الظاهرة في الاعلى.`,
      'استخدم العلامات التجارية والفئات بالاسفل لتضييق الكتالوج بشكل اسرع.',
      'افتح صفحات المنتجات لمراجعة صور QC وخيارات SKU والتفاصيل.',
      `انتقل الى ${platformName} او منصة وكيل اخرى عندما تريد الشراء.`,
    ],
    searchAnglesTitle: 'عمليات بحث شائعة للبدء',
    searchAnglesDescription: (platformName) =>
      `هذه بعض عمليات البحث الاكثر شيوعا حول ${platformName}. ابدأ بالعبارة التي تناسب ما تريد تصفحه.`,
    brandsTitle: (platformName) => `علامات شائعة لمستخدمي ${platformName}`,
    brandsDescription:
      'ابدأ بالعلامات المعروفة اذا كنت تعرف بالفعل الاسلوب او الاسماء التي تريد استكشافها.',
    categoriesTitle: 'فئات شائعة للتصفح',
    categoriesDescription:
      'انتقل مباشرة الى الفئات التي يفتحها الزوار غالبا بعد البحث عن هذه المنصة.',
    categoryCardDescription: 'تصفح هذه الفئة والمنتجات المرتبطة بها.',
    productsTitle: (platformName) => `اختيارات شائعة لمستخدمي ${platformName}`,
    productsDescription:
      'هذه الاختيارات تساعدك على البدء مباشرة في اكتشاف المنتجات بدل العودة الى بحث فارغ.',
    viewAllProducts: 'عرض كل المنتجات',
    compareTitle: 'استكشف المزيد من ادلة المنصات',
    compareDescription:
      'استعرض المزيد من ادلة المنصات اذا كنت تريد مقارنة المسارات والروابط وطرق التصفح بسهولة اكبر.',
    compareCardDescription: (platformQuery) => `${platformQuery} spreadsheet و yupoo و links`,
    faqTitle: (platformName) => `الاسئلة الشائعة حول ${platformName} spreadsheet`,
    seoDescription: (siteName, platformName) =>
      `تصفح مختارات ${platformName} spreadsheet على ${siteName}. اكتشف منتجات من Weidian و Taobao و 1688 مع صور QC وتفاصيل SKU وروابط مرتبة بوضوح.`,
    faqItems: (siteName, platformName, platformQuery) => [
      {
        question: `ما هي صفحة ${platformName} spreadsheet؟`,
        answer:
          `عمليات البحث عن ${platformName} spreadsheet تشير عادة الى منتجات منسقة وروابط منظمة وابحاث QC حول منتجات Weidian و Taobao و 1688. يقوم ${siteName} بتحويل ذلك الى صفحة اسهل في التصفح.`,
      },
      {
        question: `هل يمكنني استخدام ${platformName} مع روابط Weidian او Taobao؟`,
        answer:
          `نعم. يساعدك ${siteName} اولا على اكتشاف منتجات Weidian و Taobao و 1688 ثم الانتقال الى منصة الوكيل المفضلة لديك عندما تكون جاهزا للشراء.`,
      },
      {
        question: `هل يبيع ${siteName} المنتجات مباشرة؟`,
        answer:
          `${siteName} موقع مستقل لاكتشاف المنتجات وليس منصة ${platformName} الرسمية. تستخدمه للبحث ومقارنة العلامات التجارية والفئات ثم الانتقال الى اتمام الشراء على منصة وكيل.`,
      },
      {
        question: `ما هي عمليات البحث التي يجب ان استخدمها مع ${platformName}؟`,
        answer:
          `اكثر المتغيرات شيوعا هي ${platformQuery} spreadsheet و ${platformQuery} yupoo و ${platformQuery} links و ${platformQuery} taobao. هذه الصفحة تجمع تلك المسارات في مكان واحد.`,
      },
    ],
  },
};

const PLATFORM_LANDING_NARRATIVE_KEYS = {
  mulebuy: 'fast_branded',
  orientdig: 'research_heavy',
  joyagoo: 'visual_mix',
  loongbuy: 'direct_links',
  lovegobuy: 'stable_workflow',
  basetao: 'stable_workflow',
  parcelup: 'practical_route',
  eastmallbuy: 'visual_mix',
  hubbuycn: 'direct_links',
  kameymall: 'visual_mix',
  ootdbuy: 'fast_branded',
  ezbuycn: 'practical_route',
  yoybuy: 'stable_workflow',
  dupbuy: 'practical_route',
  hoobuy: 'fast_branded',
  lovbuy: 'practical_route',
  bbdbuy: 'fast_branded',
  hipobuy: 'practical_route',
  itaobuy: 'direct_links',
  mycnbox: 'stable_workflow',
  pantherbuy: 'fast_branded',
  hacoo: 'visual_mix',
  tigbuy: 'fast_branded',
  fishgoo: 'visual_mix',
  cnshopper: 'direct_links',
  niuniubox: 'stable_workflow',
  npbuy: 'practical_route',
  gtbuy: 'fast_branded',
  vigorbuy: 'practical_route',
  rizzitgo: 'visual_mix',
} as const;

type PlatformLandingNarrativeKey =
  (typeof PLATFORM_LANDING_NARRATIVE_KEYS)[keyof typeof PLATFORM_LANDING_NARRATIVE_KEYS];

function getPlatformLandingNarrativeKey(config: PlatformLandingConfig): PlatformLandingNarrativeKey | null {
  return PLATFORM_LANDING_NARRATIVE_KEYS[
    config.key as keyof typeof PLATFORM_LANDING_NARRATIVE_KEYS
  ] || null;
}

export function getPlatformLandingNarrativeOverrides(
  config: PlatformLandingConfig,
  locale: string = defaultLocale,
): PlatformLandingNarrativeOverrides | null {
  const safeLocale = normalizeLocale(locale);
  const narrativeKey = getPlatformLandingNarrativeKey(config);

  if (!narrativeKey || !['fr', 'de', 'es', 'ar', 'it', 'pt'].includes(safeLocale)) {
    return null;
  }
  if (safeLocale === 'fr') {
    return {
      seoDescription: (siteName, platformName) =>
        `Explorez les selections ${platformName} spreadsheet sur ${siteName}. Parcourez plus facilement les categories, les produits et les liens utiles depuis une page en francais plus claire.`,
      heroDescription: (siteName, platformName) =>
        `Sur ${siteName}, la page ${platformName} en francais aide a parcourir les categories, les produits et les raccourcis utiles sans repartir de zero.`,
      searchAnglesDescription: (platformName) =>
        `Autour de ${platformName}, les recherches combinent souvent spreadsheet, yupoo, links et categories populaires. Cette page les rassemble dans un parcours plus simple.`,
      compareDescription: (platformName) =>
        `Si besoin, vous pouvez aussi comparer ${platformName} avec d'autres guides de plateforme depuis les liens proposes plus bas.`,
    };
  }

  if (safeLocale === 'de') {
    return {
      seoDescription: (siteName, platformName) =>
        `Entdecke ${platformName} spreadsheet-Auswahl auf ${siteName}. Durchsuche Kategorien, Produkte und nutzliche Links uber eine klarere deutsche Seite.`,
      heroDescription: (siteName, platformName) =>
        `Die deutsche ${platformName}-Seite auf ${siteName} hilft dir, schneller in Kategorien, Produkte und passende Browse-Wege einzusteigen.`,
      searchAnglesDescription: (platformName) =>
        `Rund um ${platformName} suchen viele Nutzer nach spreadsheet, yupoo, links und beliebten Kategorien. Diese Seite bundelt diese Einstiege ubersichtlicher.`,
      compareDescription: (platformName) =>
        `Wenn es sinnvoll ist, kannst du ${platformName} unten auch mit anderen Plattform-Guides vergleichen.`,
    };
  }

  if (safeLocale === 'it') {
    return {
      seoDescription: (siteName, platformName) =>
        `Esplora le selezioni ${platformName} spreadsheet su ${siteName}. Sfoglia categorie, prodotti e link utili da una pagina italiana piu chiara.`,
      heroDescription: (siteName, platformName) =>
        `Su ${siteName}, la pagina ${platformName} in italiano aiuta a passare piu velocemente da una ricerca ampia a categorie, prodotti e scorciatoie utili.`,
      searchAnglesDescription: (platformName) =>
        `Attorno a ${platformName} compaiono spesso ricerche con spreadsheet, yupoo, links e categorie popolari. Questa pagina le riunisce in un percorso piu semplice.`,
      compareDescription: (platformName) =>
        `Se vuoi, puoi anche confrontare ${platformName} con altre guide piattaforma dai link qui sotto.`,
    };
  }

  if (safeLocale === 'pt') {
    return {
      seoDescription: (siteName, platformName) =>
        `Explore as selecoes ${platformName} spreadsheet no ${siteName}. Veja categorias, produtos e links uteis numa pagina em portugues mais clara.`,
      heroDescription: (siteName, platformName) =>
        `No ${siteName}, a pagina ${platformName} em portugues ajuda a sair de uma busca ampla e entrar mais rapido em categorias, produtos e atalhos uteis.`,
      searchAnglesDescription: (platformName) =>
        `Em torno de ${platformName}, muitas pesquisas combinam spreadsheet, yupoo, links e categorias populares. Esta pagina junta esses atalhos num caminho mais simples.`,
      compareDescription: (platformName) =>
        `Se fizer sentido, voce tambem pode comparar ${platformName} com outros guias de plataforma nos links abaixo.`,
    };
  }

  if (safeLocale === 'ar') {
    return {
      seoDescription: (siteName, platformName) =>
        `استكشف مختارات ${platformName} spreadsheet على ${siteName}. تصفح الفئات والمنتجات والروابط المفيدة من خلال صفحة عربية اوضح.`,
      heroDescription: (siteName, platformName) =>
        `على ${siteName} تساعد صفحة ${platformName} العربية على الانتقال بشكل اسرع من البحث العام الى الفئات والمنتجات والاختصارات المفيدة.`,
      searchAnglesDescription: (platformName) =>
        `حول ${platformName} تظهر عادة عمليات بحث تجمع بين spreadsheet و yupoo و links والفئات الشائعة. هذه الصفحة تجمعها في مسار اسهل للتصفح.`,
      compareDescription: (platformName) =>
        `واذا احتجت، يمكنك ايضا مقارنة ${platformName} مع ادلة منصات اخرى من الروابط الموجودة بالاسفل.`,
    };
  }

  return {
    seoDescription: (siteName, platformName) =>
      `Explora las selecciones ${platformName} spreadsheet en ${siteName}. Recorre categorias, productos y links utiles desde una pagina en espanol mas clara.`,
    heroDescription: (siteName, platformName) =>
      `En ${siteName}, la pagina ${platformName} en espanol ayuda a pasar mas rapido de una busqueda amplia a categorias, productos y atajos utiles.`,
    searchAnglesDescription: (platformName) =>
      `Alrededor de ${platformName} suelen aparecer busquedas con spreadsheet, yupoo, links y categorias populares. Esta pagina las reune en un recorrido mas sencillo.`,
    compareDescription: (platformName) =>
      `Si te resulta util, tambien puedes comparar ${platformName} con otras guias de plataforma desde los enlaces de abajo.`,
  };
}

type PlatformLandingIntentNarrativeLocale = 'fr' | 'de' | 'es' | 'ar' | 'it' | 'pt';

type PlatformLandingIntentLocalizedTerms = {
  title: string;
  searchSet: string;
  categoryFocus: string;
  productFocus: string;
};

type PlatformLandingIntentNarrativeFrame = {
  seoDescription: (
    siteName: string,
    platformName: string,
    terms: PlatformLandingIntentLocalizedTerms,
  ) => string;
  heroDescription: (
    platformName: string,
    siteName: string,
    terms: PlatformLandingIntentLocalizedTerms,
  ) => string;
  firstCardTitle: string;
  firstCardDescription: (
    platformName: string,
    terms: PlatformLandingIntentLocalizedTerms,
  ) => string;
  searchAnglesDescription: (
    platformName: string,
    terms: PlatformLandingIntentLocalizedTerms,
  ) => string;
  compareDescription: (
    platformName: string,
    terms: PlatformLandingIntentLocalizedTerms,
  ) => string;
};

const PLATFORM_INTENT_NARRATIVE_TERMS: Record<
  PlatformLandingIntentNarrativeLocale,
  Partial<Record<string, PlatformLandingIntentLocalizedTerms>>
> = {
  fr: {
    shoes: {
      title: 'chaussures',
      searchSet: 'chaussures, sneakers, spreadsheet et links',
      categoryFocus: 'des categories chaussures et sneakers',
      productFocus: 'des produits footwear visibles',
    },
    jackets: {
      title: 'vestes',
      searchSet: 'vestes, outerwear, spreadsheet et links',
      categoryFocus: 'des categories vestes et outerwear',
      productFocus: 'des produits outerwear visibles',
    },
    bags: {
      title: 'sacs',
      searchSet: 'sacs, backpacks, spreadsheet et links',
      categoryFocus: 'des categories sacs et accessoires',
      productFocus: 'des produits sacs plus visuels',
    },
    accessories: {
      title: 'accessoires',
      searchSet: 'accessoires, bijoux, spreadsheet et links',
      categoryFocus: 'des categories accessoires et bijoux',
      productFocus: 'des produits accessoires visibles',
    },
    hoodies: {
      title: 'hoodies',
      searchSet: 'hoodies, sweats, spreadsheet et links',
      categoryFocus: 'des categories hoodies et casualwear',
      productFocus: 'des produits casualwear visibles',
    },
    shirts: {
      title: 'chemises',
      searchSet: 'chemises, tees, spreadsheet et links',
      categoryFocus: 'des categories chemises et tops',
      productFocus: 'des produits tops visibles',
    },
    sneakers: {
      title: 'sneakers',
      searchSet: 'sneakers, chaussures, spreadsheet et links',
      categoryFocus: 'des categories sneakers et chaussures',
      productFocus: 'des produits sneakers visibles',
    },
    jewelry: {
      title: 'bijoux',
      searchSet: 'bijoux, accessoires, spreadsheet et links',
      categoryFocus: 'des categories bijoux et accessoires',
      productFocus: 'des produits bijoux visibles',
    },
    watches: {
      title: 'montres',
      searchSet: 'montres, accessoires, spreadsheet et links',
      categoryFocus: 'des categories montres et accessoires',
      productFocus: 'des produits accessoires visibles',
    },
    shorts: {
      title: 'shorts',
      searchSet: 'shorts, casualwear, spreadsheet et links',
      categoryFocus: 'des categories shorts et casualwear',
      productFocus: 'des produits shorts visibles',
    },
    pants: {
      title: 'pantalons',
      searchSet: 'pantalons, trousers, spreadsheet et links',
      categoryFocus: 'des categories pantalons et casualwear',
      productFocus: 'des produits pantalons visibles',
    },
    sweaters: {
      title: 'pulls',
      searchSet: 'pulls, knitwear, spreadsheet et links',
      categoryFocus: 'des categories pulls et knitwear',
      productFocus: 'des produits knitwear visibles',
    },
  },
  de: {
    shoes: {
      title: 'schuhe',
      searchSet: 'schuhe, sneakers, spreadsheet und links',
      categoryFocus: 'engere schuh- und sneaker-kategorien',
      productFocus: 'sichtbare footwear-produkte',
    },
    jackets: {
      title: 'jacken',
      searchSet: 'jacken, outerwear, spreadsheet und links',
      categoryFocus: 'jacken- und outerwear-kategorien',
      productFocus: 'sichtbare outerwear-produkte',
    },
    bags: {
      title: 'taschen',
      searchSet: 'taschen, backpacks, spreadsheet und links',
      categoryFocus: 'taschen- und accessoires-kategorien',
      productFocus: 'sichtbare taschen-produkte',
    },
    accessories: {
      title: 'accessoires',
      searchSet: 'accessoires, schmuck, spreadsheet und links',
      categoryFocus: 'accessoires- und schmuck-kategorien',
      productFocus: 'sichtbare accessoires-produkte',
    },
    hoodies: {
      title: 'hoodies',
      searchSet: 'hoodies, sweats, spreadsheet und links',
      categoryFocus: 'hoodie- und casualwear-kategorien',
      productFocus: 'sichtbare casualwear-produkte',
    },
    shirts: {
      title: 'shirts',
      searchSet: 'shirts, tees, spreadsheet und links',
      categoryFocus: 'shirt- und top-kategorien',
      productFocus: 'sichtbare top-produkte',
    },
    sneakers: {
      title: 'sneaker',
      searchSet: 'sneaker, schuhe, spreadsheet und links',
      categoryFocus: 'sneaker- und schuh-kategorien',
      productFocus: 'sichtbare sneaker-produkte',
    },
    jewelry: {
      title: 'schmuck',
      searchSet: 'schmuck, accessoires, spreadsheet und links',
      categoryFocus: 'schmuck- und accessoires-kategorien',
      productFocus: 'sichtbare schmuck-produkte',
    },
    watches: {
      title: 'uhren',
      searchSet: 'uhren, accessoires, spreadsheet und links',
      categoryFocus: 'uhren- und accessoires-kategorien',
      productFocus: 'sichtbare accessoires-produkte',
    },
    shorts: {
      title: 'shorts',
      searchSet: 'shorts, casualwear, spreadsheet und links',
      categoryFocus: 'shorts- und casualwear-kategorien',
      productFocus: 'sichtbare shorts-produkte',
    },
    pants: {
      title: 'hosen',
      searchSet: 'hosen, trousers, spreadsheet und links',
      categoryFocus: 'hosen- und casualwear-kategorien',
      productFocus: 'sichtbare hosen-produkte',
    },
    sweaters: {
      title: 'pullover',
      searchSet: 'pullover, knitwear, spreadsheet und links',
      categoryFocus: 'pullover- und knitwear-kategorien',
      productFocus: 'sichtbare knitwear-produkte',
    },
  },
  es: {
    shoes: {
      title: 'calzado',
      searchSet: 'calzado, sneakers, spreadsheet y links',
      categoryFocus: 'categorias de calzado y sneakers',
      productFocus: 'productos de footwear visibles',
    },
    jackets: {
      title: 'chaquetas',
      searchSet: 'chaquetas, outerwear, spreadsheet y links',
      categoryFocus: 'categorias de chaquetas y outerwear',
      productFocus: 'productos outerwear visibles',
    },
    bags: {
      title: 'bolsos',
      searchSet: 'bolsos, backpacks, spreadsheet y links',
      categoryFocus: 'categorias de bolsos y accesorios',
      productFocus: 'productos de bolsos mas visuales',
    },
    accessories: {
      title: 'accesorios',
      searchSet: 'accesorios, joyeria, spreadsheet y links',
      categoryFocus: 'categorias de accesorios y joyeria',
      productFocus: 'productos de accesorios visibles',
    },
    hoodies: {
      title: 'hoodies',
      searchSet: 'hoodies, sudaderas, spreadsheet y links',
      categoryFocus: 'categorias de hoodies y casualwear',
      productFocus: 'productos casualwear visibles',
    },
    shirts: {
      title: 'camisas',
      searchSet: 'camisas, tees, spreadsheet y links',
      categoryFocus: 'categorias de camisas y tops',
      productFocus: 'productos de tops visibles',
    },
    sneakers: {
      title: 'sneakers',
      searchSet: 'sneakers, calzado, spreadsheet y links',
      categoryFocus: 'categorias de sneakers y calzado',
      productFocus: 'productos de sneakers visibles',
    },
    jewelry: {
      title: 'joyeria',
      searchSet: 'joyeria, accesorios, spreadsheet y links',
      categoryFocus: 'categorias de joyeria y accesorios',
      productFocus: 'productos de joyeria visibles',
    },
    watches: {
      title: 'relojes',
      searchSet: 'relojes, accesorios, spreadsheet y links',
      categoryFocus: 'categorias de relojes y accesorios',
      productFocus: 'productos de accesorios visibles',
    },
    shorts: {
      title: 'shorts',
      searchSet: 'shorts, casualwear, spreadsheet y links',
      categoryFocus: 'categorias de shorts y casualwear',
      productFocus: 'productos de shorts visibles',
    },
    pants: {
      title: 'pantalones',
      searchSet: 'pantalones, trousers, spreadsheet y links',
      categoryFocus: 'categorias de pantalones y casualwear',
      productFocus: 'productos de pantalones visibles',
    },
    sweaters: {
      title: 'jerseis',
      searchSet: 'jerseis, knitwear, spreadsheet y links',
      categoryFocus: 'categorias de jerseis y knitwear',
      productFocus: 'productos de knitwear visibles',
    },
  },
  ar: {
    shoes: {
      title: 'الاحذية',
      searchSet: 'الاحذية و sneakers و spreadsheet و links',
      categoryFocus: 'فئات الاحذية و sneakers',
      productFocus: 'منتجات احذية واضحة',
    },
    jackets: {
      title: 'الجاكيتات',
      searchSet: 'الجاكيتات و outerwear و spreadsheet و links',
      categoryFocus: 'فئات الجاكيتات و outerwear',
      productFocus: 'منتجات outerwear واضحة',
    },
    bags: {
      title: 'الحقائب',
      searchSet: 'الحقائب و backpacks و spreadsheet و links',
      categoryFocus: 'فئات الحقائب و accessories',
      productFocus: 'منتجات حقائب اكثر وضوحا',
    },
    accessories: {
      title: 'الاكسسوارات',
      searchSet: 'الاكسسوارات و jewelry و spreadsheet و links',
      categoryFocus: 'فئات الاكسسوارات و jewelry',
      productFocus: 'منتجات اكسسوارات واضحة',
    },
    hoodies: {
      title: 'الهوديز',
      searchSet: 'hoodies و sweats و spreadsheet و links',
      categoryFocus: 'فئات hoodies و casualwear',
      productFocus: 'منتجات casualwear واضحة',
    },
    shirts: {
      title: 'القمصان',
      searchSet: 'القمصان و tees و spreadsheet و links',
      categoryFocus: 'فئات القمصان و tops',
      productFocus: 'منتجات tops واضحة',
    },
    sneakers: {
      title: 'السنيكرز',
      searchSet: 'sneakers و الاحذية و spreadsheet و links',
      categoryFocus: 'فئات sneakers و الاحذية',
      productFocus: 'منتجات sneakers واضحة',
    },
    jewelry: {
      title: 'المجوهرات',
      searchSet: 'المجوهرات و accessories و spreadsheet و links',
      categoryFocus: 'فئات المجوهرات و accessories',
      productFocus: 'منتجات مجوهرات واضحة',
    },
    watches: {
      title: 'الساعات',
      searchSet: 'الساعات و accessories و spreadsheet و links',
      categoryFocus: 'فئات الساعات و accessories',
      productFocus: 'منتجات accessories واضحة',
    },
    shorts: {
      title: 'الشورتات',
      searchSet: 'الشورتات و casualwear و spreadsheet و links',
      categoryFocus: 'فئات الشورتات و casualwear',
      productFocus: 'منتجات شورتات واضحة',
    },
    pants: {
      title: 'البناطيل',
      searchSet: 'البناطيل و trousers و spreadsheet و links',
      categoryFocus: 'فئات البناطيل و casualwear',
      productFocus: 'منتجات بناطيل واضحة',
    },
    sweaters: {
      title: 'الكنزات',
      searchSet: 'الكنزات و knitwear و spreadsheet و links',
      categoryFocus: 'فئات الكنزات و knitwear',
      productFocus: 'منتجات knitwear واضحة',
    },
  },
  it: {
    shoes: { title: 'scarpe', searchSet: 'scarpe, sneakers, spreadsheet e links', categoryFocus: 'categorie scarpe e sneakers', productFocus: 'prodotti footwear visibili' },
    jackets: { title: 'giacche', searchSet: 'giacche, outerwear, spreadsheet e links', categoryFocus: 'categorie giacche e outerwear', productFocus: 'prodotti outerwear visibili' },
    bags: { title: 'borse', searchSet: 'borse, backpacks, spreadsheet e links', categoryFocus: 'categorie borse e accessori', productFocus: 'prodotti borse piu visibili' },
    accessories: { title: 'accessori', searchSet: 'accessori, jewelry, spreadsheet e links', categoryFocus: 'categorie accessori e jewelry', productFocus: 'prodotti accessori visibili' },
    hoodies: { title: 'hoodies', searchSet: 'hoodies, sweats, spreadsheet e links', categoryFocus: 'categorie hoodies e casualwear', productFocus: 'prodotti casualwear visibili' },
    shirts: { title: 'camicie', searchSet: 'camicie, tees, spreadsheet e links', categoryFocus: 'categorie camicie e tops', productFocus: 'prodotti tops visibili' },
    sneakers: { title: 'sneakers', searchSet: 'sneakers, scarpe, spreadsheet e links', categoryFocus: 'categorie sneakers e scarpe', productFocus: 'prodotti sneakers visibili' },
    jewelry: { title: 'gioielli', searchSet: 'gioielli, accessori, spreadsheet e links', categoryFocus: 'categorie gioielli e accessori', productFocus: 'prodotti gioielli visibili' },
    watches: { title: 'orologi', searchSet: 'orologi, accessori, spreadsheet e links', categoryFocus: 'categorie orologi e accessori', productFocus: 'prodotti accessori visibili' },
    shorts: { title: 'shorts', searchSet: 'shorts, casualwear, spreadsheet e links', categoryFocus: 'categorie shorts e casualwear', productFocus: 'prodotti shorts visibili' },
    pants: { title: 'pantaloni', searchSet: 'pantaloni, trousers, spreadsheet e links', categoryFocus: 'categorie pantaloni e casualwear', productFocus: 'prodotti pantaloni visibili' },
    sweaters: { title: 'maglie', searchSet: 'maglie, knitwear, spreadsheet e links', categoryFocus: 'categorie maglie e knitwear', productFocus: 'prodotti knitwear visibili' },
  },
  pt: {
    shoes: { title: 'sapatos', searchSet: 'sapatos, sneakers, spreadsheet e links', categoryFocus: 'categorias de sapatos e sneakers', productFocus: 'produtos footwear visiveis' },
    jackets: { title: 'casacos', searchSet: 'casacos, outerwear, spreadsheet e links', categoryFocus: 'categorias de casacos e outerwear', productFocus: 'produtos outerwear visiveis' },
    bags: { title: 'bolsas', searchSet: 'bolsas, backpacks, spreadsheet e links', categoryFocus: 'categorias de bolsas e acessorios', productFocus: 'produtos de bolsas mais visiveis' },
    accessories: { title: 'acessorios', searchSet: 'acessorios, jewelry, spreadsheet e links', categoryFocus: 'categorias de acessorios e jewelry', productFocus: 'produtos de acessorios visiveis' },
    hoodies: { title: 'hoodies', searchSet: 'hoodies, sweats, spreadsheet e links', categoryFocus: 'categorias de hoodies e casualwear', productFocus: 'produtos casualwear visiveis' },
    shirts: { title: 'camisas', searchSet: 'camisas, tees, spreadsheet e links', categoryFocus: 'categorias de camisas e tops', productFocus: 'produtos de tops visiveis' },
    sneakers: { title: 'sneakers', searchSet: 'sneakers, sapatos, spreadsheet e links', categoryFocus: 'categorias de sneakers e sapatos', productFocus: 'produtos de sneakers visiveis' },
    jewelry: { title: 'joias', searchSet: 'joias, acessorios, spreadsheet e links', categoryFocus: 'categorias de joias e acessorios', productFocus: 'produtos de joias visiveis' },
    watches: { title: 'relogios', searchSet: 'relogios, acessorios, spreadsheet e links', categoryFocus: 'categorias de relogios e acessorios', productFocus: 'produtos de acessorios visiveis' },
    shorts: { title: 'shorts', searchSet: 'shorts, casualwear, spreadsheet e links', categoryFocus: 'categorias de shorts e casualwear', productFocus: 'produtos de shorts visiveis' },
    pants: { title: 'calcas', searchSet: 'calcas, trousers, spreadsheet e links', categoryFocus: 'categorias de calcas e casualwear', productFocus: 'produtos de calcas visiveis' },
    sweaters: { title: 'malhas', searchSet: 'malhas, knitwear, spreadsheet e links', categoryFocus: 'categorias de malhas e knitwear', productFocus: 'produtos de knitwear visiveis' },
  },
};

const PLATFORM_INTENT_NARRATIVE_FRAMES: Record<
  PlatformLandingIntentNarrativeLocale,
  Record<PlatformLandingNarrativeKey, PlatformLandingIntentNarrativeFrame>
> = {
  fr: {
    fast_branded: {
      seoDescription: (siteName, platformName, terms) =>
        `Explorez les selections ${platformName} ${terms.title} spreadsheet sur ${siteName}. Cette page FR sert surtout des visites qui arrivent deja avec une recherche de marque et veulent descendre vite vers ${terms.categoryFocus}.`,
      heroDescription: (platformName, siteName, terms) =>
        `Sur ${siteName}, la page ${platformName} autour des ${terms.title} est ecrite pour des sessions FR deja marquees qui veulent tomber plus vite sur ${terms.categoryFocus} et des produits plus visibles.`,
      firstCardTitle: 'Capter une demande de marque plus vite',
      firstCardDescription: (platformName, terms) =>
        `${platformName} attire souvent des visites deja marquees. Ici, on les pousse plus vite vers ${terms.categoryFocus} sans refaire une page plateforme trop large.`,
      searchAnglesDescription: (platformName, terms) =>
        `Autour de ${platformName}, les recherches FR melangent souvent ${terms.searchSet}. Cette page rassemble ce trafic sur une page plus courte et plus nette.`,
      compareDescription: (platformName, terms) =>
        `Comparer ${platformName} avec d'autres plateformes reste utile, surtout pour verifier si une autre page mene encore plus vite vers ${terms.categoryFocus}.`,
    },
    research_heavy: {
      seoDescription: (siteName, platformName, terms) =>
        `Explorez les selections ${platformName} ${terms.title} spreadsheet sur ${siteName}. Cette page FR est formulee pour des utilisateurs qui veulent comparer pages, categories et signaux produit avant de sortir vers une plateforme.`,
      heroDescription: (platformName, siteName, terms) =>
        `La page ${platformName} sur ${siteName} organise les recherches FR autour des ${terms.title} pour des sessions plus analytiques qui veulent comparer categories, produits et sorties plateforme avant de cliquer.`,
      firstCardTitle: 'Garder une lecture plus analytique',
      firstCardDescription: (platformName, terms) =>
        `Quand ${platformName} attire une session plus comparative, une page ${terms.title} dediee aide a ordonner categories, produits et liens utiles sans renvoyer l'utilisateur dans Google.`,
      searchAnglesDescription: (platformName, terms) =>
        `Les recherches FR autour de ${platformName} sur les ${terms.title} prennent souvent la forme de ${terms.searchSet}. Cette page les reordonne dans une structure plus lisible.`,
      compareDescription: (platformName, terms) =>
        `Pour ${platformName}, les comparaisons servent surtout a garder l'evaluation des pages ${terms.title} a l'interieur du site au lieu de relancer une nouvelle recherche.`,
    },
    visual_mix: {
      seoDescription: (siteName, platformName, terms) =>
        `Explorez les selections ${platformName} ${terms.title} spreadsheet sur ${siteName}. Cette page FR est orientee vers des sessions plus visuelles qui veulent parcourir plusieurs categories sans perdre le fil vers les produits.`,
      heroDescription: (platformName, siteName, terms) =>
        `La page ${platformName} sur ${siteName} fonctionne bien pour des recherches FR plus visuelles autour des ${terms.title}, avec une navigation qui garde categories, produits et liens sur la meme page.`,
      firstCardTitle: 'Prolonger une navigation plus visuelle',
      firstCardDescription: (platformName, terms) =>
        `${platformName} peut porter une navigation large et visuelle. Cette page ${terms.title} garde mieux ce comportement que si tout restait sur une page plateforme generaliste.`,
      searchAnglesDescription: (platformName, terms) =>
        `Autour de ${platformName}, les recherches FR sur les ${terms.title} arrivent souvent par paquets mixtes: ${terms.searchSet}. Cette page suit ce rythme plus naturellement.`,
      compareDescription: (platformName, terms) =>
        `La comparaison avec d'autres plateformes reste utile pour ${platformName}, mais surtout pour prolonger une session ${terms.title} plus visuelle qu'un choix deja fige.`,
    },
    direct_links: {
      seoDescription: (siteName, platformName, terms) =>
        `Explorez les selections ${platformName} ${terms.title} spreadsheet sur ${siteName}. Cette page FR raccourcit le chemin entre une recherche de plateforme, des liens utiles et ${terms.categoryFocus}.`,
      heroDescription: (platformName, siteName, terms) =>
        `Sur ${siteName}, la page ${platformName} pour les ${terms.title} est formulee pour les visiteurs FR qui veulent passer vite d'une requete plateforme a ${terms.categoryFocus}.`,
      firstCardTitle: "Raccourcir l'acces depuis la requete plateforme",
      firstCardDescription: (platformName, terms) =>
        `Quand la session commence deja par ${platformName}, cette page reduit les detours et rapproche plus vite les visiteurs de ${terms.categoryFocus}.`,
      searchAnglesDescription: (platformName, terms) =>
        `Pour ${platformName}, les recherches FR autour des ${terms.title} reviennent souvent a ${terms.searchSet}. Cette page les transforme en chemin plus direct.`,
      compareDescription: (platformName, terms) =>
        `Comparer ${platformName} avec d'autres plateformes sert surtout a verifier quelle page mene le plus vite vers ${terms.categoryFocus}.`,
    },
    stable_workflow: {
      seoDescription: (siteName, platformName, terms) =>
        `Explorez les selections ${platformName} ${terms.title} spreadsheet sur ${siteName}. Cette page FR parle a des utilisateurs qui preferent une page plus familiere, plus stable et plus facile a suivre.`,
      heroDescription: (platformName, siteName, terms) =>
        `La page ${platformName} sur ${siteName} guide les recherches FR autour des ${terms.title} avec une entree plus rassurante: moins de dispersion, plus de categories lisibles et un chemin plus calme.`,
      firstCardTitle: 'Rendre la page plus rassurante',
      firstCardDescription: (platformName, terms) =>
        `Pour ${platformName}, une page ${terms.title} plus stable aide les visiteurs qui veulent moins de dispersion et un passage plus simple vers ${terms.productFocus}.`,
      searchAnglesDescription: (platformName, terms) =>
        `Autour de ${platformName}, les recherches FR sur les ${terms.title} gardent souvent une logique plus classique: ${terms.searchSet}. Cette page respecte ce rythme.`,
      compareDescription: (platformName, terms) =>
        `Comparer ${platformName} avec d'autres plateformes reste utile, mais surtout pour confirmer qu'une page ${terms.title} parait plus stable ou plus familiere.`,
    },
    practical_route: {
      seoDescription: (siteName, platformName, terms) =>
        `Explorez les selections ${platformName} ${terms.title} spreadsheet sur ${siteName}. Cette page FR vise un usage plus pratique: moins de detours, ${terms.categoryFocus} plus vite et une descente plus claire vers les produits.`,
      heroDescription: (platformName, siteName, terms) =>
        `La page ${platformName} sur ${siteName} adopte un ton plus pragmatique pour les recherches FR autour des ${terms.title}: couper les etapes inutiles et aller plus vite vers ${terms.categoryFocus}.`,
      firstCardTitle: 'Couper les detours plus tot',
      firstCardDescription: (platformName, terms) =>
        `${platformName} gagne ici une page ${terms.title} plus pratique, faite pour pousser rapidement les visiteurs vers ${terms.categoryFocus} sans les laisser stagner sur une page trop large.`,
      searchAnglesDescription: (platformName, terms) =>
        `Les recherches FR sur ${platformName} autour des ${terms.title} sont souvent assez directes: ${terms.searchSet}. Cette page suit exactement ce comportement.`,
      compareDescription: (platformName, terms) =>
        `Pour ${platformName}, la comparaison avec d'autres plateformes sert surtout a verifier quelle page ${terms.title} reste la plus simple avant de passer a ${terms.productFocus}.`,
    },
  },
  de: {
    fast_branded: {
      seoDescription: (siteName, platformName, terms) =>
        `Entdecke ${platformName} ${terms.title} spreadsheet-Auswahl auf ${siteName}. Diese deutsche Seite richtet sich an Nutzer mit klarer Markensuche, die schnell in ${terms.categoryFocus} wechseln wollen.`,
      heroDescription: (platformName, siteName, terms) =>
        `Auf ${siteName} ist die deutsche ${platformName}-Seite fur ${terms.title} fur Sitzungen gebaut, die schon mit klarer Markenanfrage starten und schnell in ${terms.categoryFocus} gehen sollen.`,
      firstCardTitle: 'Markennachfrage schneller auffangen',
      firstCardDescription: (platformName, terms) =>
        `${platformName} bringt oft bereits markierte Sitzungen. Diese Seite schiebt sie schneller in ${terms.categoryFocus}, statt alles wieder uber eine breite Plattformseite laufen zu lassen.`,
      searchAnglesDescription: (platformName, terms) =>
        `Rund um ${platformName} tauchen auf Deutsch fur ${terms.title} oft Kombinationen aus ${terms.searchSet} auf. Diese Seite bundelt das Suchverhalten deutlich sauberer.`,
      compareDescription: (platformName, terms) =>
        `Der Vergleich mit anderen Plattformen bleibt bei ${platformName} hilfreich, vor allem wenn Nutzer prufen wollen, welcher Weg noch direkter zu ${terms.categoryFocus} fuhrt.`,
    },
    research_heavy: {
      seoDescription: (siteName, platformName, terms) =>
        `Entdecke ${platformName} ${terms.title} spreadsheet-Auswahl auf ${siteName}. Diese deutsche Seite ist fur Nutzer formuliert, die erst Kategorien, Produktsignale und Wege vergleichen wollen.`,
      heroDescription: (platformName, siteName, terms) =>
        `Die deutsche ${platformName}-Seite auf ${siteName} ordnet Suchen rund um ${terms.title} fur analytische Sitzungen, in denen Kategorien und Produkte bewusster verglichen werden.`,
      firstCardTitle: 'Analytische Sitzungen sauber halten',
      firstCardDescription: (platformName, terms) =>
        `Wenn ${platformName} eher vergleichsorientierte Sitzungen anzieht, hilft eine dedizierte ${terms.title}-Seite dabei, Kategorien, Produkte und Linkpfade lesbarer zu sortieren.`,
      searchAnglesDescription: (platformName, terms) =>
        `Bei ${platformName} kommen deutsche Suchanfragen zu ${terms.title} oft vergleichsorientiert herein: ${terms.searchSet}. Diese Seite macht daraus eine lesbarere Struktur.`,
      compareDescription: (platformName, terms) =>
        `Bei ${platformName} dienen Plattform-Vergleiche vor allem dazu, die Bewertung verschiedener ${terms.title}-Seiten im System zu halten statt Nutzer wieder zur Suche zu schicken.`,
    },
    visual_mix: {
      seoDescription: (siteName, platformName, terms) =>
        `Entdecke ${platformName} ${terms.title} spreadsheet-Auswahl auf ${siteName}. Diese deutsche Seite passt besser zu visuelleren Sessions, die mehrere Kategorien durchstobern wollen.`,
      heroDescription: (platformName, siteName, terms) =>
        `Die deutsche ${platformName}-Seite auf ${siteName} funktioniert gut fur visuellere Browse-Sitzungen rund um ${terms.title}, in denen Nutzer Kategorien, Produkte und Links gemeinsam erkunden.`,
      firstCardTitle: 'Visuelle Sessions langer zusammenhalten',
      firstCardDescription: (platformName, terms) =>
        `${platformName} kann breitere, visuelle Navigation tragen. Eine eigene ${terms.title}-Seite halt dieses Verhalten besser zusammen als eine rein allgemeine Plattform-Seite.`,
      searchAnglesDescription: (platformName, terms) =>
        `Rund um ${platformName} erscheinen auf Deutsch zu ${terms.title} oft gemischte Muster aus ${terms.searchSet}. Diese Seite halt diesen Flow bewusster zusammen.`,
      compareDescription: (platformName, terms) =>
        `Der Vergleich mit anderen Plattformen bleibt bei ${platformName} sinnvoll, vor allem wenn Nutzer eine visuellere ${terms.title}-Session fortsetzen statt nur einen engen Zielpfad zu verfolgen.`,
    },
    direct_links: {
      seoDescription: (siteName, platformName, terms) =>
        `Entdecke ${platformName} ${terms.title} spreadsheet-Auswahl auf ${siteName}. Diese deutsche Seite verknupft Plattformsuche, nutzliche Links und ${terms.categoryFocus} fur einen direkteren Einstieg.`,
      heroDescription: (platformName, siteName, terms) =>
        `Auf ${siteName} ist die deutsche ${platformName}-Seite fur ${terms.title} fur Nutzer gedacht, die schon mit Plattformanfrage kommen und jetzt moglichst direkt in ${terms.categoryFocus} wollen.`,
      firstCardTitle: 'Direkter von der Plattformsuche wegkommen',
      firstCardDescription: (platformName, terms) =>
        `Wenn eine Sitzung schon mit ${platformName} startet, reduziert diese ${terms.title}-Seite Umwege und fuhrt schneller in ${terms.categoryFocus}.`,
      searchAnglesDescription: (platformName, terms) =>
        `Bei ${platformName} tauchen auf Deutsch rund um ${terms.title} oft direkte Suchmuster auf: ${terms.searchSet}. Diese Seite macht daraus einen kurzeren Browse-Weg.`,
      compareDescription: (platformName, terms) =>
        `Fur ${platformName} bleibt der Plattform-Vergleich wichtig, vor allem dann, wenn Nutzer prufen wollen, welcher Weg am direktesten zu ${terms.categoryFocus} fuhrt.`,
    },
    stable_workflow: {
      seoDescription: (siteName, platformName, terms) =>
        `Entdecke ${platformName} ${terms.title} spreadsheet-Auswahl auf ${siteName}. Diese deutsche Seite richtet sich an Nutzer, die einen ruhigeren, vertrauteren und besser lesbaren Weg bevorzugen.`,
      heroDescription: (platformName, siteName, terms) =>
        `Die deutsche ${platformName}-Seite auf ${siteName} fuhrt Suchen rund um ${terms.title} bewusster und ruhiger: weniger Streuung, klarere Kategorien und ein vertrauterer Ubergang zu Produkten.`,
      firstCardTitle: 'Die Seite vertrauter wirken lassen',
      firstCardDescription: (platformName, terms) =>
        `Bei ${platformName} hilft eine stabilere ${terms.title}-Seite Nutzern, die weniger Streuung wollen und schneller in ${terms.productFocus} kommen mochten.`,
      searchAnglesDescription: (platformName, terms) =>
        `Rund um ${platformName} folgen deutsche Suchanfragen zu ${terms.title} oft einem klassischeren Muster aus ${terms.searchSet}. Diese Seite greift genau dieses Verhalten auf.`,
      compareDescription: (platformName, terms) =>
        `Der Vergleich mit anderen Plattformen bleibt bei ${platformName} eher eine Bestatigung dafur, dass eine ${terms.title}-Seite vertrauter oder stabiler wirkt.`,
    },
    practical_route: {
      seoDescription: (siteName, platformName, terms) =>
        `Entdecke ${platformName} ${terms.title} spreadsheet-Auswahl auf ${siteName}. Diese deutsche Seite ist pragmatisch gebaut: weniger Umwege, schneller zu ${terms.categoryFocus} und klarer in sichtbare Produkte.`,
      heroDescription: (platformName, siteName, terms) =>
        `Die deutsche ${platformName}-Seite auf ${siteName} ist bewusster praktisch formuliert: weniger Schleifen und schneller hinein in ${terms.categoryFocus}.`,
      firstCardTitle: 'Umwege fruher abschneiden',
      firstCardDescription: (platformName, terms) =>
        `${platformName} gewinnt hier eine pragmatischere ${terms.title}-Seite, die Nutzer schneller in ${terms.categoryFocus} schiebt statt auf einer zu breiten Seite festzuhalten.`,
      searchAnglesDescription: (platformName, terms) =>
        `Bei ${platformName} wirken deutsche Suchen zu ${terms.title} oft sehr direkt: ${terms.searchSet}. Diese Seite folgt genau diesem pragmatischen Muster.`,
      compareDescription: (platformName, terms) =>
        `Bei ${platformName} dient der Vergleich mit anderen Plattformen vor allem dazu, den einfachsten Weg zu ${terms.productFocus} zu bestatigen.`,
    },
  },
  es: {
    fast_branded: {
      seoDescription: (siteName, platformName, terms) =>
        `Explora las selecciones ${platformName} ${terms.title} spreadsheet en ${siteName}. Esta ruta en espanol esta pensada para sesiones con busqueda de marca que quieren bajar rapido hacia ${terms.categoryFocus}.`,
      heroDescription: (platformName, siteName, terms) =>
        `En ${siteName}, la pagina de ${platformName} para ${terms.title} funciona mejor cuando la sesion ya llega marcada por marca y conviene bajar rapido hacia ${terms.categoryFocus}.`,
      firstCardTitle: 'Capturar antes la demanda de marca',
      firstCardDescription: (platformName, terms) =>
        `${platformName} suele atraer sesiones ya marcadas. Esta ruta las empuja antes hacia ${terms.categoryFocus} en lugar de repetir una pagina general de plataforma.`,
      searchAnglesDescription: (platformName, terms) =>
        `Alrededor de ${platformName}, las busquedas en espanol para ${terms.title} suelen mezclar ${terms.searchSet}. Esta pagina junta ese trafico en un camino mas corto.`,
      compareDescription: (platformName, terms) =>
        `Comparar ${platformName} con otras plataformas sigue siendo util, sobre todo para ver si otra ruta lleva aun mas rapido hacia ${terms.categoryFocus}.`,
    },
    research_heavy: {
      seoDescription: (siteName, platformName, terms) =>
        `Explora las selecciones ${platformName} ${terms.title} spreadsheet en ${siteName}. Esta pagina en espanol esta escrita para usuarios que quieren comparar categorias, productos y rutas antes de salir hacia una plataforma.`,
      heroDescription: (platformName, siteName, terms) =>
        `La ruta de ${platformName} en ${siteName} ordena mejor las busquedas en espanol alrededor de ${terms.title} para sesiones mas comparativas y mas analiticas.`,
      firstCardTitle: 'Mantener una lectura mas comparativa',
      firstCardDescription: (platformName, terms) =>
        `Cuando ${platformName} atrae sesiones mas analiticas, una ruta dedicada de ${terms.title} ayuda a ordenar categorias, productos y enlaces sin mandar al usuario otra vez a Google.`,
      searchAnglesDescription: (platformName, terms) =>
        `En ${platformName}, las busquedas en espanol sobre ${terms.title} suelen llegar con forma mas comparativa: ${terms.searchSet}. Esta pagina organiza mejor ese patron.`,
      compareDescription: (platformName, terms) =>
        `En ${platformName}, la comparacion entre plataformas sirve sobre todo para mantener la evaluacion de rutas de ${terms.title} dentro del sitio.`,
    },
    visual_mix: {
      seoDescription: (siteName, platformName, terms) =>
        `Explora las selecciones ${platformName} ${terms.title} spreadsheet en ${siteName}. Esta pagina en espanol encaja mejor con sesiones mas visuales que quieren recorrer varias categorias sin perder continuidad.`,
      heroDescription: (platformName, siteName, terms) =>
        `La pagina de ${platformName} en ${siteName} va mejor con una navegacion mas visual alrededor de ${terms.title}, donde categorias, productos y links siguen en la misma sesion.`,
      firstCardTitle: 'Alargar una sesion mas visual',
      firstCardDescription: (platformName, terms) =>
        `${platformName} puede sostener una navegacion mas abierta y visual. Esta ruta de ${terms.title} la conserva mejor que una pagina de plataforma demasiado general.`,
      searchAnglesDescription: (platformName, terms) =>
        `En ${platformName} aparecen patrones mixtos en espanol sobre ${terms.title}: ${terms.searchSet}. Esta pagina conserva ese flujo con menos friccion.`,
      compareDescription: (platformName, terms) =>
        `Comparar ${platformName} con otras plataformas sirve aqui sobre todo para prolongar una sesion de ${terms.title} mas visual y amplia.`,
    },
    direct_links: {
      seoDescription: (siteName, platformName, terms) =>
        `Explora las selecciones ${platformName} ${terms.title} spreadsheet en ${siteName}. Esta pagina en espanol acorta el paso entre una busqueda de plataforma, enlaces utiles y ${terms.categoryFocus}.`,
      heroDescription: (platformName, siteName, terms) =>
        `La ruta de ${platformName} en ${siteName} para ${terms.title} esta pensada para usuarios que ya llegan con una consulta de plataforma y quieren bajar rapido hacia ${terms.categoryFocus}.`,
      firstCardTitle: 'Recortar la ruta desde la busqueda de plataforma',
      firstCardDescription: (platformName, terms) =>
        `Si la sesion ya empieza por ${platformName}, esta pagina de ${terms.title} reduce rodeos y acerca antes al usuario hacia ${terms.categoryFocus}.`,
      searchAnglesDescription: (platformName, terms) =>
        `En espanol, alrededor de ${platformName} para ${terms.title} aparecen muchas combinaciones directas de ${terms.searchSet}. Esta pagina las convierte en un camino mas corto.`,
      compareDescription: (platformName, terms) =>
        `En ${platformName}, comparar plataformas sirve sobre todo para ver que ruta lleva antes hacia ${terms.categoryFocus}.`,
    },
    stable_workflow: {
      seoDescription: (siteName, platformName, terms) =>
        `Explora las selecciones ${platformName} ${terms.title} spreadsheet en ${siteName}. Esta pagina en espanol esta pensada para usuarios que prefieren una ruta mas familiar, estable y facil de seguir.`,
      heroDescription: (platformName, siteName, terms) =>
        `La pagina de ${platformName} en ${siteName} ordena mejor las busquedas de ${terms.title} con una entrada mas tranquila: menos dispersion, categorias claras y un paso mas comodo hacia productos.`,
      firstCardTitle: 'Hacer la ruta mas familiar',
      firstCardDescription: (platformName, terms) =>
        `Para ${platformName}, una ruta mas estable de ${terms.title} ayuda a usuarios que quieren menos dispersion y una bajada mas simple hacia ${terms.productFocus}.`,
      searchAnglesDescription: (platformName, terms) =>
        `Las busquedas en espanol alrededor de ${platformName} sobre ${terms.title} suelen seguir un patron mas clasico: ${terms.searchSet}. Esta pagina respeta ese ritmo.`,
      compareDescription: (platformName, terms) =>
        `Comparar ${platformName} con otras plataformas funciona aqui mas como confirmacion de una ruta de ${terms.title} que ya se percibe como mas estable.`,
    },
    practical_route: {
      seoDescription: (siteName, platformName, terms) =>
        `Explora las selecciones ${platformName} ${terms.title} spreadsheet en ${siteName}. Esta pagina en espanol esta planteada desde un uso mas practico: menos rodeos y una bajada mas clara hacia ${terms.categoryFocus}.`,
      heroDescription: (platformName, siteName, terms) =>
        `La ruta de ${platformName} en ${siteName} adopta un tono mas practico para las busquedas de ${terms.title}: cortar pasos innecesarios y entrar antes en ${terms.categoryFocus}.`,
      firstCardTitle: 'Cortar rodeos mas pronto',
      firstCardDescription: (platformName, terms) =>
        `${platformName} gana aqui una ruta de ${terms.title} mas practica, hecha para empujar antes hacia ${terms.categoryFocus} sin dejar al usuario atrapado en una pagina demasiado amplia.`,
      searchAnglesDescription: (platformName, terms) =>
        `En espanol, las busquedas alrededor de ${platformName} sobre ${terms.title} suelen ser bastante directas: ${terms.searchSet}. Esta pagina sigue justo ese patron.`,
      compareDescription: (platformName, terms) =>
        `En ${platformName}, la comparacion con otras plataformas sirve sobre todo para comprobar que ruta resulta mas simple antes de pasar a ${terms.productFocus}.`,
    },
  },
  ar: {
    fast_branded: {
      seoDescription: (siteName, platformName, terms) =>
        `استكشف مختارات ${platformName} ${terms.title} spreadsheet على ${siteName}. هذا المسار العربي يخدم الجلسات التي تصل بنية علامة واضحة وتريد النزول بسرعة الى ${terms.categoryFocus}.`,
      heroDescription: (platformName, siteName, terms) =>
        `في ${siteName} تعمل صفحة ${platformName} الخاصة بـ ${terms.title} بشكل افضل عندما تصل الجلسة وهي تحمل نية منصة واضحة وتريد الانتقال بسرعة نحو ${terms.categoryFocus}.`,
      firstCardTitle: 'التقاط الطلب المرتبط بالعلامة بشكل اسرع',
      firstCardDescription: (platformName, terms) =>
        `${platformName} يجلب غالبا زيارات تحمل نية علامة واضحة. هذا المسار يدفعها بسرعة نحو ${terms.categoryFocus} بدل اعادتها الى صفحة منصة عامة.`,
      searchAnglesDescription: (platformName, terms) =>
        `حول ${platformName} تمزج عمليات البحث العربية الخاصة بـ ${terms.title} عادة ${terms.searchSet}. هذه الصفحة تجمع هذا الطلب في مسار اقصر.`,
      compareDescription: (platformName, terms) =>
        `مقارنة ${platformName} مع منصات اخرى تبقى مفيدة خاصة لمعرفة ما اذا كان هناك مسار اخر يوصل اسرع الى ${terms.categoryFocus}.`,
    },
    research_heavy: {
      seoDescription: (siteName, platformName, terms) =>
        `استكشف مختارات ${platformName} ${terms.title} spreadsheet على ${siteName}. هذه الصفحة العربية مكتوبة للمستخدم الذي يريد مقارنة الفئات والمنتجات والمسارات قبل الخروج الى منصة.`,
      heroDescription: (platformName, siteName, terms) =>
        `صفحة ${platformName} على ${siteName} ترتب عمليات البحث العربية حول ${terms.title} للجلسات الاكثر تحليلا والتي تحتاج مقارنة اوضح للفئات والمنتجات.`,
      firstCardTitle: 'الحفاظ على القراءة التحليلية',
      firstCardDescription: (platformName, terms) =>
        `عندما يجذب ${platformName} جلسات اكثر مقارنة، يساعد مسار ${terms.title} المخصص على ترتيب الفئات والمنتجات والروابط بدون اعادة المستخدم الى Google.`,
      searchAnglesDescription: (platformName, terms) =>
        `في ${platformName} تصل عمليات البحث العربية حول ${terms.title} بنمط اكثر مقارنيا: ${terms.searchSet}. هذه الصفحة تنظم هذا السلوك بشكل افضل.`,
      compareDescription: (platformName, terms) =>
        `في ${platformName} تخدم المقارنات بين المنصات اساسا ابقاء تقييم مسارات ${terms.title} داخل الموقع.`,
    },
    visual_mix: {
      seoDescription: (siteName, platformName, terms) =>
        `استكشف مختارات ${platformName} ${terms.title} spreadsheet على ${siteName}. هذه الصفحة العربية تناسب الجلسات الاكثر بصرية التي تريد التنقل بين عدة فئات بدون فقدان الاستمرارية.`,
      heroDescription: (platformName, siteName, terms) =>
        `صفحة ${platformName} على ${siteName} تناسب تصفحا بصريا اوسع حول ${terms.title} حيث تبقى الفئات والمنتجات والروابط داخل الجلسة نفسها.`,
      firstCardTitle: 'اطالة الجلسة البصرية',
      firstCardDescription: (platformName, terms) =>
        `${platformName} يستطيع حمل جلسة تصفح اوسع واكثر بصرية. مسار ${terms.title} يحافظ على هذا السلوك افضل من صفحة منصة عامة.`,
      searchAnglesDescription: (platformName, terms) =>
        `في ${platformName} تظهر انماط عربية مختلطة حول ${terms.title}: ${terms.searchSet}. هذه الصفحة تحافظ على هذا التدفق باحتكاك اقل.`,
      compareDescription: (platformName, terms) =>
        `مقارنة ${platformName} مع منصات اخرى تساعد هنا على اطالة جلسة ${terms.title} البصرية الواسعة.`,
    },
    direct_links: {
      seoDescription: (siteName, platformName, terms) =>
        `استكشف مختارات ${platformName} ${terms.title} spreadsheet على ${siteName}. هذه الصفحة العربية تقصر الطريق بين البحث عن المنصة والروابط المفيدة و ${terms.categoryFocus}.`,
      heroDescription: (platformName, siteName, terms) =>
        `مسار ${platformName} على ${siteName} الخاص بـ ${terms.title} مصمم للمستخدم الذي يصل باستعلام منصة واضح ويريد النزول بسرعة الى ${terms.categoryFocus}.`,
      firstCardTitle: 'تقليل المسافة بعد بحث المنصة',
      firstCardDescription: (platformName, terms) =>
        `اذا كانت الجلسة تبدأ من ${platformName} نفسه، فهذا المسار يقلل الالتفافات ويقرب المستخدم بسرعة من ${terms.categoryFocus}.`,
      searchAnglesDescription: (platformName, terms) =>
        `في العربية تظهر حول ${platformName} مع ${terms.title} الكثير من التركيبات المباشرة مثل ${terms.searchSet}. هذه الصفحة تحولها الى طريق اقصر.`,
      compareDescription: (platformName, terms) =>
        `في ${platformName} تخدم المقارنة مع منصات اخرى اساسا معرفة اي مسار يوصل اسرع الى ${terms.categoryFocus}.`,
    },
    stable_workflow: {
      seoDescription: (siteName, platformName, terms) =>
        `استكشف مختارات ${platformName} ${terms.title} spreadsheet على ${siteName}. هذه الصفحة العربية مخصصة للمستخدم الذي يفضل مسارا اكثر الفة واستقرارا وسهولة في المتابعة.`,
      heroDescription: (platformName, siteName, terms) =>
        `صفحة ${platformName} على ${siteName} ترتب عمليات البحث العربية حول ${terms.title} بطريقة اكثر هدوءا: تشتت اقل وفئات اوضح وانتقال اسهل نحو المنتجات.`,
      firstCardTitle: 'جعل المسار اكثر الفة',
      firstCardDescription: (platformName, terms) =>
        `بالنسبة الى ${platformName} يساعد مسار ${terms.title} الاكثر استقرارا المستخدمين الذين يريدون تشتتا اقل وانتقالا ابسط نحو ${terms.productFocus}.`,
      searchAnglesDescription: (platformName, terms) =>
        `عمليات البحث العربية حول ${platformName} في ${terms.title} تتبع غالبا نمطا اكثر كلاسيكية: ${terms.searchSet}. هذه الصفحة تحافظ على هذا الايقاع.`,
      compareDescription: (platformName, terms) =>
        `مقارنة ${platformName} مع منصات اخرى تعمل هنا اكثر كتأكيد على ان مسار ${terms.title} يبدو اكثر استقرارا.`,
    },
    practical_route: {
      seoDescription: (siteName, platformName, terms) =>
        `استكشف مختارات ${platformName} ${terms.title} spreadsheet على ${siteName}. هذه الصفحة العربية مبنية بشكل عملي: التفافات اقل ونزول اوضح نحو ${terms.categoryFocus}.`,
      heroDescription: (platformName, siteName, terms) =>
        `مسار ${platformName} على ${siteName} يتبنى نبرة اكثر عملية لعمليات البحث الخاصة بـ ${terms.title}: تقليل الخطوات غير الضرورية والدخول اسرع الى ${terms.categoryFocus}.`,
      firstCardTitle: 'قطع الالتفافات مبكرا',
      firstCardDescription: (platformName, terms) =>
        `${platformName} يكسب هنا مسارا اكثر عملية لـ ${terms.title} يدفع المستخدم بسرعة نحو ${terms.categoryFocus} بدل ابقائه على صفحة اعرض من اللازم.`,
      searchAnglesDescription: (platformName, terms) =>
        `في العربية تكون عمليات البحث حول ${platformName} و ${terms.title} مباشرة غالبا: ${terms.searchSet}. هذه الصفحة تتبع هذا النمط كما هو.`,
      compareDescription: (platformName, terms) =>
        `في ${platformName} تخدم المقارنة مع منصات اخرى اساسا التحقق من ان هذا هو المسار الابسط قبل الانتقال الى ${terms.productFocus}.`,
    },
  },
  it: {
    fast_branded: {
      seoDescription: (siteName, platformName, terms) =>
        `Esplora le selezioni ${platformName} ${terms.title} spreadsheet su ${siteName}. Questa pagina in italiano intercetta sessioni gia segnate dal brand che vogliono scendere velocemente verso ${terms.categoryFocus}.`,
      heroDescription: (platformName, siteName, terms) =>
        `Su ${siteName}, la pagina ${platformName} dedicata a ${terms.title} funziona meglio quando la sessione arriva gia con un segnale di brand chiaro e conviene scendere subito verso ${terms.categoryFocus}.`,
      firstCardTitle: 'Intercettare prima la domanda di brand',
      firstCardDescription: (platformName, terms) =>
        `${platformName} porta spesso sessioni gia orientate al brand. Questa pagina le spinge prima verso ${terms.categoryFocus} invece di farle rientrare in una pagina piattaforma troppo ampia.`,
      searchAnglesDescription: (platformName, terms) =>
        `Attorno a ${platformName}, le ricerche italiane su ${terms.title} mescolano spesso ${terms.searchSet}. Questa pagina raccoglie quel traffico in un percorso piu corto.`,
      compareDescription: (platformName, terms) =>
        `Confrontare ${platformName} con altre piattaforme resta utile soprattutto per capire se un'altra pagina porta ancora piu rapidamente verso ${terms.categoryFocus}.`,
    },
    research_heavy: {
      seoDescription: (siteName, platformName, terms) =>
        `Esplora le selezioni ${platformName} ${terms.title} spreadsheet su ${siteName}. Questa pagina in italiano e pensata per utenti che vogliono confrontare categorie, prodotti e pagine prima di uscire verso una piattaforma.`,
      heroDescription: (platformName, siteName, terms) =>
        `La pagina ${platformName} su ${siteName} organizza le ricerche italiane attorno a ${terms.title} per sessioni piu comparative e piu analitiche.`,
      firstCardTitle: 'Mantenere una lettura piu analitica',
      firstCardDescription: (platformName, terms) =>
        `Quando ${platformName} attira sessioni piu comparative, una pagina dedicata a ${terms.title} aiuta a ordinare categorie, prodotti e link senza rimandare l'utente di nuovo su Google.`,
      searchAnglesDescription: (platformName, terms) =>
        `Su ${platformName}, le ricerche italiane legate a ${terms.title} entrano spesso con una forma piu comparativa: ${terms.searchSet}. Questa pagina organizza meglio quel pattern.`,
      compareDescription: (platformName, terms) =>
        `Su ${platformName}, il confronto tra piattaforme serve soprattutto a tenere la valutazione delle pagine ${terms.title} dentro il sito.`,
    },
    visual_mix: {
      seoDescription: (siteName, platformName, terms) =>
        `Esplora le selezioni ${platformName} ${terms.title} spreadsheet su ${siteName}. Questa pagina in italiano si adatta meglio a sessioni piu visive che vogliono attraversare piu categorie senza perdere continuita.`,
      heroDescription: (platformName, siteName, terms) =>
        `La pagina ${platformName} su ${siteName} funziona bene per una navigazione piu visiva attorno a ${terms.title}, dove categorie, prodotti e link restano nella stessa sessione.`,
      firstCardTitle: 'Allungare una sessione piu visiva',
      firstCardDescription: (platformName, terms) =>
        `${platformName} puo sostenere una navigazione piu aperta e visiva. Questa pagina ${terms.title} la conserva meglio di una pagina piattaforma troppo generica.`,
      searchAnglesDescription: (platformName, terms) =>
        `Attorno a ${platformName} compaiono pattern italiani piu misti su ${terms.title}: ${terms.searchSet}. Questa pagina mantiene quel flusso con meno frizione.`,
      compareDescription: (platformName, terms) =>
        `Confrontare ${platformName} con altre piattaforme qui serve soprattutto a prolungare una sessione ${terms.title} piu visiva e ampia.`,
    },
    direct_links: {
      seoDescription: (siteName, platformName, terms) =>
        `Esplora le selezioni ${platformName} ${terms.title} spreadsheet su ${siteName}. Questa pagina in italiano accorcia il passaggio tra una ricerca di piattaforma, link utili e ${terms.categoryFocus}.`,
      heroDescription: (platformName, siteName, terms) =>
        `La pagina ${platformName} su ${siteName} per ${terms.title} e pensata per utenti che arrivano gia con una query di piattaforma e vogliono scendere rapidamente verso ${terms.categoryFocus}.`,
      firstCardTitle: 'Accorciare il percorso dalla ricerca piattaforma',
      firstCardDescription: (platformName, terms) =>
        `Se la sessione parte gia da ${platformName}, questa pagina ${terms.title} riduce i giri inutili e avvicina prima l'utente a ${terms.categoryFocus}.`,
      searchAnglesDescription: (platformName, terms) =>
        `In italiano, attorno a ${platformName} per ${terms.title} compaiono molte combinazioni dirette di ${terms.searchSet}. Questa pagina le trasforma in un percorso piu corto.`,
      compareDescription: (platformName, terms) =>
        `Su ${platformName}, confrontare piattaforme serve soprattutto a capire quale pagina porta prima verso ${terms.categoryFocus}.`,
    },
    stable_workflow: {
      seoDescription: (siteName, platformName, terms) =>
        `Esplora le selezioni ${platformName} ${terms.title} spreadsheet su ${siteName}. Questa pagina in italiano e pensata per utenti che preferiscono una pagina piu familiare, stabile e facile da seguire.`,
      heroDescription: (platformName, siteName, terms) =>
        `La pagina ${platformName} su ${siteName} ordina meglio le ricerche su ${terms.title} con un ingresso piu tranquillo: meno dispersione, categorie piu chiare e un passaggio piu comodo verso i prodotti.`,
      firstCardTitle: 'Rendere la pagina piu familiare',
      firstCardDescription: (platformName, terms) =>
        `Per ${platformName}, una pagina ${terms.title} piu stabile aiuta utenti che vogliono meno dispersione e una discesa piu semplice verso ${terms.productFocus}.`,
      searchAnglesDescription: (platformName, terms) =>
        `Le ricerche italiane attorno a ${platformName} su ${terms.title} seguono spesso un pattern piu classico: ${terms.searchSet}. Questa pagina rispetta quel ritmo.`,
      compareDescription: (platformName, terms) =>
        `Confrontare ${platformName} con altre piattaforme qui funziona piu come conferma di una pagina ${terms.title} gia percepita come piu stabile.`,
    },
    practical_route: {
      seoDescription: (siteName, platformName, terms) =>
        `Esplora le selezioni ${platformName} ${terms.title} spreadsheet su ${siteName}. Questa pagina in italiano nasce da un uso piu pratico: meno giri e una discesa piu chiara verso ${terms.categoryFocus}.`,
      heroDescription: (platformName, siteName, terms) =>
        `La pagina ${platformName} su ${siteName} adotta un tono piu pratico per le ricerche legate a ${terms.title}: tagliare passaggi inutili ed entrare prima in ${terms.categoryFocus}.`,
      firstCardTitle: 'Tagliare i giri prima',
      firstCardDescription: (platformName, terms) =>
        `${platformName} guadagna qui una pagina ${terms.title} piu pratica, costruita per spingere prima verso ${terms.categoryFocus} senza lasciare l'utente fermo su una pagina troppo ampia.`,
      searchAnglesDescription: (platformName, terms) =>
        `In italiano, le ricerche attorno a ${platformName} su ${terms.title} sono spesso molto dirette: ${terms.searchSet}. Questa pagina segue proprio quel comportamento.`,
      compareDescription: (platformName, terms) =>
        `Su ${platformName}, il confronto con altre piattaforme serve soprattutto a verificare quale pagina risulta piu semplice prima di passare a ${terms.productFocus}.`,
    },
  },
  pt: {
    fast_branded: {
      seoDescription: (siteName, platformName, terms) =>
        `Explore as selecoes ${platformName} ${terms.title} spreadsheet em ${siteName}. Esta pagina em portugues serve sessoes que ja chegam marcadas pela marca e querem descer rapido para ${terms.categoryFocus}.`,
      heroDescription: (platformName, siteName, terms) =>
        `Em ${siteName}, a pagina ${platformName} para ${terms.title} funciona melhor quando a sessao ja chega com sinal claro de marca e faz sentido descer rapido para ${terms.categoryFocus}.`,
      firstCardTitle: 'Captar mais cedo a procura de marca',
      firstCardDescription: (platformName, terms) =>
        `${platformName} costuma trazer sessoes ja marcadas pela marca. Esta pagina empurra esse trafego mais cedo para ${terms.categoryFocus} em vez de o prender numa pagina geral de plataforma.`,
      searchAnglesDescription: (platformName, terms) =>
        `Em torno de ${platformName}, as pesquisas em portugues sobre ${terms.title} misturam muitas vezes ${terms.searchSet}. Esta pagina junta esse trafego numa pagina mais curta.`,
      compareDescription: (platformName, terms) =>
        `Comparar ${platformName} com outras plataformas continua util sobretudo para perceber se outra pagina leva ainda mais rapido a ${terms.categoryFocus}.`,
    },
    research_heavy: {
      seoDescription: (siteName, platformName, terms) =>
        `Explore as selecoes ${platformName} ${terms.title} spreadsheet em ${siteName}. Esta pagina em portugues foi escrita para utilizadores que querem comparar categorias, produtos e paginas antes de sair para uma plataforma.`,
      heroDescription: (platformName, siteName, terms) =>
        `A pagina ${platformName} em ${siteName} organiza melhor as pesquisas em portugues sobre ${terms.title} para sessoes mais comparativas e analiticas.`,
      firstCardTitle: 'Manter uma leitura mais analitica',
      firstCardDescription: (platformName, terms) =>
        `Quando ${platformName} atrai sessoes mais comparativas, uma pagina dedicada a ${terms.title} ajuda a ordenar categorias, produtos e links sem mandar o utilizador outra vez para o Google.`,
      searchAnglesDescription: (platformName, terms) =>
        `Em ${platformName}, as pesquisas em portugues sobre ${terms.title} entram muitas vezes com forma mais comparativa: ${terms.searchSet}. Esta pagina organiza melhor esse padrao.`,
      compareDescription: (platformName, terms) =>
        `Em ${platformName}, a comparacao entre plataformas serve sobretudo para manter a avaliacao das paginas ${terms.title} dentro do site.`,
    },
    visual_mix: {
      seoDescription: (siteName, platformName, terms) =>
        `Explore as selecoes ${platformName} ${terms.title} spreadsheet em ${siteName}. Esta pagina em portugues encaixa melhor em sessoes mais visuais que querem percorrer varias categorias sem perder continuidade.`,
      heroDescription: (platformName, siteName, terms) =>
        `A pagina ${platformName} em ${siteName} funciona melhor com uma navegacao mais visual em torno de ${terms.title}, onde categorias, produtos e links continuam na mesma sessao.`,
      firstCardTitle: 'Alongar uma sessao mais visual',
      firstCardDescription: (platformName, terms) =>
        `${platformName} consegue sustentar uma navegacao mais aberta e visual. Esta pagina ${terms.title} preserva melhor esse comportamento do que uma pagina de plataforma demasiado generica.`,
      searchAnglesDescription: (platformName, terms) =>
        `Em ${platformName} aparecem padroes mistos em portugues sobre ${terms.title}: ${terms.searchSet}. Esta pagina mantem esse fluxo com menos friccao.`,
      compareDescription: (platformName, terms) =>
        `Comparar ${platformName} com outras plataformas aqui serve sobretudo para prolongar uma sessao ${terms.title} mais visual e ampla.`,
    },
    direct_links: {
      seoDescription: (siteName, platformName, terms) =>
        `Explore as selecoes ${platformName} ${terms.title} spreadsheet em ${siteName}. Esta pagina em portugues encurta o passo entre uma pesquisa de plataforma, links uteis e ${terms.categoryFocus}.`,
      heroDescription: (platformName, siteName, terms) =>
        `A pagina ${platformName} em ${siteName} para ${terms.title} foi pensada para utilizadores que ja chegam com uma pesquisa de plataforma e querem descer rapido para ${terms.categoryFocus}.`,
      firstCardTitle: 'Encurtar o caminho desde a pesquisa de plataforma',
      firstCardDescription: (platformName, terms) =>
        `Se a sessao ja comeca por ${platformName}, esta pagina ${terms.title} reduz desvios e aproxima mais cedo o utilizador de ${terms.categoryFocus}.`,
      searchAnglesDescription: (platformName, terms) =>
        `Em portugues, em torno de ${platformName} para ${terms.title}, aparecem muitas combinacoes diretas de ${terms.searchSet}. Esta pagina transforma-as numa pagina mais curta.`,
      compareDescription: (platformName, terms) =>
        `Em ${platformName}, comparar plataformas serve sobretudo para ver que pagina chega mais cedo a ${terms.categoryFocus}.`,
    },
    stable_workflow: {
      seoDescription: (siteName, platformName, terms) =>
        `Explore as selecoes ${platformName} ${terms.title} spreadsheet em ${siteName}. Esta pagina em portugues foi pensada para utilizadores que preferem uma pagina mais familiar, estavel e facil de seguir.`,
      heroDescription: (platformName, siteName, terms) =>
        `A pagina ${platformName} em ${siteName} organiza melhor as pesquisas sobre ${terms.title} com uma entrada mais tranquila: menos dispersao, categorias mais claras e um passo mais confortavel para os produtos.`,
      firstCardTitle: 'Tornar a pagina mais familiar',
      firstCardDescription: (platformName, terms) =>
        `Para ${platformName}, uma pagina ${terms.title} mais estavel ajuda utilizadores que querem menos dispersao e uma descida mais simples para ${terms.productFocus}.`,
      searchAnglesDescription: (platformName, terms) =>
        `As pesquisas em portugues em torno de ${platformName} sobre ${terms.title} seguem muitas vezes um padrao mais classico: ${terms.searchSet}. Esta pagina respeita esse ritmo.`,
      compareDescription: (platformName, terms) =>
        `Comparar ${platformName} com outras plataformas aqui funciona mais como confirmacao de uma pagina ${terms.title} que ja parece mais estavel.`,
    },
    practical_route: {
      seoDescription: (siteName, platformName, terms) =>
        `Explore as selecoes ${platformName} ${terms.title} spreadsheet em ${siteName}. Esta pagina em portugues foi pensada para um uso mais pratico: menos desvios e uma descida mais clara para ${terms.categoryFocus}.`,
      heroDescription: (platformName, siteName, terms) =>
        `A pagina ${platformName} em ${siteName} adopta um tom mais pratico para pesquisas sobre ${terms.title}: cortar passos desnecessarios e entrar mais cedo em ${terms.categoryFocus}.`,
      firstCardTitle: 'Cortar desvios mais cedo',
      firstCardDescription: (platformName, terms) =>
        `${platformName} ganha aqui uma pagina ${terms.title} mais pratica, feita para empurrar mais cedo para ${terms.categoryFocus} sem deixar o utilizador preso numa pagina demasiado ampla.`,
      searchAnglesDescription: (platformName, terms) =>
        `Em portugues, as pesquisas em torno de ${platformName} sobre ${terms.title} costumam ser bastante diretas: ${terms.searchSet}. Esta pagina segue exatamente esse padrao.`,
      compareDescription: (platformName, terms) =>
        `Em ${platformName}, a comparacao com outras plataformas serve sobretudo para confirmar qual pagina e mais simples antes de passar para ${terms.productFocus}.`,
    },
  },
};

function getPlatformLandingIntentLocalizedTerms(
  intent: PlatformLandingIntentConfig,
  locale: PlatformLandingIntentNarrativeLocale,
) {
  return PLATFORM_INTENT_NARRATIVE_TERMS[locale][
    intent.slug as keyof typeof PLATFORM_INTENT_NARRATIVE_TERMS[typeof locale]
  ] || null;
}

function createNarrativeIntentCopy(
  config: PlatformLandingConfig,
  intent: PlatformLandingIntentConfig,
  locale: PlatformLandingIntentNarrativeLocale,
  narrativeKey: PlatformLandingNarrativeKey,
): PlatformLandingIntentDetailCopy | null {
  const terms = getPlatformLandingIntentLocalizedTerms(intent, locale);

  if (!terms) {
    return null;
  }

  const frame = PLATFORM_INTENT_NARRATIVE_FRAMES[locale][narrativeKey];

  if (locale === 'fr') {
    return {
      heroDescription: (platformName, siteName) =>
        frame.heroDescription(platformName, siteName, terms),
      cards: (platformName) => [
        {
          title: frame.firstCardTitle,
          description: frame.firstCardDescription(platformName, terms),
        },
      {
        title: `Garder les recherches ${terms.title} plus nettes`,
        description:
            `La page regroupe ${terms.searchSet} au meme endroit pour eviter qu'une meme demande ${terms.title} se disperse entre plusieurs pages plus larges.`,
        },
        {
          title: 'Faire apparaitre des produits plus vite',
          description:
            `Cette page doit rapprocher plus vite les visiteurs de ${terms.productFocus}, pas seulement d'un nouveau bloc explicatif sur la plateforme.`,
        },
      ],
      searchAnglesTitle: `Angles de recherche ${terms.title}`,
      searchAnglesDescription: (platformName) =>
        frame.searchAnglesDescription(platformName, terms),
      nextClickTitle: `Meilleure prochaine etape pour ${terms.title}`,
      nextClickDescription: () =>
        `Le bon prochain clic consiste a pousser plus vite vers ${terms.categoryFocus}, puis a laisser les cartes produit finir le travail.`,
      productsTitle: (platformName) => `Decouvertes ${terms.title} pour ${platformName}`,
      productsDescription: () =>
        `Une page ${terms.title} performe mieux quand elle montre vite ${terms.productFocus} au lieu de rester trop theorique.`,
      compareTitle: (intentName) => `Comparer les guides ${intentName.toLowerCase()} entre plateformes`,
      compareDescription: (platformName) =>
        frame.compareDescription(platformName, terms),
      faqTitle: (platformName) => `Questions frequentes ${platformName} ${terms.title}`,
      faqItems: (siteName, platformName) => [
        {
          question: `Pourquoi ${siteName} a-t-il une page ${platformName} dediee aux ${terms.title} ?`,
          answer:
            `Parce qu'une recherche ${terms.title} est deja plus precise qu'une page plateforme generaliste. Une page dediee sert mieux cette demande et raccourcit l'entree vers les bons produits.`,
        },
        {
          question: `Quand faut-il ouvrir cette page ${platformName} ${terms.title} ?`,
          answer:
            `Ouvrez-la quand vous savez deja que vous voulez explorer les ${terms.title} et que vous preferez une page plus directe vers categories, produits et liens utiles.`,
        },
        {
          question: `Faut-il commencer ici ou sur la page principale ${platformName} ?`,
          answer:
            `Commencez ici si l'intention ${terms.title} est deja claire. Revenez a la page principale ${platformName} si vous etes encore au stade de decouverte large.`,
        },
      ],
    };
  }

  if (locale === 'de') {
    return {
      heroDescription: (platformName, siteName) =>
        frame.heroDescription(platformName, siteName, terms),
      cards: (platformName) => [
        {
          title: frame.firstCardTitle,
          description: frame.firstCardDescription(platformName, terms),
        },
      {
        title: `${terms.title} sucher klarer halten`,
        description:
            `Die Seite bundelt ${terms.searchSet} an einem Ort, damit sich dieselbe ${terms.title}-Nachfrage nicht uber mehrere breitere Seiten verteilt.`,
        },
        {
          title: 'Sichtbare Produkte fruher zeigen',
          description:
            `Diese Seite soll Nutzer fruher zu ${terms.productFocus} bringen statt nur weiteren allgemeinen Plattform-Text vorzuschalten.`,
        },
      ],
      searchAnglesTitle: `Suchwinkel fur ${terms.title}`,
      searchAnglesDescription: (platformName) =>
        frame.searchAnglesDescription(platformName, terms),
      nextClickTitle: `Bester nachster klick fur ${terms.title}`,
      nextClickDescription: () =>
        `Der nachste sinnvolle Klick sollte moglichst fruh in ${terms.categoryFocus} fuhren und danach Produktkarten den Rest uberlassen.`,
      productsTitle: (platformName) => `Beliebte ${terms.title}-Auswahl fur ${platformName}`,
      productsDescription: () =>
        `Eine fokussierte ${terms.title}-Seite funktioniert besser, wenn sie fruh ${terms.productFocus} zeigt statt zu lange rein informativ zu bleiben.`,
      compareTitle: (intentName) => `${intentName.toLowerCase()}-Seiten zwischen Plattformen vergleichen`,
      compareDescription: (platformName) =>
        frame.compareDescription(platformName, terms),
      faqTitle: (platformName) => `Haufige Fragen zu ${platformName} ${terms.title}`,
      faqItems: (siteName, platformName) => [
        {
          question: `Warum hat ${siteName} eine eigene ${platformName}-Seite fur ${terms.title}?`,
          answer:
            `Weil ${terms.title} bereits eine engere Suchabsicht ist als eine breite Plattform-Seite. Eine dedizierte Seite bedient diese Nachfrage sauberer und fuhrt schneller zu relevanten Produkten.`,
        },
        {
          question: `Wann sollte ich diese ${platformName}-${terms.title}-Seite offnen?`,
          answer:
            `Dann, wenn Sie bereits wissen, dass Sie ${terms.title} durchsuchen wollen und einen kurzeren Weg zu Kategorien, Produkten und nutzlichen Links bevorzugen.`,
        },
        {
          question: `Sollte ich hier starten oder auf der Hauptseite von ${platformName}?`,
          answer:
            `Starten Sie hier, wenn die ${terms.title}-Absicht schon klar ist. Nutzen Sie die Hauptseite von ${platformName}, wenn Sie noch breiter orientieren wollen.`,
        },
      ],
    };
  }

  if (locale === 'ar') {
    return {
      heroDescription: (platformName, siteName) =>
        `${frame.heroDescription(platformName, siteName, terms)}`,
      cards: (platformName) => [
        {
          title: frame.firstCardTitle,
          description: frame.firstCardDescription(platformName, terms),
        },
        {
          title: `الحفاظ على بحث ${terms.title} بشكل اوضح`,
          description:
            `هذا المسار يجمع ${terms.searchSet} في مكان واحد حتى لا تتوزع نية ${terms.title} نفسها بين صفحات اعرض.`,
        },
        {
          title: 'اظهار المنتجات الواضحة بشكل اسرع',
          description:
            `هذه الصفحة يجب ان تقرب المستخدم بسرعة من ${terms.productFocus} بدلا من الاكتفاء بطبقة شرح عامة عن المنصة.`,
        },
      ],
      searchAnglesTitle: `زوايا البحث عن ${terms.title}`,
      searchAnglesDescription: (platformName) =>
        frame.searchAnglesDescription(platformName, terms),
      nextClickTitle: `افضل نقرة تالية لنية ${terms.title}`,
      nextClickDescription: () =>
        `الخطوة التالية الافضل هي دفع المستخدم بشكل اسرع نحو ${terms.categoryFocus} ثم ترك بطاقات المنتجات تكمل الباقي.`,
      productsTitle: (platformName) => `اكتشافات ${terms.title} لـ ${platformName}`,
      productsDescription: () =>
        `مسار ${terms.title} يعمل بشكل افضل عندما يعرض ${terms.productFocus} بسرعة بدلا من البقاء في مساحة معلوماتية فقط.`,
      compareTitle: (intentName) => `قارن صفحات ${intentName.toLowerCase()} بين المنصات`,
      compareDescription: (platformName) =>
        frame.compareDescription(platformName, terms),
      faqTitle: (platformName) => `الاسئلة الشائعة حول ${platformName} ${terms.title}`,
      faqItems: (siteName, platformName) => [
        {
          question: `لماذا لدى ${siteName} صفحة ${platformName} مخصصة لـ ${terms.title}؟`,
          answer:
            `لان البحث عن ${terms.title} اكثر تحديدا من صفحة المنصة العامة. المسار المخصص يخدم هذه النية بشكل افضل ويقصر الطريق الى المنتجات المناسبة.`,
        },
        {
          question: `متى يجب فتح صفحة ${platformName} الخاصة بـ ${terms.title}؟`,
          answer:
            `افتحها عندما تكون تعرف مسبقا انك تريد استكشاف ${terms.title} وتفضل طريقا اقصر نحو الفئات والمنتجات والروابط المفيدة.`,
        },
        {
          question: `هل ابدأ من هنا ام من الصفحة الرئيسية لـ ${platformName}؟`,
          answer:
            `ابدأ من هنا اذا كانت نية ${terms.title} واضحة بالفعل. استخدم صفحة ${platformName} الرئيسية اذا كنت لا تزال بحاجة الى نظرة اوسع.`,
        },
      ],
    };
  }

  if (locale === 'it') {
    return {
      heroDescription: (platformName, siteName) =>
        frame.heroDescription(platformName, siteName, terms),
      cards: (platformName) => [
        {
          title: frame.firstCardTitle,
          description: frame.firstCardDescription(platformName, terms),
        },
      {
        title: `Tenere piu chiara la domanda ${terms.title}`,
        description:
            `La pagina raggruppa ${terms.searchSet} in un solo punto cosi la stessa intenzione ${terms.title} non si disperde tra pagine piu ampie.`,
        },
        {
          title: 'Mostrare prima prodotti visibili',
          description:
            `Questa pagina deve portare prima l'utente verso ${terms.productFocus}, non lasciarlo piu a lungo dentro una spiegazione generica sulle piattaforme.`,
        },
      ],
      searchAnglesTitle: `Angoli di ricerca per ${terms.title}`,
      searchAnglesDescription: (platformName) =>
        frame.searchAnglesDescription(platformName, terms),
      nextClickTitle: `Miglior prossimo clic per ${terms.title}`,
      nextClickDescription: () =>
        `Il clic successivo migliore e spingere prima verso ${terms.categoryFocus} e poi lasciare che le card prodotto facciano il resto.`,
      productsTitle: (platformName) => `Selezioni popolari di ${terms.title} per ${platformName}`,
      productsDescription: () =>
        `Una pagina ${terms.title} funziona meglio quando mostra presto ${terms.productFocus} invece di restare solo informativa.`,
      compareTitle: (intentName) => `Confronta le pagine ${intentName.toLowerCase()} tra piattaforme`,
      compareDescription: (platformName) =>
        frame.compareDescription(platformName, terms),
      faqTitle: (platformName) => `Domande frequenti ${terms.title} per ${platformName}`,
      faqItems: (siteName, platformName) => [
        {
          question: `Perche ${siteName} ha una pagina ${platformName} dedicata a ${terms.title}?`,
          answer:
            `Perche una ricerca ${terms.title} e gia piu precisa di una pagina piattaforma generica. Una pagina dedicata serve meglio quella domanda e accorcia il percorso verso i prodotti utili.`,
        },
        {
          question: `Quando dovrei aprire questa pagina ${platformName} per ${terms.title}?`,
          answer:
            `Aprila quando sai gia che vuoi esplorare ${terms.title} e preferisci una pagina piu corta verso categorie, prodotti e link utili.`,
        },
        {
          question: `Dovrei iniziare qui o dalla pagina principale di ${platformName}?`,
          answer:
            `Inizia qui se l'intenzione ${terms.title} e gia chiara. Usa la guida principale di ${platformName} se ti serve ancora una visione piu ampia.`,
        },
      ],
    };
  }

  if (locale === 'pt') {
    return {
      heroDescription: (platformName, siteName) =>
        frame.heroDescription(platformName, siteName, terms),
      cards: (platformName) => [
        {
          title: frame.firstCardTitle,
          description: frame.firstCardDescription(platformName, terms),
        },
      {
        title: `Manter mais clara a procura por ${terms.title}`,
        description:
            `A pagina agrupa ${terms.searchSet} num unico lugar para que a mesma intencao de ${terms.title} nao se espalhe por paginas mais amplas.`,
        },
        {
          title: 'Mostrar produtos visiveis mais cedo',
          description:
            `Esta pagina deve aproximar o utilizador mais cedo de ${terms.productFocus}, e nao deixa-lo mais tempo numa explicacao generica sobre plataformas.`,
        },
      ],
      searchAnglesTitle: `Angulos de pesquisa para ${terms.title}`,
      searchAnglesDescription: (platformName) =>
        frame.searchAnglesDescription(platformName, terms),
      nextClickTitle: `Melhor proximo clique para ${terms.title}`,
      nextClickDescription: () =>
        `O melhor clique seguinte e descer mais cedo para ${terms.categoryFocus} e depois deixar que os cards de produto facam o resto.`,
      productsTitle: (platformName) => `Selecoes populares de ${terms.title} para ${platformName}`,
      productsDescription: () =>
        `Uma pagina de ${terms.title} funciona melhor quando mostra cedo ${terms.productFocus} em vez de ficar apenas na explicacao.`,
      compareTitle: (intentName) => `Compara paginas de ${intentName.toLowerCase()} entre plataformas`,
      compareDescription: (platformName) =>
        frame.compareDescription(platformName, terms),
      faqTitle: (platformName) => `Perguntas frequentes de ${terms.title} para ${platformName}`,
      faqItems: (siteName, platformName) => [
        {
          question: `Porque e que ${siteName} tem uma pagina ${platformName} dedicada a ${terms.title}?`,
          answer:
            `Porque uma pesquisa por ${terms.title} ja e mais precisa do que uma pagina geral de plataforma. Uma pagina dedicada serve melhor essa procura e encurta o caminho ate aos produtos relevantes.`,
        },
        {
          question: `Quando devo abrir esta pagina ${platformName} de ${terms.title}?`,
          answer:
            `Abra-a quando ja souber que quer explorar ${terms.title} e preferir uma pagina mais curta para categorias, produtos e links uteis.`,
        },
        {
          question: `Devo comecar aqui ou na pagina principal de ${platformName}?`,
          answer:
            `Comece aqui se a intencao de ${terms.title} ja estiver clara. Use a guia principal de ${platformName} se ainda precisar de uma entrada mais ampla.`,
        },
      ],
    };
  }

  return {
    heroDescription: (platformName, siteName) =>
      frame.heroDescription(platformName, siteName, terms),
    cards: (platformName) => [
      {
        title: frame.firstCardTitle,
        description: frame.firstCardDescription(platformName, terms),
      },
      {
        title: `Mantener mas clara la demanda de ${terms.title}`,
        description:
          `La ruta agrupa ${terms.searchSet} en un mismo lugar para que la misma intencion de ${terms.title} no se disperse entre varias paginas mas amplias.`,
      },
      {
        title: 'Mostrar productos visibles antes',
        description:
          `Esta pagina debe acercar antes al usuario a ${terms.productFocus}, no dejarlo mas tiempo en una explicacion generica sobre plataformas.`,
      },
    ],
    searchAnglesTitle: `Angulos de busqueda para ${terms.title}`,
    searchAnglesDescription: (platformName) =>
      frame.searchAnglesDescription(platformName, terms),
    nextClickTitle: `Mejor siguiente clic para ${terms.title}`,
    nextClickDescription: () =>
      `El mejor siguiente clic es bajar antes hacia ${terms.categoryFocus} y dejar despues que las tarjetas de producto hagan el resto.`,
    productsTitle: (platformName) => `Selecciones populares de ${terms.title} para ${platformName}`,
    productsDescription: () =>
      `Una ruta de ${terms.title} funciona mejor cuando enseguida muestra ${terms.productFocus} en lugar de quedarse solo en explicacion.`,
    compareTitle: (intentName) => `Compara paginas de ${intentName.toLowerCase()} entre plataformas`,
    compareDescription: (platformName) =>
      frame.compareDescription(platformName, terms),
    faqTitle: (platformName) => `Preguntas frecuentes de ${terms.title} para ${platformName}`,
    faqItems: (siteName, platformName) => [
      {
        question: `Por que ${siteName} tiene una pagina de ${platformName} dedicada a ${terms.title}?`,
        answer:
          `Porque una busqueda de ${terms.title} ya es mas precisa que una pagina general de plataforma. Una ruta dedicada sirve mejor esa demanda y acorta el camino hacia productos utiles.`,
      },
      {
        question: `Cuando deberia abrir esta pagina ${platformName} de ${terms.title}?`,
        answer:
          `Abrela cuando ya sabes que quieres explorar ${terms.title} y prefieres una ruta mas corta hacia categorias, productos y links utiles.`,
      },
      {
        question: `Debo empezar aqui o en la pagina principal de ${platformName}?`,
        answer:
          `Empieza aqui si la intencion de ${terms.title} ya esta clara. Usa la guia principal de ${platformName} si todavia necesitas una entrada mas amplia.`,
      },
    ],
  };
}

const PLATFORM_INTENT_DETAIL_COPY: Record<
  'en' | 'zh',
  Partial<Record<string, PlatformLandingIntentDetailCopy>>
> = {
  en: {
    shoes: {
      heroDescription: (platformName, siteName) =>
        `Browse ${platformName} shoes finds on ${siteName}. This page brings shoe, sneaker and spreadsheet-style searches into one clearer place so you can start browsing footwear faster.`,
      cards: (platformName) => [
        {
          title: 'Prioritize sneaker-heavy demand',
          description: `${platformName} shoe searches usually blend spreadsheet terms with sneaker-specific browsing intent, so this page narrows that traffic immediately.`,
        },
        {
          title: 'Cover both shoes and sneakers',
          description: 'The page keeps broad shoe searches and sneaker-led browsing together so you do not have to restart from similar queries.',
        },
        {
          title: 'Move users into product-rich inventory',
          description: 'Footwear is one of the deepest discovery paths in the catalog, which makes this page stronger than a generic agent landing.',
        },
      ],
      searchAnglesTitle: 'High-intent shoe searches',
      searchAnglesDescription: (platformName) =>
        `${platformName} shoe searches usually include spreadsheet, yupoo, links and taobao modifiers. This page keeps those searches centered around footwear instead of scattering them.`,
      nextClickTitle: 'Best next click for footwear intent',
      nextClickDescription: () =>
        'Send visitors into the most relevant footwear category as quickly as possible, then let products and brand signals do the rest.',
      productsTitle: (platformName) => `Popular shoe finds for ${platformName}`,
      productsDescription: () =>
        'Footwear traffic tends to convert best when the first screen already contains obvious product choices instead of only explanatory copy.',
      compareTitle: (intentName) => `Compare ${intentName.toLowerCase()} guides across agents`,
      compareDescription: (_platformName, intentName) =>
        `The same ${intentName.toLowerCase()} searches often appear across multiple agents. Linking these pages makes comparison easier without sending users back to search.`,
      faqTitle: (platformName) => `${platformName} shoes FAQ`,
      faqItems: (siteName, platformName) => [
        {
          question: `Why does ${siteName} have a separate ${platformName} shoes page?`,
          answer:
            `Because shoe and sneaker searches are one of the strongest repeat patterns around ${platformName}. A dedicated page serves that browsing need more clearly than a broad platform guide.`,
        },
        {
          question: `Does this page only cover sneakers?`,
          answer:
            `No. It covers both general shoe searches and sneaker-heavy queries, then moves users into the most relevant products and categories.`,
        },
        {
          question: `Should I start here or on the main ${platformName} page?`,
          answer:
            `If you already know you want footwear, start here. If you are still exploring categories, the main ${platformName} spreadsheet page is a better top-level entry.`,
        },
      ],
    },
    jackets: {
      heroDescription: (platformName, siteName) =>
        `Browse ${platformName} jackets finds on ${siteName}. This page is designed for outerwear-heavy searches so users can move directly into jacket, coat and puffer discovery paths.`,
      cards: (platformName) => [
        {
          title: 'Catch outerwear intent fast',
          description: `${platformName} jacket traffic is usually seasonal, comparison-heavy and closer to purchase than generic agent browsing.`,
        },
        {
          title: 'Handle jackets, puffers and coats together',
          description: 'The page treats these related outerwear terms as one demand cluster so users reach matching products faster.',
        },
        {
          title: 'Reduce wasted exploration',
          description: 'Outerwear shoppers often want a narrow route into category pages, not another high-level overview of agents.',
        },
      ],
      searchAnglesTitle: 'Outerwear search angles',
      searchAnglesDescription: () =>
        'Jacket traffic tends to include spreadsheet, taobao and yupoo modifiers plus seasonal product comparisons.',
      nextClickTitle: 'Best next click for outerwear',
      nextClickDescription: () =>
        'Guide users into jacket-led categories early, then let visual product cards and brand familiarity carry the session.',
      productsTitle: (platformName) => `Popular jacket finds for ${platformName}`,
      productsDescription: () =>
        'Outerwear pages perform better when they combine category targeting with immediate product discovery.',
      compareTitle: (intentName) => `Compare ${intentName.toLowerCase()} guides across agents`,
      compareDescription: () =>
        `Users often compare outerwear routes between agents. These links keep that comparison inside your site instead of sending them back to search.`,
      faqTitle: (platformName) => `${platformName} jackets FAQ`,
      faqItems: (siteName, platformName) => [
        {
          question: `What does the ${platformName} jackets page help with?`,
          answer:
            `${siteName} groups jacket, coat and puffer-style discovery into one focused page so ${platformName} users can browse outerwear faster.`,
        },
        {
          question: `Is this only for winter products?`,
          answer:
            `No. The page covers broad outerwear demand, not just winter pieces, although puffer and coat searches are a major part of the cluster.`,
        },
        {
          question: `Why not keep jackets inside the main platform page?`,
          answer:
            `Because dedicated category-intent pages usually serve long-tail search demand better and reduce friction for users who already know what they want.`,
        },
      ],
    },
    bags: {
      heroDescription: (platformName, siteName) =>
        `Browse ${platformName} bags finds on ${siteName}. This page is built for bag, handbag and backpack searches so visitors can move straight into accessory-led browsing.`,
      cards: (platformName) => [
        {
          title: 'Capture accessory-heavy demand',
          description: `${platformName} bag searches often come from users who already know the broad category they want, so the landing should skip generic platform education.`,
        },
        {
          title: 'Cover bags, handbags and backpacks',
          description: 'The page groups the most common bag modifiers together so users do not need separate searches for each carrying style.',
        },
        {
          title: 'Lead with visual browsing',
          description: 'Bags are comparison-heavy and image-led, which makes product-forward discovery more useful than a purely informational page.',
        },
      ],
      searchAnglesTitle: 'Bag search angles',
      searchAnglesDescription: (platformName) =>
        `${platformName} bag searches usually mix spreadsheet terms with handbag, backpack and yupoo modifiers. This page turns those variants into one clearer browsing page.`,
      nextClickTitle: 'Best next click for bag intent',
      nextClickDescription: () =>
        'Push visitors toward the closest bag category early, then let product imagery and recognizable styles keep the session moving.',
      productsTitle: (platformName) => `Popular bag finds for ${platformName}`,
      productsDescription: () =>
        'Bag pages perform best when they surface product variety fast instead of forcing users through another general overview.',
      compareTitle: (intentName) => `Compare ${intentName.toLowerCase()} guides across agents`,
      compareDescription: (_platformName, intentName) =>
        `Bag shoppers often compare the same ${intentName.toLowerCase()} pages across multiple agents. These internal links keep that comparison inside the site.`,
      faqTitle: (platformName) => `${platformName} bags FAQ`,
      faqItems: (siteName, platformName) => [
        {
          question: `Why does ${siteName} have a dedicated ${platformName} bags page?`,
          answer:
            `Because bag demand behaves differently from general platform browsing. Users usually want a faster path into handbag, backpack and accessory discovery.`,
        },
        {
          question: `Does this page only cover handbags?`,
          answer:
            `No. It is designed to cover handbags, backpacks and broader bag-related searches in one place.`,
        },
        {
          question: `When should I start here instead of the main ${platformName} page?`,
          answer:
            `Start here if you already know you want bags or accessories. Use the main ${platformName} guide if you still need a broader entry point.`,
        },
      ],
    },
    hoodies: {
      heroDescription: (platformName, siteName) =>
        `Browse ${platformName} hoodies finds on ${siteName}. This page is built for hoodie and sweatshirt searches that need a shorter path into casualwear browsing.`,
      cards: (platformName) => [
        {
          title: 'Catch casualwear demand early',
          description: `${platformName} hoodie searches are broad, repeatable and product-led, which makes a focused page more useful than burying them inside a wider platform overview.`,
        },
        {
          title: 'Connect hoodies and sweatshirts',
          description: 'The page treats hoodie and sweatshirt language as one group so visitors reach relevant inventory faster.',
        },
        {
          title: 'Reduce friction before product clicks',
          description: 'People searching hoodies rarely want more platform explanation. They usually want to start comparing products immediately.',
        },
      ],
      searchAnglesTitle: 'Hoodie search angles',
      searchAnglesDescription: (platformName) =>
        `${platformName} hoodie searches often appear with spreadsheet, yupoo, links and sweatshirt modifiers. This page keeps those patterns focused on one apparel area.`,
      nextClickTitle: 'Best next click for hoodie intent',
      nextClickDescription: () =>
        'Move visitors into hoodie or sweatshirt-led categories quickly, then let product cards and brand familiarity carry the next decision.',
      productsTitle: (platformName) => `Popular hoodie finds for ${platformName}`,
      productsDescription: () =>
        'Hoodie pages work best when the first screen quickly turns search intent into visible, comparable product options.',
      compareTitle: (intentName) => `Compare ${intentName.toLowerCase()} guides across agents`,
      compareDescription: (_platformName, intentName) =>
        `The same ${intentName.toLowerCase()} searches appear across multiple agents, so internal comparison links help users stay on-site while comparing pages.`,
      faqTitle: (platformName) => `${platformName} hoodies FAQ`,
      faqItems: (siteName, platformName) => [
        {
          question: `Why make a separate ${platformName} hoodies page?`,
          answer:
            `${siteName} breaks hoodie and sweatshirt demand into its own page because users with clear apparel intent usually want a faster path than a general platform page can provide.`,
        },
        {
          question: `Is this page only for oversized hoodies?`,
          answer:
            `No. It is designed for broad hoodie and sweatshirt discovery, not a single fit or style.`,
        },
        {
          question: `Should I browse here first or start on the main ${platformName} guide?`,
          answer:
            `Start here when you already know you want hoodies. Start on the main ${platformName} page if you still need to compare categories first.`,
        },
      ],
    },
    watches: {
      heroDescription: (platformName, siteName) =>
        `Browse ${platformName} watches finds on ${siteName}. This page is built for watch-led searches where users want a cleaner path into accessories and timepiece browsing.`,
      cards: (platformName) => [
        {
          title: 'Serve high-consideration accessory traffic',
          description: `${platformName} watch demand is usually more comparison-heavy than casual browsing, so the page should move quickly from search terms to product options.`,
        },
        {
          title: 'Unify watch and accessories intent',
          description: 'Watches often overlap with broader accessories discovery. This page keeps that overlap usable without losing the watch-first angle.',
        },
        {
          title: 'Keep evaluation on-site',
          description: 'Timepiece shoppers often compare multiple options and pages before clicking out, which makes internal comparison blocks especially valuable here.',
        },
      ],
      searchAnglesTitle: 'Watch search angles',
      searchAnglesDescription: (platformName) =>
        `${platformName} watch searches commonly include spreadsheet, links, taobao and accessory modifiers. This page keeps those searches grouped around timepiece browsing.`,
      nextClickTitle: 'Best next click for watch intent',
      nextClickDescription: () =>
        'Guide users into the closest watch or accessories category quickly, then support evaluation with visible products and related agent comparisons.',
      productsTitle: (platformName) => `Popular watch finds for ${platformName}`,
      productsDescription: () =>
        'Watch pages are stronger when they combine focused entry paths with product-led comparison instead of staying generic.',
      compareTitle: (intentName) => `Compare ${intentName.toLowerCase()} guides across agents`,
      compareDescription: (_platformName, intentName) =>
        `Watch shoppers frequently compare the same ${intentName.toLowerCase()} pages across agents before they commit to one path.`,
      faqTitle: (platformName) => `${platformName} watches FAQ`,
      faqItems: (siteName, platformName) => [
        {
          question: `Why does ${siteName} have a separate ${platformName} watches page?`,
          answer:
            `Because watch demand is more evaluation-heavy than a typical generic landing. A dedicated page is better for users who already know they want timepieces or accessories.`,
        },
        {
          question: `Is this page only for luxury-style watches?`,
          answer:
            `No. It is meant for broad watch-led discovery, whether the user starts from casual accessories interest or specific timepiece searches.`,
        },
        {
          question: `Should I use this page or the main ${platformName} guide first?`,
          answer:
            `Use this page if you already know you want watches. Use the main ${platformName} page if you still need a wider overview of categories and nearby pages.`,
        },
      ],
    },
    pants: {
      heroDescription: (platformName, siteName) =>
        `Browse ${platformName} pants finds on ${siteName}. This page is designed for trousers, cargo pants and bottoms-led searches that need a narrower path into apparel browsing.`,
      cards: (platformName) => [
        {
          title: 'Catch bottoms intent directly',
          description: `${platformName} pants searches usually come from users with clearer purchase intent than general browsing, so they benefit from a focused page.`,
        },
        {
          title: 'Group pants, trousers and cargos',
          description: 'The page keeps the most common bottoms modifiers together so visitors can browse one consolidated view instead of restarting with adjacent terms.',
        },
        {
          title: 'Push faster into category inventory',
          description: 'Bottoms demand tends to respond better to quick category and product visibility than to another generic platform explanation.',
        },
      ],
      searchAnglesTitle: 'Pants search angles',
      searchAnglesDescription: (platformName) =>
        `${platformName} pants searches often combine spreadsheet terms with trousers, cargos, yupoo and taobao modifiers. This page keeps that behavior focused on one apparel page.`,
      nextClickTitle: 'Best next click for pants intent',
      nextClickDescription: () =>
        'Move visitors into pants or bottoms-led categories early, then let product cards and adjacent agent guides do the rest of the filtering.',
      productsTitle: (platformName) => `Popular pants finds for ${platformName}`,
      productsDescription: () =>
        'Pants pages work better when they quickly surface product options, because users usually arrive with a narrower category goal.',
      compareTitle: (intentName) => `Compare ${intentName.toLowerCase()} guides across agents`,
      compareDescription: (_platformName, intentName) =>
        `The same ${intentName.toLowerCase()} query pattern often appears across multiple agents, so comparison links help users evaluate pages without leaving the site.`,
      faqTitle: (platformName) => `${platformName} pants FAQ`,
      faqItems: (siteName, platformName) => [
        {
          question: `Why make a separate ${platformName} pants page?`,
          answer:
            `${siteName} separates pants, trousers and cargo-style demand because users with a clear bottoms intent usually want a faster path into category pages and products.`,
        },
        {
          question: `Does this page also cover cargos and trousers?`,
          answer:
            `Yes. It is meant to serve broad pants-led discovery, including adjacent bottoms terms like trousers and cargo pants.`,
        },
        {
          question: `Should I begin here or on the main ${platformName} page?`,
          answer:
            `Begin here if you already know you want pants or bottoms. Use the main ${platformName} guide for broader browsing first.`,
        },
      ],
    },
    accessories: {
      heroDescription: (platformName, siteName) =>
        `Browse ${platformName} accessories finds on ${siteName}. This page is built for accessory-led browsing where users want a tighter entry into smaller add-on categories instead of a broad platform overview.`,
      cards: (platformName) => [
        {
          title: 'Catch broad accessory demand cleanly',
          description: `${platformName} accessories traffic often sits between fashion browsing and specific product intent, so it benefits from a focused but flexible landing.`,
        },
        {
          title: 'Connect adjacent small-goods searches',
          description: 'This page keeps accessory, jewelry and add-on style queries together so users do not have to restart from neighboring terms.',
        },
        {
          title: 'Make mixed-intent browsing useful',
          description: 'Accessory shoppers usually compare multiple product types in one session, which makes internal topic depth especially important.',
        },
      ],
      searchAnglesTitle: 'Accessory search angles',
      searchAnglesDescription: (platformName) =>
        `${platformName} accessories traffic often combines spreadsheet, links, yupoo and jewelry-adjacent modifiers. This page turns those patterns into one cleaner browsing path.`,
      nextClickTitle: 'Best next click for accessory intent',
      nextClickDescription: () =>
        'Move visitors into the closest accessories-led category early, then let visible products and related topic links guide narrower decisions.',
      productsTitle: (platformName) => `Popular accessories finds for ${platformName}`,
      productsDescription: () =>
        'Accessory pages work best when they expose a wide enough product spread quickly, because users often arrive ready to compare multiple subtypes.',
      compareTitle: (intentName) => `Compare ${intentName.toLowerCase()} guides across agents`,
      compareDescription: (_platformName, intentName) =>
        `${intentName} searches often overlap across multiple agents, so cross-linking these pages helps users compare pages without leaving the site.`,
      faqTitle: (platformName) => `${platformName} accessories FAQ`,
      faqItems: (siteName, platformName) => [
        {
          question: `Why does ${siteName} have a separate ${platformName} accessories page?`,
          answer:
            `Because accessories demand is broad but still category-led. A dedicated page helps users move faster into relevant add-on products than a general platform landing can.`,
        },
        {
          question: `Does this page overlap with jewelry or watches?`,
          answer:
            `Yes, partly. It is designed as the broader accessory entry point, while narrower pages like jewelry or watches serve more specific search intent.`,
        },
        {
          question: `When should I start here instead of the main ${platformName} page?`,
          answer:
            `Start here if you already know you want accessories or adjacent small goods. Use the main ${platformName} guide when you still want a wider category overview.`,
        },
      ],
    },
    shirts: {
      heroDescription: (platformName, siteName) =>
        `Browse ${platformName} shirts finds on ${siteName}. This page is designed for shirt, tee and top-led searches that need a shorter path into upper-body apparel browsing.`,
      cards: (platformName) => [
        {
          title: 'Capture broad topwear demand',
          description: `${platformName} shirt traffic often includes tees, tops and casual basics, so a focused page can absorb that volume better than a generic platform guide.`,
        },
        {
          title: 'Keep shirts, tees and tops connected',
          description: 'This page groups the common upper-body modifiers together so users browse one clearer path instead of fragmenting across near-duplicate searches.',
        },
        {
          title: 'Reduce time to first product click',
          description: 'Topwear shoppers usually know the clothing zone they want, which means they respond better to fast product exposure than to more platform context.',
        },
      ],
      searchAnglesTitle: 'Shirt search angles',
      searchAnglesDescription: (platformName) =>
        `${platformName} shirt traffic often includes tee, tops, spreadsheet, yupoo and taobao modifiers. This page keeps those variants focused on one apparel page.`,
      nextClickTitle: 'Best next click for shirt intent',
      nextClickDescription: () =>
        'Guide visitors into shirt or tops-led categories early, then use product cards and adjacent platform links to narrow the session further.',
      productsTitle: (platformName) => `Popular shirt finds for ${platformName}`,
      productsDescription: () =>
        'Shirt pages perform better when they quickly show product options, because the user usually arrives with a fairly clear apparel goal.',
      compareTitle: (intentName) => `Compare ${intentName.toLowerCase()} guides across agents`,
      compareDescription: (_platformName, intentName) =>
        `${intentName} demand repeats across agents, so these internal links make comparison easier without sending users back to search.`,
      faqTitle: (platformName) => `${platformName} shirts FAQ`,
      faqItems: (siteName, platformName) => [
        {
          question: `Why make a separate ${platformName} shirts page?`,
          answer:
            `${siteName} splits shirts, tees and tops into their own page because users with a clear topwear intent usually want a faster path into products and categories.`,
        },
        {
          question: `Does this page also cover tees and tops?`,
          answer:
            `Yes. It is designed to cover broad shirt-led discovery, including tees, tops and other closely related upper-body searches.`,
        },
        {
          question: `Should I start here or on the main ${platformName} page?`,
          answer:
            `Start here if you already know you want shirts or tops. Use the main ${platformName} guide if you still need a broader entry point.`,
        },
      ],
    },
    jewelry: {
      heroDescription: (platformName, siteName) =>
        `Browse ${platformName} jewelry finds on ${siteName}. This page is tuned for necklaces, bracelets, earrings and broader jewelry browsing so users can evaluate smaller accessory items faster.`,
      cards: (platformName) => [
        {
          title: 'Serve comparison-heavy small-item demand',
          description: `${platformName} jewelry traffic is often image-led and detail-sensitive, which makes a focused page more useful than a broad platform overview.`,
        },
        {
          title: 'Group necklaces, bracelets and earrings',
          description: 'The page keeps the main jewelry modifiers together so users can move across adjacent product types without restarting the search.',
        },
        {
          title: 'Support browsing before checkout',
          description: 'Jewelry users often want to compare several small products in one session, so deeper internal linking is especially useful here.',
        },
      ],
      searchAnglesTitle: 'Jewelry search angles',
      searchAnglesDescription: (platformName) =>
        `${platformName} jewelry traffic commonly mixes spreadsheet, accessory, yupoo and taobao modifiers. This page keeps that behavior centered on jewelry discovery.`,
      nextClickTitle: 'Best next click for jewelry intent',
      nextClickDescription: () =>
        'Move visitors into jewelry or accessories-led categories quickly, then let visible products and cross-agent links support comparison.',
      productsTitle: (platformName) => `Popular jewelry finds for ${platformName}`,
      productsDescription: () =>
        'Jewelry pages work best when the first screen shows immediately comparable products instead of staying mostly informational.',
      compareTitle: (intentName) => `Compare ${intentName.toLowerCase()} guides across agents`,
      compareDescription: (_platformName, intentName) =>
        `${intentName} shoppers often compare similar pages across several agents before they click out, so internal comparison links matter here.`,
      faqTitle: (platformName) => `${platformName} jewelry FAQ`,
      faqItems: (siteName, platformName) => [
        {
          question: `Why does ${siteName} have a dedicated ${platformName} jewelry page?`,
          answer:
            `Because jewelry demand is narrower and more comparison-driven than a generic platform search. A dedicated page gives users a faster path into the most relevant products.`,
        },
        {
          question: `Does this page cover necklaces and bracelets too?`,
          answer:
            `Yes. It is designed as a broader jewelry entry point that includes necklaces, bracelets, earrings and nearby accessory searches.`,
        },
        {
          question: `When should I use this page instead of the main ${platformName} guide?`,
          answer:
            `Use this page when you already know you want jewelry or small accessories. Use the main ${platformName} guide when you still want a wider category overview.`,
        },
      ],
    },
    sweaters: {
      heroDescription: (platformName, siteName) =>
        `Browse ${platformName} sweaters finds on ${siteName}. This page is built for sweater and cardigan-led searches that need a tighter path into knitwear browsing.`,
      cards: (platformName) => [
        {
          title: 'Catch knitwear-specific demand',
          description: `${platformName} sweater searches usually carry more category intent than broad apparel browsing, which makes them a strong fit for a dedicated page.`,
        },
        {
          title: 'Keep sweaters and cardigans together',
          description: 'This page groups the most common knitwear modifiers so users can move between related terms without fragmenting the session.',
        },
        {
          title: 'Shift faster from search to inventory',
          description: 'Knitwear shoppers often want to compare silhouettes and product density quickly, not read through another platform explainer.',
        },
      ],
      searchAnglesTitle: 'Sweater search angles',
      searchAnglesDescription: (platformName) =>
        `${platformName} sweater traffic often appears with cardigan, spreadsheet, yupoo and taobao modifiers. This page keeps those searches focused on one knitwear path.`,
      nextClickTitle: 'Best next click for sweater intent',
      nextClickDescription: () =>
        'Guide visitors into sweater, cardigan or related tops-led categories quickly, then let visible products handle the next filtering step.',
      productsTitle: (platformName) => `Popular sweater finds for ${platformName}`,
      productsDescription: () =>
        'Sweater pages work better when they surface product variety fast, because users usually arrive with a narrower seasonal or style goal.',
      compareTitle: (intentName) => `Compare ${intentName.toLowerCase()} guides across agents`,
      compareDescription: (_platformName, intentName) =>
        `${intentName} demand often repeats across agents, and these internal links help users compare pages without breaking the session.`,
      faqTitle: (platformName) => `${platformName} sweaters FAQ`,
      faqItems: (siteName, platformName) => [
        {
          question: `Why make a separate ${platformName} sweaters page?`,
          answer:
            `${siteName} separates sweaters and cardigans because knitwear demand usually deserves a narrower path than a broad platform page can offer.`,
        },
        {
          question: `Does this page also cover cardigans?`,
          answer:
            `Yes. It is designed to cover sweaters, cardigans and closely related knitwear searches in one place.`,
        },
        {
          question: `Should I start here or on the main ${platformName} guide?`,
          answer:
            `Start here if you already know you want knitwear. Use the main ${platformName} guide if you still need a broader browsing entry point.`,
        },
      ],
    },
  },
  zh: {
    shoes: {
      heroDescription: (platformName, siteName) =>
        `在 ${siteName} 浏览 ${platformName} shoes 精选。这个页面会把鞋类和 sneakers 相关搜索集中起来，让你更快开始看鞋类商品。`,
      cards: (platformName) => [
        {
          title: '优先承接鞋类高需求流量',
          description: `${platformName} shoes 相关搜索通常会和 spreadsheet、yupoo、links 一起出现，这个页面会先把这类搜索集中起来。`,
        },
        {
          title: '同时覆盖 shoes 和 sneakers',
          description: '页面把广义鞋类和 sneaker 搜索放在一起，避免你在相近词之间来回切换。',
        },
        {
          title: '更快进入商品密集区',
          description: '鞋类本身就是商品量最深的类目之一，比单纯平台总页更适合直接承接长尾搜索。',
        },
      ],
      searchAnglesTitle: '鞋类常见搜索路径',
      searchAnglesDescription: () =>
        '鞋类搜索经常和 spreadsheet、yupoo、links、taobao 等词一起出现，这个页面会把这些入口集中到鞋类内容里。',
      nextClickTitle: '鞋类意图的最佳下一步',
      nextClickDescription: () =>
        '尽量把用户尽快送到最匹配的鞋类分类页，再通过商品卡片和品牌信号承接浏览。',
      productsTitle: (platformName) => `${platformName} 热门鞋类精选`,
      productsDescription: () =>
        '鞋类页面更适合直接展示商品，而不是只停留在说明层。',
      compareTitle: (intentName) => `比较不同平台的 ${intentName} 指南`,
      compareDescription: (_platformName, intentName) =>
        `同一个 ${intentName} 搜索往往会跨多个平台出现。把这些页面互相打通，更方便站内比较。`,
      faqTitle: (platformName) => `${platformName} shoes 常见问题`,
      faqItems: (siteName, platformName) => [
        {
          question: `为什么 ${siteName} 要单独做 ${platformName} shoes 页面？`,
          answer:
            `因为鞋类和 sneakers 是 ${platformName} 相关搜索里最强的一组长尾需求，独立页面比平台总页更容易精准承接。`,
        },
        {
          question: `这个页面只适合 sneaker 吗？`,
          answer:
            `不是。它会同时覆盖通用 shoes 搜索和更偏 sneaker 的流量，然后把用户导向更合适的商品和分类路径。`,
        },
        {
          question: `我应该先看这个页面还是先看 ${platformName} 总页？`,
          answer:
            `如果你已经确定要找鞋类，就先看这里；如果还在泛浏览阶段，先看 ${platformName} 总页会更合适。`,
        },
      ],
    },
    jackets: {
      heroDescription: (platformName, siteName) =>
        `在 ${siteName} 浏览 ${platformName} jackets 精选。这个页面专门承接外套、夹克、puffer 等搜索，让用户更快进入外套类商品路径。`,
      cards: (platformName) => [
        {
          title: '优先接住外套类搜索',
          description: `${platformName} jackets 流量通常更偏季节性和强比较意图，也更接近下单。`,
        },
        {
          title: '把 jackets / coats / puffers 放在一起处理',
          description: '页面会把这一组相近意图集中承接，减少用户重新搜索的成本。',
        },
        {
          title: '缩短从搜索到商品的距离',
          description: '外套类用户往往想直接进入分类和商品，而不是再看一层泛平台介绍。',
        },
      ],
      searchAnglesTitle: '外套类常见搜索路径',
      searchAnglesDescription: () =>
        '外套流量通常会和 spreadsheet、taobao、yupoo 以及季节性比较词一起出现。',
      nextClickTitle: '外套意图的最佳下一步',
      nextClickDescription: () =>
        '尽快引导到 jackets 分类，再让商品卡和品牌卡完成后续浏览承接。',
      productsTitle: (platformName) => `${platformName} 热门外套精选`,
      productsDescription: () =>
        '外套类页面更适合把类目聚焦和热门商品展示一起做出来。',
      compareTitle: (intentName) => `比较不同平台的 ${intentName} 指南`,
      compareDescription: () =>
        `很多用户会横向比较不同平台的外套类入口，把这些页面互链起来更利于站内停留和主题聚合。`,
      faqTitle: (platformName) => `${platformName} jackets 常见问题`,
      faqItems: (siteName, platformName) => [
        {
          question: `${platformName} jackets 页面主要解决什么问题？`,
          answer:
            `${siteName} 把 jacket、coat、puffer 这组外套相关搜索集中到一个页面，方便 ${platformName} 用户更快开始找货。`,
        },
        {
          question: `这个页面只适合冬季外套吗？`,
          answer:
            `不是。它覆盖的是更广义的 outerwear 需求，只是 puffer 和 coat 通常会占比较大。`,
        },
        {
          question: `为什么不把 jackets 只放在平台总页里？`,
          answer:
            `因为用户如果已经有明确类目意图，独立的 category-intent 页面通常比总页更容易满足搜索需求。`,
        },
      ],
    },
    bags: {
      heroDescription: (platformName, siteName) =>
        `在 ${siteName} 浏览 ${platformName} bags 精选。这个页面会把包袋、handbag、backpack 一类搜索集中起来，让你更快开始看配件和包袋商品。`,
      cards: (platformName) => [
        {
          title: '优先承接包袋类需求',
          description: `${platformName} bags 搜索通常已经带有比较明确的类目意图，不需要再看一层泛平台解释。`,
        },
        {
          title: '把 bags / handbags / backpacks 放在一起',
          description: '页面会把常见包袋搜索词放在一起，减少你在相近词之间反复搜索。',
        },
        {
          title: '更适合视觉型浏览',
          description: '包袋本身就是强图片驱动的类目，用商品优先的方式承接通常比纯说明页更有效。',
        },
      ],
      searchAnglesTitle: '包袋类常见搜索路径',
      searchAnglesDescription: (platformName) =>
        `${platformName} bag 搜索通常会和 spreadsheet、handbag、backpack、yupoo 等词组合出现，这个页面会把这些入口收束到同一个包袋页面里。`,
      nextClickTitle: '包袋意图的最佳下一步',
      nextClickDescription: () =>
        '尽量尽快把用户导向最匹配的包袋分类，再通过商品图和款式差异承接继续浏览。',
      productsTitle: (platformName) => `${platformName} 热门包袋精选`,
      productsDescription: () =>
        '包袋页更适合尽快展示商品差异，而不是再让用户回到泛平台入口。',
      compareTitle: (intentName) => `比较不同平台的 ${intentName} 指南`,
      compareDescription: () =>
        `包袋类用户经常会比较多个平台的同类页面，站内互链可以把这种比较需求留在站内。`,
      faqTitle: (platformName) => `${platformName} bags 常见问题`,
      faqItems: (siteName, platformName) => [
        {
          question: `为什么 ${siteName} 要单独做 ${platformName} bags 页面？`,
          answer:
            `因为包袋类需求和泛平台浏览不同，用户通常更希望直接进入 handbag、backpack 这类更明确的商品路径。`,
        },
        {
          question: `这个页面只覆盖女包吗？`,
          answer:
            `不是。它用于承接更广义的 bag 相关搜索，包括 handbag、backpack 以及其他常见包袋需求。`,
        },
        {
          question: `什么时候应该先看这个页面？`,
          answer:
            `如果你已经确定想找包袋或配件，就可以先看这里；如果还在泛浏览阶段，先看 ${platformName} 总页更合适。`,
        },
      ],
    },
    hoodies: {
      heroDescription: (platformName, siteName) =>
        `在 ${siteName} 浏览 ${platformName} hoodies 精选。这个页面会把 hoodie 和 sweatshirt 类搜索集中起来，让你更快进入休闲上装浏览。`,
      cards: (platformName) => [
        {
          title: '优先接住休闲上装流量',
          description: `${platformName} hoodies 搜索覆盖面广、复用性强，而且天然更偏商品浏览。`,
        },
        {
          title: '把 hoodies 和 sweatshirts 统一处理',
          description: '页面会把 hoodie 和 sweatshirt 这组接近搜索放在一起，减少二次搜索成本。',
        },
        {
          title: '更快把搜索变成商品点击',
          description: 'hoodie 类用户通常不想看太多平台介绍，更想尽快开始比较商品。',
        },
      ],
      searchAnglesTitle: 'hoodie 类常见搜索路径',
      searchAnglesDescription: (platformName) =>
        `${platformName} hoodie 搜索经常和 spreadsheet、yupoo、links、sweatshirt 等词一起出现，这个页面会把这些入口集中到一个上装页面。`,
      nextClickTitle: 'hoodie 意图的最佳下一步',
      nextClickDescription: () =>
        '尽量尽快引导到 hoodie 或 sweatshirt 分类，再通过商品卡片和品牌信号承接后续浏览。',
      productsTitle: (platformName) => `${platformName} 热门 hoodie 精选`,
      productsDescription: () =>
        'hoodie 页面更适合在首屏就给出可比较的商品选择，而不是只停留在信息性说明。',
      compareTitle: (intentName) => `比较不同平台的 ${intentName} 指南`,
      compareDescription: (_platformName, intentName) =>
        `同样的 ${intentName} 搜索会在多个平台上重复出现，站内比较链接可以减少你回搜索引擎的概率。`,
      faqTitle: (platformName) => `${platformName} hoodies 常见问题`,
      faqItems: (siteName, platformName) => [
        {
          question: `为什么要单独做 ${platformName} hoodies 页面？`,
          answer:
            `${siteName} 把 hoodie 和 sweatshirt 需求独立出来，是因为这类用户通常已经有明确上装意图，适合更短的找货路径。`,
        },
        {
          question: `这个页面只适合 oversize hoodie 吗？`,
          answer:
            `不是。它承接的是更广义的 hoodie 和 sweatshirt 搜索，而不是某一种版型。`,
        },
        {
          question: `我应该先看这里还是平台总页？`,
          answer:
            `如果你已经确定想看 hoodies，就先看这里；如果还需要比较更多类目，先从 ${platformName} 总页开始更合适。`,
        },
      ],
    },
    watches: {
      heroDescription: (platformName, siteName) =>
        `在 ${siteName} 浏览 ${platformName} watches 精选。这个页面会把 watch 和 accessories 相关搜索集中起来，让你更快进入手表和配件浏览。`,
      cards: (platformName) => [
        {
          title: '承接高比较型配件流量',
          description: `${platformName} watches 搜索通常比普通浏览更偏比较和筛选，所以更需要一个聚焦的主题页。`,
        },
        {
          title: '把 watches 和 accessories 意图衔接起来',
          description: '很多手表搜索会和 broader accessories 浏览重叠，这个页面会把两者连接起来但保持手表优先。',
        },
        {
          title: '把评估过程留在站内',
          description: '手表类用户经常会横向比较多个页面，这里的比较区块尤其重要。',
        },
      ],
      searchAnglesTitle: '手表类常见搜索路径',
      searchAnglesDescription: (platformName) =>
        `${platformName} watch 搜索经常和 spreadsheet、links、taobao、accessories 等词一起出现，这个页面会把这些入口集中到手表页面下。`,
      nextClickTitle: '手表意图的最佳下一步',
      nextClickDescription: () =>
        '优先把用户送到最接近的 watches 或 accessories 分类，再通过商品卡片和平台比较完成后续承接。',
      productsTitle: (platformName) => `${platformName} 热门手表精选`,
      productsDescription: () =>
        '手表类页面更适合把聚焦入口和商品比较一起做出来，而不是继续停留在泛介绍层。',
      compareTitle: (intentName) => `比较不同平台的 ${intentName} 指南`,
      compareDescription: () =>
        `手表类用户经常会比较多个平台的同类页面，站内互链可以把比较过程尽量留在站内。`,
      faqTitle: (platformName) => `${platformName} watches 常见问题`,
      faqItems: (siteName, platformName) => [
        {
          question: `为什么 ${siteName} 会单独做 ${platformName} watches 页面？`,
          answer:
            `因为手表类需求通常比泛平台落地页更需要聚焦的比较和筛选路径，独立页面更容易承接这类搜索。`,
        },
        {
          question: `这个页面只适合高端表款吗？`,
          answer:
            `不是。它用于承接更广义的 watch 搜索，不限定具体风格或价位。`,
        },
        {
          question: `我应该先看 watches 页还是平台总页？`,
          answer:
            `如果你已经确定想找手表或相关配件，就先看这里；如果还在看更广的类目，就先看 ${platformName} 总页。`,
        },
      ],
    },
    pants: {
      heroDescription: (platformName, siteName) =>
        `在 ${siteName} 浏览 ${platformName} pants 精选。这个页面会把 trousers、cargo pants、bottoms 一类搜索集中起来，让你更快进入下装商品浏览。`,
      cards: (platformName) => [
        {
          title: '直接承接下装类意图',
          description: `${platformName} pants 搜索通常已经带有更清晰的购买方向，比泛平台浏览更适合落在独立页面。`,
        },
        {
          title: '把 pants / trousers / cargos 合并处理',
          description: '页面会把常见下装搜索词放在一起，减少你在相近类目词之间跳转。',
        },
        {
          title: '更快推进到分类和商品',
          description: '下装类需求更适合快速展示分类和商品，而不是再看一层通用平台介绍。',
        },
      ],
      searchAnglesTitle: '下装类常见搜索路径',
      searchAnglesDescription: (platformName) =>
        `${platformName} pants 搜索经常会和 spreadsheet、trousers、cargo、yupoo、taobao 等词组合出现，这个页面会把这些词统一集中到一个下装页面。`,
      nextClickTitle: '下装意图的最佳下一步',
      nextClickDescription: () =>
        '尽量尽快把用户引导到 pants 或 bottoms 分类，再让商品卡片和相邻平台页继续做筛选承接。',
      productsTitle: (platformName) => `${platformName} 热门下装精选`,
      productsDescription: () =>
        '下装页更适合先给出商品选择，因为这类用户通常已经带着明确的类目目标进来。',
      compareTitle: (intentName) => `比较不同平台的 ${intentName} 指南`,
      compareDescription: (_platformName, intentName) =>
        `同一个 ${intentName} 搜索模式会在多个平台上重复出现，站内比较链接可以帮助你更快比较差异。`,
      faqTitle: (platformName) => `${platformName} pants 常见问题`,
      faqItems: (siteName, platformName) => [
        {
          question: `为什么要单独做 ${platformName} pants 页面？`,
          answer:
            `${siteName} 把 pants、trousers、cargo pants 这组下装需求拆出来，是因为明确类目流量更适合更短的商品发现路径。`,
        },
        {
          question: `这个页面也覆盖 cargo 和 trousers 吗？`,
          answer:
            `会。它用于承接更广义的 pants 搜索，同时覆盖 trousers 和 cargo pants 等相近词。`,
        },
        {
          question: `什么时候应该先看这个页面？`,
          answer:
            `如果你已经确定想找 pants 或 bottoms，就先看这里；如果还想先比较更多类目，再从 ${platformName} 总页开始。`,
        },
      ],
    },
    accessories: {
      heroDescription: (platformName, siteName) =>
        `在 ${siteName} 浏览 ${platformName} accessories 精选。这个页面会把配件类搜索集中起来，让你不用先经过泛平台介绍，就能更快开始看小件商品。`,
      cards: (platformName) => [
        {
          title: '更干净地承接配件流量',
          description: `${platformName} accessories 搜索通常介于泛浏览和明确商品意图之间，更适合用聚焦但不死板的页面来集中展示。`,
        },
        {
          title: '把相邻小件搜索收在一起',
          description: '页面会把 accessories、jewelry 以及其他相邻配件搜索放在一起，减少重新搜索。',
        },
        {
          title: '更适合混合型浏览',
          description: '配件类用户经常会在一次会话里看多个小类，所以站内主题深度在这里尤其重要。',
        },
      ],
      searchAnglesTitle: '配件类常见搜索路径',
      searchAnglesDescription: (platformName) =>
        `${platformName} accessories 流量经常和 spreadsheet、links、yupoo、jewelry 等词组合出现，这个页面会把这些搜索行为收束成一条更清晰的浏览路径。`,
      nextClickTitle: '配件意图的最佳下一步',
      nextClickDescription: () =>
        '尽快把用户送到最匹配的 accessories 分类，再通过商品卡片和相关专题链接把选择继续缩窄。',
      productsTitle: (platformName) => `${platformName} 热门配件精选`,
      productsDescription: () =>
        '配件页更适合尽快展示足够宽的商品范围，因为用户通常会同时比较多个小类。',
      compareTitle: (intentName) => `比较不同平台的 ${intentName} 指南`,
      compareDescription: (_platformName, intentName) =>
        `${intentName} 搜索通常会在多个平台上重复出现，站内互链可以让你在站内完成比较。`,
      faqTitle: (platformName) => `${platformName} accessories 常见问题`,
      faqItems: (siteName, platformName) => [
        {
          question: `为什么 ${siteName} 要单独做 ${platformName} accessories 页面？`,
          answer:
            `因为配件类需求虽然宽，但仍然是明确类目流量，独立页面比泛平台总页更容易把用户送进合适的小件商品路径。`,
        },
        {
          question: `这个页面会和 jewelry、watches 重叠吗？`,
          answer:
            `会有一部分重叠。它更像是广义配件入口，而 jewelry、watches 则服务更明确的细分搜索意图。`,
        },
        {
          question: `什么时候应该先看这个页面？`,
          answer:
            `如果你已经知道自己想看配件或相关小件商品，就先看这里；如果还在泛浏览阶段，先看 ${platformName} 总页更合适。`,
        },
      ],
    },
    shirts: {
      heroDescription: (platformName, siteName) =>
        `在 ${siteName} 浏览 ${platformName} shirts 精选。这个页面重点承接 shirts、tees、tops 一类搜索，让用户更快进入上装商品路径。`,
      cards: (platformName) => [
        {
          title: '承接广义上装需求',
          description: `${platformName} shirts 流量经常覆盖 tees、tops 和基础款上装，所以更适合落在独立的专题页。`,
        },
        {
          title: '把 shirts / tees / tops 连在一起',
          description: '页面会把常见上装修饰词统一承接，避免用户被拆散到多个相近搜索里。',
        },
        {
          title: '更快进入首个商品点击',
          description: '上装类用户通常已经知道自己想看的服装区间，所以商品优先比平台说明更重要。',
        },
      ],
      searchAnglesTitle: '上装类常见搜索路径',
      searchAnglesDescription: (platformName) =>
        `${platformName} shirts 流量通常会和 tee、tops、spreadsheet、yupoo、taobao 等词一起出现，这个页面会把这些路径集中到一个上装主题里。`,
      nextClickTitle: '上装意图的最佳下一步',
      nextClickDescription: () =>
        '尽快引导到 shirts 或 tops 分类，再通过商品卡片和相邻平台页继续缩小选择范围。',
      productsTitle: (platformName) => `${platformName} 热门上装精选`,
      productsDescription: () =>
        'shirts 页面更适合先给出商品选择，因为这类用户通常已经有较明确的服装目标。',
      compareTitle: (intentName) => `比较不同平台的 ${intentName} 指南`,
      compareDescription: (_platformName, intentName) =>
        `${intentName} 需求会在多个平台上重复出现，站内比较链接可以减少用户回搜索引擎的概率。`,
      faqTitle: (platformName) => `${platformName} shirts 常见问题`,
      faqItems: (siteName, platformName) => [
        {
          question: `为什么要单独做 ${platformName} shirts 页面？`,
          answer:
            `${siteName} 把 shirts、tees、tops 拆成独立专题，是因为这类明确上装意图更适合更短的商品发现路径。`,
        },
        {
          question: `这个页面也覆盖 tees 和 tops 吗？`,
          answer:
            `会。它用于承接更广义的 shirts 搜索，同时覆盖 tees、tops 等相近词。`,
        },
        {
          question: `我应该先看这里还是平台总页？`,
          answer:
            `如果你已经确定想看 shirts 或 tops，就先看这里；如果还想先泛浏览，再从 ${platformName} 总页开始。`,
        },
      ],
    },
    jewelry: {
      heroDescription: (platformName, siteName) =>
        `在 ${siteName} 浏览 ${platformName} jewelry 精选。这个页面会把 necklaces、bracelets、earrings 以及更广义的 jewelry 搜索集中起来，让你更快进入小件配饰浏览。`,
      cards: (platformName) => [
        {
          title: '承接更高比较度的小件需求',
          description: `${platformName} jewelry 搜索通常更依赖图片和细节比较，所以聚焦的页面比泛平台介绍更有效。`,
        },
        {
          title: '把 necklaces / bracelets / earrings 放在一起',
          description: '页面会把主要珠宝类修饰词集中承接，方便用户在相邻小类之间连续浏览。',
        },
        {
          title: '支持先比较再跳转',
          description: 'jewelry 用户经常会在一次会话里比较多件小商品，所以更深的站内互链在这里很有价值。',
        },
      ],
      searchAnglesTitle: '珠宝配饰常见搜索路径',
      searchAnglesDescription: (platformName) =>
        `${platformName} jewelry 流量经常和 spreadsheet、accessories、yupoo、taobao 等词一起出现，这个页面会把这些搜索行为聚焦到 jewelry 主题下。`,
      nextClickTitle: '珠宝配饰意图的最佳下一步',
      nextClickDescription: () =>
        '优先把用户送到 jewelry 或 accessories 分类，再通过商品卡片和跨平台比较帮助继续筛选。',
      productsTitle: (platformName) => `${platformName} 热门 jewelry 精选`,
      productsDescription: () =>
        'jewelry 页面更适合在首屏就展示可直接比较的商品，而不是停留在解释层。',
      compareTitle: (intentName) => `比较不同平台的 ${intentName} 指南`,
      compareDescription: (_platformName, intentName) =>
        `${intentName} 用户通常会在多个平台之间比较相似页面，所以这里的站内比较链接尤其重要。`,
      faqTitle: (platformName) => `${platformName} jewelry 常见问题`,
      faqItems: (siteName, platformName) => [
        {
          question: `为什么 ${siteName} 会单独做 ${platformName} jewelry 页面？`,
          answer:
            `因为 jewelry 需求通常比泛平台搜索更窄、比较属性更强，独立页面更适合把用户快速送到最相关的商品。`,
        },
        {
          question: `这个页面也覆盖 necklaces 和 bracelets 吗？`,
          answer:
            `会。它就是作为更广义的 jewelry 入口，同时承接 necklaces、bracelets、earrings 等相近搜索。`,
        },
        {
          question: `什么时候应该先看这个页面？`,
          answer:
            `如果你已经确定想找 jewelry 或小件配饰，就先看这里；如果还在比较更广的类目，就先看 ${platformName} 总页。`,
        },
      ],
    },
    sweaters: {
      heroDescription: (platformName, siteName) =>
        `在 ${siteName} 浏览 ${platformName} sweaters 精选。这个页面会把 sweaters 和 cardigans 一类搜索集中起来，让你更快进入针织上装浏览。`,
      cards: (platformName) => [
        {
          title: '承接更明确的针织需求',
          description: `${platformName} sweaters 搜索通常比泛服装浏览更有类目方向，所以很适合独立页面。`,
        },
        {
          title: '把 sweaters 和 cardigans 放在一起',
          description: '页面会把常见针织修饰词统一处理，避免用户在相邻词之间来回跳转。',
        },
        {
          title: '更快把搜索推进到商品层',
          description: '针织类用户通常更想快速比较款型和商品密度，而不是再看一层平台说明。',
        },
      ],
      searchAnglesTitle: '针织类常见搜索路径',
      searchAnglesDescription: (platformName) =>
        `${platformName} sweaters 流量通常会和 cardigan、spreadsheet、yupoo、taobao 等词组合出现，这个页面会把这些路径统一承接到 knitwear 主题。`,
      nextClickTitle: '针织意图的最佳下一步',
      nextClickDescription: () =>
        '尽快引导到 sweaters、cardigans 或相关 tops 分类，再让商品卡片继续完成筛选。',
      productsTitle: (platformName) => `${platformName} 热门针织精选`,
      productsDescription: () =>
        'sweaters 页面更适合快速展示商品差异，因为用户通常已经带着较明确的季节或风格目标进入。',
      compareTitle: (intentName) => `比较不同平台的 ${intentName} 指南`,
      compareDescription: (_platformName, intentName) =>
        `${intentName} 搜索经常在多个平台上重复出现，站内比较链接可以让你更快完成比较。`,
      faqTitle: (platformName) => `${platformName} sweaters 常见问题`,
      faqItems: (siteName, platformName) => [
        {
          question: `为什么要单独做 ${platformName} sweaters 页面？`,
          answer:
            `${siteName} 把 sweaters 和 cardigans 拆出来，是因为针织类需求通常更适合比平台总页更窄的商品发现路径。`,
        },
        {
          question: `这个页面也覆盖 cardigans 吗？`,
          answer:
            `会。它用于承接更广义的 sweaters 搜索，同时覆盖 cardigans 和其他相近 knitwear 词。`,
        },
        {
          question: `我应该先看这个页面还是平台总页？`,
          answer:
            `如果你已经确定想看针织类商品，就先看这里；如果还在泛浏览阶段，先看 ${platformName} 总页更合适。`,
        },
      ],
    },
  },
} as const;

export const PLATFORM_LANDING_INTENTS: readonly PlatformLandingIntentConfig[] = [
  {
    slug: 'shoes',
    name: 'Shoes',
    query: 'shoes',
    alternateQueries: ['sneakers'],
    categoryMatches: ['shoes', 'shoe', 'sneakers', 'sneaker', 'footwear'],
  },
  {
    slug: 'jackets',
    name: 'Jackets',
    query: 'jackets',
    alternateQueries: ['jacken', 'outerwear'],
    categoryMatches: ['jackets', 'jacket', 'outerwear', 'coats', 'coat'],
  },
  {
    slug: 'bags',
    name: 'Bags',
    query: 'bags',
    alternateQueries: ['bag', 'handbags'],
    categoryMatches: ['bags', 'bag', 'handbags', 'backpacks', 'backpack'],
  },
  {
    slug: 'accessories',
    name: 'Accessories',
    query: 'accessories',
    alternateQueries: ['accessory'],
    categoryMatches: ['accessories', 'accessory', 'jewelry'],
  },
  {
    slug: 'hoodies',
    name: 'Hoodies',
    query: 'hoodies',
    alternateQueries: ['hoodie'],
    categoryMatches: ['hoodies', 'hoodie', 'sweatshirts', 'sweatshirt'],
  },
  {
    slug: 'sneakers',
    name: 'Sneakers',
    query: 'sneakers',
    alternateQueries: ['sneaker'],
    categoryMatches: ['sneakers', 'sneaker', 'shoes', 'shoe', 'footwear'],
  },
  {
    slug: 'shirts',
    name: 'Shirts',
    query: 'shirts',
    alternateQueries: ['shirt', 't shirts', 't shirt', 'tees'],
    categoryMatches: ['shirts', 'shirt', 'tops', 'tops', 't-shirts', 'tee'],
  },
  {
    slug: 'jewelry',
    name: 'Jewelry',
    query: 'jewelry',
    alternateQueries: ['necklaces', 'bracelets', 'earrings'],
    categoryMatches: ['jewelry', 'necklace', 'bracelet', 'earrings', 'accessories'],
  },
  {
    slug: 'watches',
    name: 'Watches',
    query: 'watches',
    alternateQueries: ['watch'],
    categoryMatches: ['watches', 'watch', 'accessories', 'jewelry'],
  },
  {
    slug: 'shorts',
    name: 'Shorts',
    query: 'shorts',
    alternateQueries: ['short'],
    categoryMatches: ['shorts', 'short', 'pants', 'bottoms'],
  },
  {
    slug: 'pants',
    name: 'Pants',
    query: 'pants',
    alternateQueries: ['trousers', 'cargo pants'],
    categoryMatches: ['pants', 'trousers', 'bottoms'],
  },
  {
    slug: 'sweaters',
    name: 'Sweaters',
    query: 'sweaters',
    alternateQueries: ['sweater', 'cardigans'],
    categoryMatches: ['sweaters', 'sweater', 'cardigans', 'hoodies', 'tops'],
  },
] as const;

const PLATFORM_LANDING_RELATED_INTENT_SLUGS: Record<string, readonly string[]> = {
  shoes: ['sneakers', 'hoodies', 'pants', 'accessories'],
  jackets: ['hoodies', 'shirts', 'pants', 'sweaters'],
  bags: ['accessories', 'jewelry', 'watches', 'shoes'],
  accessories: ['bags', 'jewelry', 'watches', 'hoodies'],
  hoodies: ['shirts', 'jackets', 'pants', 'sweaters'],
  sneakers: ['shoes', 'hoodies', 'pants', 'accessories'],
  shirts: ['hoodies', 'sweaters', 'jackets', 'pants'],
  jewelry: ['accessories', 'watches', 'bags', 'shirts'],
  watches: ['jewelry', 'accessories', 'bags', 'pants'],
  shorts: ['pants', 'shirts', 'hoodies', 'shoes'],
  pants: ['shorts', 'hoodies', 'shirts', 'jackets'],
  sweaters: ['hoodies', 'shirts', 'jackets', 'pants'],
};

const FEATURED_PLATFORM_LANDING_KEYS = [
  'kakobuy',
  'cnfans',
  'acbuy',
  'superbuy',
  'oopbuy',
  'litbuy',
  'cssbuy',
  'sugargoo',
  'allchinabuy',
  'usfans',
] as const;

const GROWTH_PLATFORM_LANDING_KEYS = [
  'mulebuy',
  'orientdig',
  'joyagoo',
  'loongbuy',
  'lovegobuy',
  'basetao',
  'eastmallbuy',
  'hubbuycn',
  'kameymall',
  'ootdbuy',
  'ezbuycn',
  'parcelup',
  'yoybuy',
  'dupbuy',
] as const;

const PLATFORM_LANDING_DEFINITIONS: readonly PlatformLandingDefinition[] = [
  {
    key: 'kakobuy',
    name: 'Kakobuy',
    alternateQueries: ['kako buy'],
    aliases: [
      'kako',
      'kakabuy',
      'kakbouy',
      'kakobuiy',
      'kakobuyy',
      'kakob',
      'kakoby',
      'kakobut',
      'kakobuz',
      'kakoboy',
      'kakobnuy',
      'kakobuuy',
      'kakbuy',
      'kakobyu',
      'kakoubuy',
    ],
  },
  {
    key: 'cnfans',
    name: 'CNFans',
    alternateQueries: ['cn fans', 'cn fan'],
    aliases: [
      'cnfan',
      'cnfnas',
      'cnfams',
      'cmfans',
      'cnsfans',
      'canfans',
      'cfans',
      'ccnfans',
      'tcnfans',
      'ncnfans',
      'cnfanse',
      'cnfansd',
      'cnfanas',
      'cnfands',
      'cnfanb',
      'cnfanms',
      'cnfasn',
    ],
  },
  {
    key: 'acbuy',
    name: 'ACBuy',
    alternateQueries: ['ac buy'],
    aliases: ['accbuy', 'acebuy', 'acbuiy', 'acbouy', 'acbux', 'acbuuy', 'abcuy', 'acbyu'],
  },
  {
    key: 'superbuy',
    name: 'Superbuy',
    alternateQueries: ['super buy'],
    aliases: [
      'superbay',
      'superby',
      'suberbuy',
      'supderbuy',
      'superbuyy',
      'sueprbuy',
      'supebuy',
      'superbuiy',
      'sduperbuy',
      'surperbuy',
      'superbuuy',
      'superbiy',
    ],
  },
  {
    key: 'oopbuy',
    name: 'Oopbuy',
    alternateQueries: ['oop buy', 'opp buy'],
    aliases: ['oppbuy', 'ooopbuy'],
  },
  { key: 'litbuy', name: 'Litbuy' },
  { key: 'cssbuy', name: 'CSSBuy', alternateQueries: ['css buy'] },
  { key: 'sugargoo', name: 'Sugargoo', alternateQueries: ['sugar goo'] },
  {
    key: 'allchinabuy',
    name: 'AllChinaBuy',
    alternateQueries: ['all china buy'],
  },
  { key: 'usfans', name: 'USFans', alternateQueries: ['us fans'], aliases: ['usfan'] },
  { key: 'loongbuy', name: 'Loongbuy', alternateQueries: ['loong buy'] },
  {
    key: 'lovegobuy',
    name: 'Lovegobuy',
    alternateQueries: ['love go buy'],
  },
  { key: 'joyagoo', name: 'Joyagoo', alternateQueries: ['joya goo'] },
  {
    key: 'orientdig',
    name: 'Orientdig',
    alternateQueries: ['orient dig'],
    aliases: ['orentdig', 'orientdgi', 'orientig', 'orintdig', 'orientdiq'],
  },
  {
    key: 'mulebuy',
    name: 'Mulebuy',
    alternateQueries: ['mule buy'],
    aliases: [
      'mule',
      'muelbuy',
      'mulbuy',
      'mulabuy',
      'mmulebuy',
      'nmulebuy',
      'mulebuyu',
      'muleby',
      'mulebiy',
      'mulebuuy',
      'mulebyu',
    ],
  },
  { key: 'hoobuy', name: 'Hoobuy', alternateQueries: ['hoo buy'] },
  { key: 'basetao', name: 'Basetao', alternateQueries: ['base tao'], aliases: ['baseta0'] },
  {
    key: 'eastmallbuy',
    name: 'Eastmallbuy',
    alternateQueries: ['east mall buy'],
  },
  { key: 'hubbuycn', name: 'Hubbuycn', alternateQueries: ['hub buy cn'], aliases: ['hubbuy'] },
  { key: 'kameymall', name: 'Kameymall', alternateQueries: ['kamey mall'] },
  { key: 'ootdbuy', name: 'OOTDBuy', alternateQueries: ['ootd buy'] },
  { key: 'ezbuycn', name: 'EZBuyCN', alternateQueries: ['ez buy cn'] },
  { key: 'parcelup', name: 'ParcelUp', alternateQueries: ['parcel up'] },
  { key: 'yoybuy', name: 'Yoybuy' },
  { key: 'dupbuy', name: 'Dupbuy' },
  { key: 'lovbuy', name: 'Lovbuy', alternateQueries: ['lov buy'] },
  { key: 'bbdbuy', name: 'BBDBuy', alternateQueries: ['bbd buy'] },
  { key: 'hipobuy', name: 'Hipobuy', alternateQueries: ['hipo buy'] },
  { key: 'itaobuy', name: 'iTaoBuy', alternateQueries: ['itao buy'] },
  { key: 'mycnbox', name: 'MyCNBox', alternateQueries: ['my cn box'] },
  {
    key: 'pantherbuy',
    name: 'Pantherbuy',
    alternateQueries: ['panther buy'],
  },
  { key: 'hacoo', name: 'Hacoo' },
  { key: 'tigbuy', name: 'Tigbuy', alternateQueries: ['tig buy'] },
  { key: 'fishgoo', name: 'Fishgoo', alternateQueries: ['fish goo'] },
  {
    key: 'cnshopper',
    name: 'CNShopper',
    alternateQueries: ['cn shopper'],
  },
  {
    key: 'niuniubox',
    name: 'Niuniubox',
    alternateQueries: ['niuniu box'],
  },
  { key: 'npbuy', name: 'NPBuy', alternateQueries: ['np buy'] },
  { key: 'gtbuy', name: 'GTBuy', alternateQueries: ['gt buy'] },
  { key: 'vigorbuy', name: 'Vigorbuy', alternateQueries: ['vigor buy'] },
  { key: 'rizzitgo', name: 'Rizzitgo', alternateQueries: ['rizzit go'] },
] as const;

function createPlatformLandingConfig(
  definition: PlatformLandingDefinition,
): PlatformLandingConfig {
  return {
    key: definition.key,
    slug: `${definition.key}-spreadsheet`,
    name: definition.name,
    primaryQuery: definition.primaryQuery ?? definition.key,
    alternateQueries: definition.alternateQueries,
    aliases: definition.aliases,
  };
}

export const ALL_PLATFORM_LANDING_PAGES: readonly PlatformLandingConfig[] =
  PLATFORM_LANDING_DEFINITIONS.map(createPlatformLandingConfig);

export const FEATURED_PLATFORM_LANDING_PAGES: readonly PlatformLandingConfig[] =
  FEATURED_PLATFORM_LANDING_KEYS.map((key) =>
    ALL_PLATFORM_LANDING_PAGES.find((page) => page.key === key),
  ).filter((page): page is PlatformLandingConfig => Boolean(page));

export const TOP_PLATFORM_LANDING_PAGES = FEATURED_PLATFORM_LANDING_PAGES;

function slugifyPlatformToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getPlatformSlugCandidates(config: PlatformLandingConfig): string[] {
  const rawTokens = [
    config.key,
    config.primaryQuery,
    ...(config.alternateQueries || []),
    ...(config.aliases || []),
  ];

  const normalizedTokens = rawTokens
    .map(slugifyPlatformToken)
    .filter(Boolean);

  const candidates = normalizedTokens.flatMap((token) => [token, `${token}-spreadsheet`]);

  return [...new Set([config.slug, ...candidates])];
}

export function resolvePlatformLandingSlug(slug: string): string | null {
  const normalizedSlug = slugifyPlatformToken(slug);

  for (const config of ALL_PLATFORM_LANDING_PAGES) {
    if (getPlatformSlugCandidates(config).includes(normalizedSlug)) {
      return config.slug;
    }
  }

  return null;
}

export function getPlatformLandingConfigBySlugLike(slug: string) {
  const canonicalSlug = resolvePlatformLandingSlug(slug);
  return canonicalSlug
    ? ALL_PLATFORM_LANDING_PAGES.find((page) => page.slug === canonicalSlug)
    : undefined;
}

export function getPlatformLandingConfigBySlug(slug: string) {
  return ALL_PLATFORM_LANDING_PAGES.find((page) => page.slug === slug);
}

export function getPlatformLandingConfigByKey(key: string) {
  return ALL_PLATFORM_LANDING_PAGES.find((page) => page.key === key);
}

export function getPlatformLandingQueryVariants(
  config: PlatformLandingConfig,
): string[] {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  const stems = [config.primaryQuery, ...(config.alternateQueries || [])];
  const variants = stems.flatMap((stem) => [
    `${stem} spreadsheet`,
    `${stem} spreadsheets`,
    `${stem} sheet`,
    `${stem} sheets`,
    `${stem} yupoo`,
    `${stem} link`,
    `${stem} links`,
    `${stem} taobao`,
    `${stem} spreadsheet ${currentYear}`,
    `${stem} spreadsheets ${currentYear}`,
    `${stem} spreadsheet ${previousYear}`,
    `${stem} spreadsheets ${previousYear}`,
  ]);

  return [...new Set(variants)];
}

export function getPlatformLandingSeo(
  config: PlatformLandingConfig,
  locale: string = defaultLocale,
) {
  const safeLocale = normalizeLocale(locale);
  const copy = PLATFORM_LANDING_COPY[safeLocale];
  const overrides = getPlatformLandingNarrativeOverrides(config, safeLocale);
  const siteName = getSiteName();
  const title = copy.heroTitle(config.name);
  const description = overrides?.seoDescription(siteName, config.name)
    || copy.seoDescription(siteName, config.name);

  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    keywords: [
      config.name,
      ...getPlatformLandingQueryVariants(config),
      'weidian finds',
      'taobao finds',
      '1688 finds',
      `${config.name} spreadsheet finds`,
    ],
  };
}

export function getPlatformLandingTitle(
  config: PlatformLandingConfig,
  locale: string = defaultLocale,
) {
  return getPlatformLandingPageCopy(locale).heroTitle(config.name);
}

export function getPlatformLandingPageCopy(
  locale: string,
): PlatformLandingPageCopy {
  return PLATFORM_LANDING_COPY[normalizeLocale(locale)];
}

export function getPlatformLandingIntentTitle(
  config: PlatformLandingConfig,
  intent: PlatformLandingIntentConfig,
  locale: string = defaultLocale,
) {
  const safeLocale = normalizeLocale(locale);

  if (safeLocale === 'zh') {
    return `${config.name} ${intent.name} Spreadsheet 精选`;
  }

  if (safeLocale === 'fr') {
    return `Selections ${config.name} ${intent.name} Spreadsheet`;
  }

  if (safeLocale === 'de') {
    return `${config.name} ${intent.name} Spreadsheet-Auswahl`;
  }

  if (safeLocale === 'es') {
    return `Selecciones ${config.name} ${intent.name} Spreadsheet`;
  }

  if (safeLocale === 'it') {
    return `Selezioni ${config.name} ${intent.name} Spreadsheet`;
  }

  if (safeLocale === 'pt') {
    return `Selecoes ${config.name} ${intent.name} Spreadsheet`;
  }

  if (safeLocale === 'ar') {
    return `مختارات ${config.name} ${intent.name} spreadsheet`;
  }

  return `${config.name} ${intent.name} Spreadsheet Finds`;
}

export function getPlatformLandingSegment(
  config: PlatformLandingConfig,
): PlatformLandingSegment {
  if (
    FEATURED_PLATFORM_LANDING_KEYS.includes(
      config.key as (typeof FEATURED_PLATFORM_LANDING_KEYS)[number],
    )
  ) {
    return 'featured';
  }

  if (
    GROWTH_PLATFORM_LANDING_KEYS.includes(
      config.key as (typeof GROWTH_PLATFORM_LANDING_KEYS)[number],
    )
  ) {
    return 'growth';
  }

  return 'long_tail';
}

export function getCustomPlatformLandingIntentSlugs(
  locale: string = defaultLocale,
): string[] {
  const safeLocale = normalizeLocale(locale);
  const localeCopy = PLATFORM_INTENT_DETAIL_COPY[safeLocale as 'en' | 'zh'];

  return localeCopy ? Object.keys(localeCopy) : [];
}

export function getLocalizedPlatformLandingIntentSlugs(
  locale: string = defaultLocale,
): string[] {
  const safeLocale = normalizeLocale(locale);

  if (safeLocale === 'en' || safeLocale === 'zh') {
    return getCustomPlatformLandingIntentSlugs(safeLocale);
  }

  if (
    safeLocale === 'fr'
    || safeLocale === 'de'
    || safeLocale === 'es'
    || safeLocale === 'ar'
    || safeLocale === 'it'
    || safeLocale === 'pt'
  ) {
    return Object.keys(
      PLATFORM_INTENT_NARRATIVE_TERMS[safeLocale as PlatformLandingIntentNarrativeLocale] || {},
    );
  }

  return [];
}

export function getPlatformLandingPageStrategyCopy(
  config: PlatformLandingConfig,
  locale: string = defaultLocale,
): PlatformLandingPageStrategyCopy {
  const segment = getPlatformLandingSegment(config);
  const safeLocale = normalizeLocale(locale);

  if (safeLocale === 'zh') {
    if (segment === 'featured') {
      return {
        heroContext: (platformName) =>
          `${platformName} 在站内属于核心平台入口，所以这个页面会更强调总览、横向比较和继续浏览。`,
        topicSectionTitle: (platformName) => `先看 ${platformName} 最多人继续浏览的内容`,
        topicSectionDescription: (platformName) =>
          `这批内容通常最适合先打开，能帮助你从 ${platformName} 更快进入更具体的品牌、分类和商品页面。`,
        adjacentSectionTitle: '接下来还可以继续看',
        adjacentSectionDescription: (platformName) =>
          `当你已经从 ${platformName} 缩小到某个类目后，这些相邻页面适合继续往下看，而不用重新返回搜索。`,
      };
    }

    if (segment === 'growth') {
      return {
        heroContext: (platformName) =>
          `${platformName} 在站内更像一个正在放大的平台入口，所以这个页面会优先带你进入最常用的浏览内容。`,
        topicSectionTitle: (platformName) => `${platformName} 最值得先看的内容`,
        topicSectionDescription: (platformName) =>
          `这里优先放的是更容易继续往下看的内容，适合先快速进入品牌、分类和商品。`,
        adjacentSectionTitle: '还可以顺着继续看',
        adjacentSectionDescription: (platformName) =>
          `这些相邻页面适合让已经进入 ${platformName} 的用户继续浏览更细的内容。`,
      };
    }

    return {
      heroContext: (platformName) =>
        `${platformName} 更适合作为更细分的平台入口来帮助用户继续浏览，所以这个页面会强调相关内容之间的连接。`,
      topicSectionTitle: (platformName) => `${platformName} 的细分浏览入口`,
      topicSectionDescription: (platformName) =>
        `这批页面更适合把更细的 ${platformName} 搜索继续带进品牌、分类和商品浏览。`,
      adjacentSectionTitle: '你还可以继续看这些',
      adjacentSectionDescription: () =>
        `对于更细的平台词，用户更容易在相邻类目之间切换，所以这里会优先给出下一步可看的内容。`,
    };
  }

  if (segment === 'featured') {
    return {
      heroContext: (platformName) =>
        `${platformName} works as a core platform hub on the site, so this page leans into broader comparison, category coverage and easier onward browsing.`,
        topicSectionTitle: (platformName) => `Start with the most useful ${platformName} sections`,
      topicSectionDescription: (platformName) =>
        `These are usually the best places to begin before you narrow into more specific brands, categories or products on ${platformName}.`,
      adjacentSectionTitle: 'Good places to open next',
      adjacentSectionDescription: (platformName) =>
        `Once visitors narrow into a category on ${platformName}, these neighboring pages make it easier to keep browsing without bouncing back to search.`,
    };
  }

  if (segment === 'growth') {
    return {
      heroContext: (platformName) =>
        `${platformName} behaves more like an expanding branded entry point, so this page focuses on the sections most likely to help visitors keep moving.`,
        topicSectionTitle: (platformName) => `Best places to start on ${platformName}`,
      topicSectionDescription: (platformName) =>
        `These sections usually do the most work for users who already know they want to browse around ${platformName}.`,
      adjacentSectionTitle: 'Related pages worth checking next',
      adjacentSectionDescription: () =>
        `Related pages help visitors keep exploring nearby categories instead of stopping after one page.`,
    };
  }

  return {
    heroContext: (platformName) =>
      `${platformName} works better as a narrower branded entry point, so this page focuses on helping visitors move into the right next pages instead of acting like a giant portal.`,
    topicSectionTitle: (platformName) => `${platformName} pages worth opening first`,
    topicSectionDescription: (platformName) =>
      `These pages are meant to make narrower ${platformName} searches easier to continue inside the site.`,
    adjacentSectionTitle: 'Nearby pages to keep browsing',
    adjacentSectionDescription: () =>
      `With narrower platform demand, visitors often jump between adjacent categories, so these linked pages help preserve that exploration on-site.`,
  };
}

export function getPlatformLandingUserFitCopy(
  config: PlatformLandingConfig,
  locale: string = defaultLocale,
): PlatformLandingUserFitCopy {
  const segment = getPlatformLandingSegment(config);
  const safeLocale = normalizeLocale(locale);

  if (safeLocale === 'zh') {
    if (segment === 'featured') {
      return {
        sectionTitle: (platformName) => `谁更适合先从 ${platformName} 开始`,
        sectionDescription: (platformName) =>
          `${platformName} 更像一个总入口，适合还在比较平台、类目和找货路径的用户，而不是已经只剩一个非常窄的购买目标。`,
        cards: (platformName, platformQuery, aliasCount) => [
          {
            eyebrow: '适合什么阶段',
            title: '还在做平台级总览',
            description:
              `如果你还在用 ${platformQuery}、spreadsheet、yupoo、links 这类组合词做总览，先从 ${platformName} 主页进入更合适。`,
          },
          {
            eyebrow: '典型搜索方式',
            title: '先看大方向，再继续细看',
            description:
              `先看 ${platformName} 总页，再继续点进 shoes、bags、hoodies 这些页面，会比直接从零散搜索结果开始更顺。`,
          },
          {
            eyebrow: '覆盖补充',
            title: aliasCount > 0 ? '常见变体也能归并进来' : '适合继续横向比较',
            description:
              aliasCount > 0
                ? `这个平台还承接了 ${aliasCount} 组常见别名或错拼，用户即使搜错，也能回到标准的 ${platformName} 页面。`
                : `当你想顺手比较其他主流平台时，这类核心平台页也更适合作为横向对照起点。`,
          },
        ],
      };
    }

    if (segment === 'growth') {
      return {
        sectionTitle: (platformName) => `什么时候更该点进 ${platformName}`,
        sectionDescription: (platformName) =>
          `${platformName} 更像第二梯队的品牌词入口，适合已经有平台偏好，但还需要更快进入高价值专题的用户。`,
        cards: (platformName, platformQuery, aliasCount) => [
          {
            eyebrow: '适合什么阶段',
            title: '已经带着品牌词进站',
            description:
              `如果用户已经直接搜索 ${platformQuery} 相关组合词，这种增长平台页适合尽快把流量送进最容易起量的专题。`,
          },
          {
            eyebrow: '典型搜索方式',
            title: '先点最常用的浏览页',
            description:
              `对 ${platformName} 这类平台来说，先看 shoes、bags、watches 这些页面，通常比停留在泛介绍层更有效。`,
          },
          {
            eyebrow: '覆盖补充',
            title: aliasCount > 0 ? '品牌变体覆盖更重要' : '适合继续放大品牌搜索面',
            description:
              aliasCount > 0
                ? `${platformName} 这类品牌词更依赖别名和错拼归一化，已经覆盖的 ${aliasCount} 组变体能减少流量损耗。`
                : `这类平台更适合靠专题网络继续扩张品牌搜索面，而不是只停在单一平台介绍页。`,
          },
        ],
      };
    }

    return {
      sectionTitle: (platformName) => `${platformName} 更适合怎样的用户`,
      sectionDescription: (platformName) =>
        `${platformName} 更适合承接已经比较细的品牌词需求，所以页面会更强调从平台页快速转进专题和相邻路线。`,
      cards: (platformName, platformQuery, aliasCount) => [
        {
          eyebrow: '适合什么阶段',
          title: '已经知道自己在找哪个平台',
          description:
            `如果用户已经明确搜 ${platformQuery}，这种长尾平台页就不需要承担太多总览任务，而是应该尽快进入更具体的需求路径。`,
        },
          {
            eyebrow: '典型搜索方式',
            title: '从平台页继续点进细分类目',
            description:
              `对 ${platformName} 这种更细的平台词来说，平台页更像一个分发点，用来继续点进 shoes、shirts、pants 这类细分类目。`,
          },
        {
          eyebrow: '覆盖补充',
          title: aliasCount > 0 ? '错拼兜底同样重要' : '更依赖相邻路线承接',
          description:
            aliasCount > 0
              ? `越长尾的平台越容易出现拼写变体，当前页面已经把 ${aliasCount} 组别名统一收口到标准页面。`
              : `这类页面更需要靠相邻专题和比较页把用户继续留在站内，而不是把访问停在单页。`,
        },
      ],
    };
  }

  if (segment === 'featured') {
    return {
      sectionTitle: (platformName) => `Who should start on ${platformName}`,
      sectionDescription: (platformName) =>
        `${platformName} works best as a broad platform hub for users who still need to compare categories, search angles and next-step routes before they narrow into a single topic.`,
      cards: (platformName, platformQuery, aliasCount) => [
        {
          eyebrow: 'Best for',
          title: 'Broad platform discovery first',
          description:
            `If the session still starts with ${platformQuery}, spreadsheet, yupoo or links modifiers, the broader ${platformName} guide is the right place to begin.`,
        },
        {
          eyebrow: 'Typical session',
          title: 'Start wide, then narrow step by step',
          description:
            `Featured platform hubs like ${platformName} work better when users compare the main sections first, then narrow into shoes, bags or other specific interests.`,
        },
        {
          eyebrow: 'Coverage',
          title: aliasCount > 0 ? 'Common spelling variants already normalize here' : 'Strongest as a comparison entry route',
          description:
            aliasCount > 0
              ? `This guide also absorbs ${aliasCount} common aliases or typo variants so branded traffic still resolves to the canonical ${platformName} route.`
              : `Core platform pages are useful when visitors want one place to compare adjacent agent options before they click deeper.`,
        },
      ],
    };
  }

  if (segment === 'growth') {
    return {
      sectionTitle: (platformName) => `When ${platformName} is the better starting point`,
      sectionDescription: (platformName) =>
        `${platformName} behaves more like a second-wave branded route, so the page should help users move from platform demand into the topic clusters most likely to produce momentum quickly.`,
      cards: (platformName, platformQuery, aliasCount) => [
        {
          eyebrow: 'Best for',
          title: 'Visitors already carrying branded intent',
          description:
            `If users search directly for ${platformQuery} combinations, this kind of growth platform landing should push them into the clearest high-intent routes fast.`,
        },
        {
          eyebrow: 'Typical session',
          title: 'Move into the most useful sections early',
          description:
            `On growth-stage platforms like ${platformName}, shoes, bags and watches pages usually help more than a long generic platform explanation.`,
        },
        {
          eyebrow: 'Coverage',
          title: aliasCount > 0 ? 'Brand variants matter more here' : 'Built to widen branded demand',
          description:
            aliasCount > 0
              ? `${platformName} depends more on alias and typo normalization, and this route already folds ${aliasCount} common variations back into the canonical page.`
              : `Growth-stage platforms benefit more when topic routes widen the branded search surface instead of leaving the session on one page.`,
        },
      ],
    };
  }

  return {
    sectionTitle: (platformName) => `How to use ${platformName} as a long-tail entry route`,
    sectionDescription: (platformName) =>
      `${platformName} is better as a narrower branded entry point, so this landing should move users into specific topics and nearby routes instead of trying to act like a giant platform portal.`,
    cards: (platformName, platformQuery, aliasCount) => [
      {
        eyebrow: 'Best for',
        title: 'Users who already know the platform name',
        description:
          `When the session already starts from ${platformQuery}, the platform page does not need to do everything. It mainly needs to route visitors into the next useful cluster quickly.`,
      },
      {
        eyebrow: 'Typical session',
        title: 'Drop straight into narrower categories',
        description:
          `For longer-tail agents like ${platformName}, the main page works best as a distribution point into shoes, shirts, pants and adjacent demand clusters.`,
      },
      {
        eyebrow: 'Coverage',
        title: aliasCount > 0 ? 'Typos still resolve to the same hub' : 'Neighboring routes matter more than broad comparison',
        description:
          aliasCount > 0
            ? `Longer-tail brand demand often arrives with spelling drift, so ${aliasCount} alias patterns now resolve back to the canonical ${platformName} guide.`
            : `Long-tail platform pages need stronger neighboring routes because users are more likely to jump between adjacent categories than stay on a broad overview.`,
      },
    ],
  };
}

export function getPlatformLandingFaqItems(
  config: PlatformLandingConfig,
  locale: string = defaultLocale,
) {
  const copy = getPlatformLandingPageCopy(locale);
  const siteName = getSiteName();
  return copy.faqItems(siteName, config.name, config.primaryQuery);
}

export function getPlatformLandingComparisonPages(currentSlug: string) {
  const currentConfig = getPlatformLandingConfigBySlug(currentSlug);
  const currentSegment = currentConfig
    ? getPlatformLandingSegment(currentConfig)
    : null;

  function getSegmentScore(candidate: PlatformLandingConfig) {
    const candidateSegment = getPlatformLandingSegment(candidate);

    if (!currentSegment) {
      return candidateSegment === 'featured' ? 60 : candidateSegment === 'growth' ? 40 : 20;
    }

    if (candidateSegment === currentSegment) {
      return 120;
    }

    if (currentSegment === 'featured') {
      return candidateSegment === 'growth' ? 70 : 35;
    }

    if (currentSegment === 'growth') {
      return candidateSegment === 'featured' ? 85 : 45;
    }

    return candidateSegment === 'growth' ? 80 : 55;
  }

  return ALL_PLATFORM_LANDING_PAGES.filter((page) => page.slug !== currentSlug)
    .slice()
    .sort((left, right) => {
      const scoreDiff = getSegmentScore(right) - getSegmentScore(left);

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return left.name.localeCompare(right.name);
    });
}

function normalizeIntentContextTokens(value: string): string[] {
  return value
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function countIntentOverlap(
  left: readonly string[] = [],
  right: readonly string[] = [],
): number {
  const rightSet = new Set(right.map((token) => token.toLowerCase()));
  return left.reduce(
    (sum, token) => (rightSet.has(token.toLowerCase()) ? sum + 1 : sum),
    0,
  );
}

export function getPlatformLandingIntentBySlug(intentSlug: string) {
  return PLATFORM_LANDING_INTENTS.find((intent) => intent.slug === intentSlug);
}

export function getRelatedPlatformLandingIntents(
  intentSlug: string,
  limit: number = 4,
  categoryLabel?: string | null,
): PlatformLandingIntentConfig[] {
  const currentIntent = getPlatformLandingIntentBySlug(intentSlug);
  const configuredSlugs = PLATFORM_LANDING_RELATED_INTENT_SLUGS[intentSlug] || [];
  const categoryTokens = categoryLabel ? normalizeIntentContextTokens(categoryLabel) : [];

  return PLATFORM_LANDING_INTENTS.filter((intent) => intent.slug !== intentSlug)
    .slice()
    .sort((left, right) => {
      const leftConfiguredIndex = configuredSlugs.indexOf(left.slug);
      const rightConfiguredIndex = configuredSlugs.indexOf(right.slug);
      const leftConfiguredScore = leftConfiguredIndex >= 0 ? 100 - leftConfiguredIndex * 5 : 0;
      const rightConfiguredScore = rightConfiguredIndex >= 0 ? 100 - rightConfiguredIndex * 5 : 0;
      const leftContextScore =
        (currentIntent
          ? countIntentOverlap(left.categoryMatches, currentIntent.categoryMatches) * 8
          : 0) +
        countIntentOverlap(left.categoryMatches, categoryTokens) * 20;
      const rightContextScore =
        (currentIntent
          ? countIntentOverlap(right.categoryMatches, currentIntent.categoryMatches) * 8
          : 0) +
        countIntentOverlap(right.categoryMatches, categoryTokens) * 20;
      const scoreDiff =
        rightConfiguredScore + rightContextScore - (leftConfiguredScore + leftContextScore);

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}

export function getPlatformLandingIntentJourneyCopy(
  intent: PlatformLandingIntentConfig,
  locale: string = defaultLocale,
  config?: PlatformLandingConfig,
): PlatformLandingIntentJourneyCopy {
  const safeLocale = normalizeLocale(locale);
  const narrativeKey = config ? getPlatformLandingNarrativeKey(config) : null;

  if (narrativeKey && ['fr', 'de', 'es', 'ar', 'it', 'pt'].includes(safeLocale)) {
    const narrativeCopy = createNarrativeIntentJourneyCopy(
      intent,
      safeLocale as PlatformLandingIntentNarrativeLocale,
      narrativeKey,
    );

    if (narrativeCopy) {
      return narrativeCopy;
    }
  }

  if (safeLocale === 'zh') {
    return {
      relatedRoutesTitle: (platformName, intentName) => `${platformName} ${intentName} 相关页面`,
      relatedRoutesDescription: (_platformName, intentQuery) =>
        `从 ${intentQuery} 进入的用户，通常还会继续比较相邻页面、分类入口和其他平台页面，再决定下一步看什么。`,
      sessionTitle: '继续浏览还是横向比较',
      sessionDescription: (platformName, intentName) =>
        `你可以回到更宽的 ${platformName} 总页继续看更多类目，也可以留在 ${intentName} 周边页面里做更细的比较。`,
      guideLabel: (platformName) => `打开完整的 ${platformName} 指南`,
      guideDescription: (platformName) =>
        `回到 ${platformName} 的总入口，查看更多分类和平台相关路线。`,
      compareLabel: (pageName, intentName) => `比较 ${pageName} 的 ${intentName}`,
      compareDescription: (pageName, intentName) =>
        `横向看一下 ${pageName} 在同一个 ${intentName} 页面上的内容组织方式。`,
    };
  }

  if (safeLocale === 'fr') {
    return {
      relatedRoutesTitle: (platformName, intentName) =>
        `Plus de pages ${intentName.toLowerCase()} autour de ${platformName}`,
      relatedRoutesDescription: (_platformName, intentQuery) =>
        `Les visiteurs qui commencent par ${intentQuery} ouvrent souvent ensuite des pages voisines, des categories proches et des comparaisons entre plateformes avant de choisir la suite.`,
      sessionTitle: 'Elargir ou comparer ensuite',
      sessionDescription: (platformName, intentName) =>
        `Utilisez le guide ${platformName} si vous avez besoin d'une vue plus large, ou restez pres des pages ${intentName.toLowerCase()} voisines pour comparer des options proches.`,
      guideLabel: (platformName) => `Ouvrir le guide complet ${platformName}`,
      guideDescription: (platformName) =>
        `Revenez a la page principale ${platformName} pour comparer plus de categories depuis un seul endroit.`,
      compareLabel: (pageName, intentName) =>
        `Comparer ${intentName.toLowerCase()} sur ${pageName}`,
      compareDescription: (pageName, intentName) =>
        `Verifiez comment ${pageName} organise la meme page ${intentName.toLowerCase()} avant de continuer.`,
    };
  }

  if (safeLocale === 'de') {
    return {
      relatedRoutesTitle: (platformName, intentName) =>
        `Mehr ${intentName.toLowerCase()}-seiten rund um ${platformName}`,
      relatedRoutesDescription: (_platformName, intentQuery) =>
        `Besucher, die mit ${intentQuery} starten, springen oft noch in benachbarte Seiten, nahe Kategorien und Plattform-Vergleiche, bevor sie weiterklicken.`,
      sessionTitle: 'Danach erweitern oder vergleichen',
      sessionDescription: (platformName, intentName) =>
        `Nutze den breiteren ${platformName}-Guide, wenn du mehr Uberblick brauchst, oder bleib nah an benachbarten ${intentName.toLowerCase()}-Seiten, um nahe Optionen zu vergleichen.`,
      guideLabel: (platformName) => `Den kompletten ${platformName}-guide offnen`,
      guideDescription: (platformName) =>
        `Zuruck zur ${platformName}-Hauptseite, um mehr Kategorien an einem Ort zu vergleichen.`,
      compareLabel: (pageName, intentName) =>
        `${intentName.toLowerCase()} auf ${pageName} vergleichen`,
      compareDescription: (pageName, intentName) =>
        `Prufe, wie ${pageName} dieselbe ${intentName.toLowerCase()}-Seite aufbaut, bevor du tiefer gehst.`,
    };
  }

  if (safeLocale === 'es') {
    return {
      relatedRoutesTitle: (platformName, intentName) =>
        `Mas paginas de ${intentName.toLowerCase()} alrededor de ${platformName}`,
      relatedRoutesDescription: (_platformName, intentQuery) =>
        `Quienes empiezan por ${intentQuery} suelen abrir despues paginas cercanas, categorias proximas y comparaciones entre plataformas antes de decidir el siguiente clic.`,
      sessionTitle: 'Ampliar o comparar despues',
      sessionDescription: (platformName, intentName) =>
        `Usa la guia general de ${platformName} si necesitas una vista mas amplia, o mantente cerca de paginas vecinas de ${intentName.toLowerCase()} para comparar opciones proximas.`,
      guideLabel: (platformName) => `Abrir la guia completa de ${platformName}`,
      guideDescription: (platformName) =>
        `Vuelve a la pagina principal de ${platformName} para comparar mas categorias desde un solo lugar.`,
      compareLabel: (pageName, intentName) =>
        `Comparar ${intentName.toLowerCase()} en ${pageName}`,
      compareDescription: (pageName, intentName) =>
        `Revisa como ${pageName} organiza la misma pagina de ${intentName.toLowerCase()} antes de seguir.`,
    };
  }

  if (safeLocale === 'ar') {
    return {
      relatedRoutesTitle: (platformName, intentName) =>
        `المزيد من صفحات ${intentName.toLowerCase()} حول ${platformName}`,
      relatedRoutesDescription: (_platformName, intentQuery) =>
        `الزوار الذين يبدؤون من ${intentQuery} يفتحون غالبا صفحات قريبة وفئات مشابهة ومقارنات بين المنصات قبل اختيار الخطوة التالية.`,
      sessionTitle: 'وسّع التصفح او قارن بعد ذلك',
      sessionDescription: (platformName, intentName) =>
        `استخدم دليل ${platformName} العام اذا كنت تحتاج الى صورة اوسع، او ابق قريبا من صفحات ${intentName.toLowerCase()} المجاورة لمقارنة الخيارات القريبة.`,
      guideLabel: (platformName) => `افتح دليل ${platformName} الكامل`,
      guideDescription: (platformName) =>
        `عد الى الصفحة الرئيسية لـ ${platformName} لمقارنة مزيد من الفئات من مكان واحد.`,
      compareLabel: (pageName, intentName) =>
        `قارن ${intentName.toLowerCase()} على ${pageName}`,
      compareDescription: (pageName, intentName) =>
        `راجع كيف ينظم ${pageName} صفحة ${intentName.toLowerCase()} نفسها قبل المتابعة.`,
    };
  }

  if (safeLocale === 'it') {
    return {
      relatedRoutesTitle: (platformName, intentName) =>
        `Altre pagine ${intentName.toLowerCase()} attorno a ${platformName}`,
      relatedRoutesDescription: (_platformName, intentQuery) =>
        `Chi parte da ${intentQuery} spesso apre poi pagine vicine, categorie simili e confronti tra piattaforme prima di scegliere il clic successivo.`,
      sessionTitle: 'Amplia o confronta dopo',
      sessionDescription: (platformName, intentName) =>
        `Usa la guida generale di ${platformName} se ti serve una vista piu ampia, oppure resta vicino alle pagine ${intentName.toLowerCase()} correlate per confrontare opzioni vicine.`,
      guideLabel: (platformName) => `Apri la guida completa di ${platformName}`,
      guideDescription: (platformName) =>
        `Torna alla pagina principale di ${platformName} per confrontare piu categorie da un solo posto.`,
      compareLabel: (pageName, intentName) =>
        `Confronta ${intentName.toLowerCase()} su ${pageName}`,
      compareDescription: (pageName, intentName) =>
        `Controlla come ${pageName} organizza la stessa pagina ${intentName.toLowerCase()} prima di continuare.`,
    };
  }

  if (safeLocale === 'pt') {
    return {
      relatedRoutesTitle: (platformName, intentName) =>
        `Mais paginas de ${intentName.toLowerCase()} em torno de ${platformName}`,
      relatedRoutesDescription: (_platformName, intentQuery) =>
        `Quem comeca por ${intentQuery} costuma abrir depois paginas proximas, categorias parecidas e comparacoes entre plataformas antes de decidir o clique seguinte.`,
      sessionTitle: 'Alargar ou comparar a seguir',
      sessionDescription: (platformName, intentName) =>
        `Use o guia geral de ${platformName} se precisar de uma vista mais ampla, ou fique perto de paginas vizinhas de ${intentName.toLowerCase()} para comparar opcoes proximas.`,
      guideLabel: (platformName) => `Abrir o guia completo de ${platformName}`,
      guideDescription: (platformName) =>
        `Volte para a pagina principal de ${platformName} para comparar mais categorias num unico lugar.`,
      compareLabel: (pageName, intentName) =>
        `Comparar ${intentName.toLowerCase()} em ${pageName}`,
      compareDescription: (pageName, intentName) =>
        `Veja como ${pageName} organiza a mesma pagina de ${intentName.toLowerCase()} antes de continuar.`,
    };
  }

  return {
    relatedRoutesTitle: (platformName, intentName) =>
      `More ${intentName.toLowerCase()} pages around ${platformName}`,
    relatedRoutesDescription: (_platformName, intentQuery) =>
      `Visitors who start with ${intentQuery} often branch into nearby pages, category entries and cross-agent comparisons before deciding what to open next.`,
    sessionTitle: 'Broaden or compare next',
    sessionDescription: (platformName, intentName) =>
      `Use the broader ${platformName} guide when you need a wider platform overview, or stay close to neighboring ${intentName.toLowerCase()} pages to compare nearby options.`,
    guideLabel: (platformName) => `Open the full ${platformName} guide`,
    guideDescription: (platformName) =>
      `Return to the broader ${platformName} landing and compare more categories from one place.`,
    compareLabel: (pageName, intentName) =>
      `Compare ${intentName} on ${pageName}`,
    compareDescription: (pageName, intentName) =>
      `Cross-check how ${pageName} organizes the same ${intentName.toLowerCase()} page before you click deeper.`,
  };
}

export function getPlatformLandingIntentUserFitCopy(
  intent: PlatformLandingIntentConfig,
  locale: string = defaultLocale,
  config?: PlatformLandingConfig,
): PlatformLandingIntentUserFitCopy {
  const safeLocale = normalizeLocale(locale);
  const narrativeKey = config ? getPlatformLandingNarrativeKey(config) : null;

  if (narrativeKey && ['fr', 'de', 'es', 'ar', 'it', 'pt'].includes(safeLocale)) {
    const narrativeCopy = createNarrativeIntentUserFitCopy(
      intent,
      safeLocale as PlatformLandingIntentNarrativeLocale,
      narrativeKey,
    );

    if (narrativeCopy) {
      return narrativeCopy;
    }
  }

  if (safeLocale === 'zh') {
    return {
      sectionTitle: (platformName, intentName) => `${platformName} 的 ${intentName} 页面适合什么时候打开`,
      sectionDescription: (_platformName, intentQuery, categoryLabel) =>
        categoryLabel
          ? `这个路由已经和 ${categoryLabel} 分类对上，适合已经从平台泛浏览进入到 ${intentQuery} 明确需求的用户。`
          : `这个页面还没有精确分类兜底，所以更适合作为 ${intentQuery} 发现页，先判断方向，再继续进入商品或相邻页面。`,
      cards: (platformName, intentName, intentQuery, categoryLabel) => [
        {
          eyebrow: '最适合',
          title: '已经缩小到单一类目',
          description:
            `如果你已经知道自己要看 ${intentQuery}，这类页面会比留在 ${platformName} 总页更快。`,
        },
        {
          eyebrow: '当前匹配',
          title: categoryLabel ? `已连到 ${categoryLabel}` : '先走发现，再继续筛选',
          description:
            categoryLabel
              ? `当前页面已经能把 ${intentName} 需求更自然地送进 ${categoryLabel} 和对应商品列表。`
              : `因为没有精确分类匹配，所以这个页面更偏探索型，适合先看商品样本和相邻页面。`,
        },
        {
          eyebrow: '下一步',
          title: `继续比较 ${intentName} 周边页面`,
          description:
            `看完 ${platformName} 的 ${intentName} 后，最自然的下一步通常是返回平台总页或切到相邻页面做横向比较。`,
        },
      ],
    };
  }

  if (safeLocale === 'fr') {
    return {
      sectionTitle: (platformName, intentName) =>
        `Quand ouvrir la page ${platformName} ${intentName}`,
      sectionDescription: (_platformName, intentQuery, categoryLabel) =>
        categoryLabel
          ? `Cette page est deja reliee a la categorie ${categoryLabel}, elle convient donc mieux quand la session a deja quitte la decouverte large pour une intention ${intentQuery} plus nette.`
          : `Sans categorie exacte, cette page fonctionne surtout comme une page de decouverte autour de ${intentQuery} avant de passer vers les produits ou des pages voisines.`,
      cards: (platformName, intentName, intentQuery, categoryLabel) => [
        {
          eyebrow: 'Ideal pour',
          title: `Des visiteurs deja centres sur ${intent.query}`,
          description:
            `Si l'utilisateur sait deja qu'il veut ${intentQuery}, cette page ${platformName} doit battre une vue plateforme plus large.`,
        },
        {
          eyebrow: 'Ajustement actuel',
          title: categoryLabel ? `Relie a ${categoryLabel}` : 'Decouverte d abord, tri ensuite',
          description:
            categoryLabel
              ? `La page peut faire passer la demande ${intentName.toLowerCase()} plus naturellement vers ${categoryLabel}, ce qui raccourcit le chemin vers les produits visibles.`
              : `Sans correspondance exacte, cette page reste surtout utile pour explorer avant d'aller vers des produits ou des pages voisines.`,
        },
        {
          eyebrow: 'Et apres',
          title: `Comparer les pages ${intentName.toLowerCase()} voisines`,
          description:
            `Apres ${platformName} ${intentName.toLowerCase()}, l'etape utile suivante est souvent une page voisine ou le guide plateforme plus large, pas une nouvelle recherche generique.`,
        },
      ],
    };
  }

  if (safeLocale === 'de') {
    return {
      sectionTitle: (platformName, intentName) =>
        `Wann die ${platformName}-${intentName}-seite sinnvoll ist`,
      sectionDescription: (_platformName, intentQuery, categoryLabel) =>
        categoryLabel
          ? `Diese Seite passt bereits zur Kategorie ${categoryLabel} und funktioniert am besten, wenn die Sitzung aus dem breiten Plattform-Browse-Modus schon in eine klarere ${intentQuery}-Absicht gewechselt ist.`
          : `Ohne exakte Kategorie funktioniert diese Seite eher als Entdeckungsseite fur ${intentQuery}, bevor die Sitzung in Produkte oder benachbarte Seiten wechselt.`,
      cards: (platformName, intentName, intentQuery, categoryLabel) => [
        {
          eyebrow: 'Am besten fur',
          title: `Besucher mit klarer ${intent.query}-absicht`,
          description:
            `Wenn Nutzer bereits wissen, dass sie ${intentQuery} wollen, sollte diese ${platformName}-Seite besser funktionieren als ein breiter Plattform-Uberblick.`,
        },
        {
          eyebrow: 'Aktuelle Passung',
          title: categoryLabel ? `An ${categoryLabel} angebunden` : 'Erst entdecken, dann filtern',
          description:
            categoryLabel
              ? `Die Seite kann ${intentName.toLowerCase()}-Nachfrage naturlicher in ${categoryLabel} ubergeben und so den Weg zu sichtbaren Produkten verkurzen.`
              : `Ohne exakte Kategorie eignet sich diese Seite eher fur Exploration, bevor die Sitzung in Produkte oder nahe Seiten fallt.`,
        },
        {
          eyebrow: 'Danach',
          title: `Benachbarte ${intentName.toLowerCase()}-seiten vergleichen`,
          description:
            `Nach ${platformName} ${intentName.toLowerCase()} ist der nachste sinnvolle Schritt meist eine angrenzende Seite oder der breitere Plattform-Guide statt einer neuen generischen Suche.`,
        },
      ],
    };
  }

  if (safeLocale === 'es') {
    return {
      sectionTitle: (platformName, intentName) =>
        `Cuando abrir la pagina ${platformName} ${intentName}`,
      sectionDescription: (_platformName, intentQuery, categoryLabel) =>
        categoryLabel
          ? `Esta pagina ya encaja con la categoria ${categoryLabel}, asi que funciona mejor cuando la sesion ya salio de la exploracion amplia y entro en una intencion ${intentQuery} mas clara.`
          : `Sin una categoria exacta, esta pagina funciona mas como pagina de descubrimiento para ${intentQuery} antes de bajar a productos o paginas cercanas.`,
      cards: (platformName, intentName, intentQuery, categoryLabel) => [
        {
          eyebrow: 'Ideal para',
          title: `Usuarios con intencion clara de ${intent.query}`,
          description:
            `Si el usuario ya sabe que quiere ${intentQuery}, esta pagina de ${platformName} deberia rendir mejor que una vista de plataforma demasiado amplia.`,
        },
        {
          eyebrow: 'Ajuste actual',
          title: categoryLabel ? `Conectada con ${categoryLabel}` : 'Primero descubrir, despues filtrar',
          description:
            categoryLabel
              ? `La pagina puede pasar la demanda de ${intentName.toLowerCase()} hacia ${categoryLabel} de forma mas natural, acortando el camino hasta productos visibles.`
              : `Sin una categoria exacta, esta pagina funciona mejor para explorar antes de caer en productos o paginas vecinas.`,
        },
        {
          eyebrow: 'Siguiente paso',
          title: `Comparar paginas vecinas de ${intentName.toLowerCase()}`,
          description:
            `Despues de ${platformName} ${intentName.toLowerCase()}, lo mas util suele ser una pagina cercana o la guia general de la plataforma, no otra busqueda generica.`,
        },
      ],
    };
  }

  if (safeLocale === 'ar') {
    return {
      sectionTitle: (platformName, intentName) =>
        `متى تفتح صفحة ${platformName} ${intentName}`,
      sectionDescription: (_platformName, intentQuery, categoryLabel) =>
        categoryLabel
          ? `هذه الصفحة مرتبطة بالفعل بفئة ${categoryLabel} ولذلك تعمل بشكل افضل عندما تكون الجلسة قد غادرت التصفح العام ودخلت في نية ${intentQuery} اوضح.`
          : `من دون فئة دقيقة تعمل هذه الصفحة اكثر كصفحة اكتشاف لـ ${intentQuery} قبل النزول الى المنتجات او الصفحات القريبة.`,
      cards: (platformName, intentName, intentQuery, categoryLabel) => [
        {
          eyebrow: 'الافضل لـ',
          title: `المستخدمين ذوي نية واضحة نحو ${intent.query}`,
          description:
            `اذا كان المستخدم يعرف مسبقا انه يريد ${intentQuery} فيفترض ان تتفوق هذه الصفحة من ${platformName} على صفحة منصة اعم.`,
        },
        {
          eyebrow: 'الملاءمة الحالية',
          title: categoryLabel ? `مرتبطة بـ ${categoryLabel}` : 'اكتشاف اولا ثم تصفية',
          description:
            categoryLabel
              ? `الصفحة قادرة على تمرير طلب ${intentName.toLowerCase()} نحو ${categoryLabel} بشكل اكثر طبيعية مما يقصر الطريق الى المنتجات الواضحة.`
              : `من دون فئة دقيقة تعمل هذه الصفحة بشكل افضل للاستكشاف قبل الانتقال الى المنتجات او الصفحات المجاورة.`,
        },
        {
          eyebrow: 'الخطوة التالية',
          title: `قارن صفحات ${intentName.toLowerCase()} المجاورة`,
          description:
            `بعد ${platformName} ${intentName.toLowerCase()} تكون الخطوة الانسب غالبا صفحة قريبة او دليل المنصة العام وليس بحثا عاما جديدا.`,
        },
      ],
    };
  }

  if (safeLocale === 'it') {
    return {
      sectionTitle: (platformName, intentName) =>
        `Quando aprire la pagina ${platformName} ${intentName}`,
      sectionDescription: (_platformName, intentQuery, categoryLabel) =>
        categoryLabel
          ? `Questa pagina e gia allineata con la categoria ${categoryLabel}, quindi funziona meglio quando la sessione ha gia lasciato la scoperta ampia ed e entrata in un'intenzione ${intentQuery} piu chiara.`
          : `Senza una categoria esatta, questa pagina funziona piu come pagina di scoperta per ${intentQuery} prima di scendere su prodotti o pagine vicine.`,
      cards: (platformName, intentName, intentQuery, categoryLabel) => [
        {
          eyebrow: 'Ideale per',
          title: `Utenti con un'intenzione chiara su ${intent.query}`,
          description:
            `Se l'utente sa gia che vuole ${intentQuery}, questa pagina di ${platformName} dovrebbe rendere meglio di una panoramica piattaforma troppo ampia.`,
        },
        {
          eyebrow: 'Aderenza attuale',
          title: categoryLabel ? `Collegata a ${categoryLabel}` : 'Prima scoperta, poi filtro',
          description:
            categoryLabel
              ? `La pagina puo far passare la domanda ${intentName.toLowerCase()} verso ${categoryLabel} in modo piu naturale, accorciando il percorso fino ai prodotti visibili.`
              : `Senza una categoria esatta, questa pagina lavora meglio come esplorazione prima di scendere su prodotti o pagine vicine.`,
        },
        {
          eyebrow: 'Passo dopo',
          title: `Confronta pagine vicine di ${intentName.toLowerCase()}`,
          description:
            `Dopo ${platformName} ${intentName.toLowerCase()}, il passo piu utile e spesso una pagina vicina o la guida piattaforma piu ampia, non una nuova ricerca generica.`,
        },
      ],
    };
  }

  if (safeLocale === 'pt') {
    return {
      sectionTitle: (platformName, intentName) =>
        `Quando abrir a pagina ${platformName} ${intentName}`,
      sectionDescription: (_platformName, intentQuery, categoryLabel) =>
        categoryLabel
          ? `Esta pagina ja esta alinhada com a categoria ${categoryLabel}, por isso funciona melhor quando a sessao ja saiu da exploracao ampla e entrou numa intencao ${intentQuery} mais clara.`
          : `Sem uma categoria exata, esta pagina funciona mais como pagina de descoberta para ${intentQuery} antes de descer para produtos ou paginas proximas.`,
      cards: (platformName, intentName, intentQuery, categoryLabel) => [
        {
          eyebrow: 'Ideal para',
          title: `Utilizadores com intencao clara de ${intent.query}`,
          description:
            `Se o utilizador ja sabe que quer ${intentQuery}, esta pagina de ${platformName} deve render melhor do que uma vista de plataforma demasiado ampla.`,
        },
        {
          eyebrow: 'Ajuste atual',
          title: categoryLabel ? `Ligada a ${categoryLabel}` : 'Primeiro descobrir, depois filtrar',
          description:
            categoryLabel
              ? `A pagina consegue passar a procura por ${intentName.toLowerCase()} para ${categoryLabel} de forma mais natural, encurtando o caminho ate produtos visiveis.`
              : `Sem uma categoria exata, esta pagina funciona melhor para explorar antes de cair em produtos ou paginas vizinhas.`,
        },
        {
          eyebrow: 'Passo seguinte',
          title: `Comparar paginas vizinhas de ${intentName.toLowerCase()}`,
          description:
            `Depois de ${platformName} ${intentName.toLowerCase()}, o passo mais util costuma ser uma pagina proxima ou o guia geral da plataforma, e nao outra pesquisa generica.`,
        },
      ],
    };
  }

  return {
    sectionTitle: (platformName, intentName) => `When to open the ${platformName} ${intentName} page`,
    sectionDescription: (_platformName, intentQuery, categoryLabel) =>
      categoryLabel
        ? `This route already lines up with the ${categoryLabel} category, so it works best once the session has moved past broad platform browsing and into clearer ${intentQuery} intent.`
        : `There is no exact category handoff yet, so this works more like a discovery page for ${intentQuery} before the user commits to products or nearby pages.`,
    cards: (platformName, intentName, intentQuery, categoryLabel) => [
        {
          eyebrow: 'Best for',
          title: 'Visitors already narrowed into one category',
          description:
          `If the user already knows they want ${intentQuery}, this page should outperform a broader ${platformName} overview.`,
        },
      {
        eyebrow: 'Current route fit',
        title: categoryLabel ? `Matched to ${categoryLabel}` : 'Discovery first, filtering second',
        description:
          categoryLabel
            ? `The page can hand ${intentName.toLowerCase()} demand into ${categoryLabel} more naturally, which shortens the path from intent to visible products.`
            : `Without an exact category match, this page is better for exploration before the session drops into products or nearby pages.`,
        },
        {
          eyebrow: 'Next move',
        title: `Compare nearby ${intentName.toLowerCase()} pages`,
          description:
          `After ${platformName} ${intentName.toLowerCase()}, the next useful step is usually a nearby page or the broader platform guide rather than another generic search.`,
        },
      ],
    };
}

function createGenericIntentDetailCopy(
  intent: PlatformLandingIntentConfig,
): PlatformLandingIntentDetailCopy {
  return {
    heroDescription: (platformName, siteName) =>
      `Browse ${platformName} ${intent.query} finds on ${siteName}. Use this page when you want a quicker way to scan related products, categories and common shortcuts in one place.`,
    cards: (platformName) => [
      {
        title: `Find ${intent.name} faster`,
        description:
          `If you already know you want ${intent.query}, this page is a quicker starting point than a broad ${platformName} overview.`,
      },
      {
        title: 'Keep common shortcuts together',
        description:
          `Spreadsheet, yupoo, links and taobao combinations around ${intent.query} are grouped here so you can browse without restarting.`,
      },
      {
        title: 'Move into products and categories',
        description:
          'Use this page to jump from a broad idea into visible picks, matching categories and nearby topics.',
      },
    ],
    searchAnglesTitle: `${intent.name} search shortcuts`,
    searchAnglesDescription: () =>
      `People often look for ${intent.query} with spreadsheet, yupoo, links and taobao combinations. This page keeps those starting points together.`,
    nextClickTitle: `Best next step for ${intent.query}`,
    nextClickDescription: () =>
      'Open the closest category or product path next if you already know what you want to browse.',
    productsTitle: (platformName) => `Popular ${intent.query} finds for ${platformName}`,
    productsDescription: () =>
      'This page works best when it quickly shows visible picks you can compare right away.',
    compareTitle: (intentName) => `Compare ${intentName.toLowerCase()} guides across agents`,
    compareDescription: (_platformName, intentName) =>
      `If you want a wider view, compare the same ${intentName.toLowerCase()} category across other platform guides without starting over.`,
    faqTitle: (platformName) => `${platformName} ${intent.query} FAQ`,
    faqItems: (siteName, platformName) => [
      {
        question: `Why does ${siteName} have a separate ${platformName} ${intent.query} page?`,
        answer:
          `Because it gives ${intent.query} browsing a cleaner starting point than a broad platform page when visitors already know the category they want.`,
      },
      {
        question: `What should I use this ${platformName} ${intent.query} page for?`,
        answer:
          `Use it when you already know the category you want to browse and want a shorter path into relevant products, brands and related links.`,
      },
      {
        question: `Should I start here or on the main ${platformName} page?`,
        answer:
          `Start here if you already know you want ${intent.query}. Use the main ${platformName} guide when you still need a broader platform overview.`,
      },
    ],
  };
}

const PLATFORM_INTENT_DETAIL_COPY_ZH_FALLBACK: PlatformLandingIntentDetailCopy = {
  heroDescription: (platformName, siteName) =>
    `在 ${siteName} 浏览 ${platformName} 专题精选。这个页面会把常见搜索词、相关分类和商品入口放在一起，帮助用户更快进入想看的内容。`,
  cards: (platformName) => [
    {
      title: '更快缩小类目范围',
      description: `如果你已经知道想看哪一类商品，这个 ${platformName} 主题页会比平台总页更直接。`,
    },
    {
      title: '把常见搜索词放在一起',
      description: '这里会把 spreadsheet、yupoo、links、taobao 等常见组合词整理成更清晰的浏览入口。',
    },
    {
      title: '更快进入商品和分类',
      description: '看完主题入口后，你可以继续进入分类页和商品列表，不用重新从头搜索。',
    },
  ],
  searchAnglesTitle: '主题搜索路径',
  searchAnglesDescription: () =>
    '这个页面会把围绕该类目出现的常见搜索方式整理在一起，方便快速开始浏览。',
  nextClickTitle: '最佳下一步',
  nextClickDescription: () =>
    '如果你已经知道想看什么，就继续进入最接近的分类或商品列表。',
  productsTitle: (platformName) => `${platformName} 热门主题精选`,
  productsDescription: () =>
    '主题页更适合尽快给出可比较的商品结果，而不是只停留在说明层。',
  compareTitle: (intentName) => `比较不同平台的 ${intentName} 指南`,
  compareDescription: () =>
    '如果你想多看几个平台的同类页面，可以继续在这里比较，不用重新搜索。',
  faqTitle: (platformName) => `${platformName} 主题常见问题`,
      faqItems: (siteName, platformName) => [
        {
          question: `为什么 ${siteName} 会有单独的 ${platformName} 主题页？`,
          answer:
            '因为当用户已经知道想看哪一类商品时，独立主题页会比泛平台总页更容易直接开始浏览。',
        },
        {
          question: `这个主题页适合什么时候进入？`,
          answer:
            '当你已经知道自己想找某一类商品时，就应该优先进入对应的专题页面。',
        },
        {
          question: `我应该先看专题页还是平台总页？`,
          answer:
            '如果你已经确定类目，就先看专题页；如果还在泛浏览阶段，先从平台总页开始更合适。',
        },
      ],
};

function createCustomerFacingIntentDetailCopy(
  locale: string,
  intent: PlatformLandingIntentConfig,
  baseCopy: PlatformLandingIntentDetailCopy,
): PlatformLandingIntentDetailCopy {
  const safeLocale = normalizeLocale(locale);
  const usesGenericEnglishTitles =
    baseCopy.searchAnglesTitle === `${intent.name} search shortcuts`
    && baseCopy.nextClickTitle === `Best next step for ${intent.query}`
    && baseCopy.productsTitle('__test__') === `Popular ${intent.query} finds for __test__`
    && baseCopy.compareTitle(intent.name) === `Compare ${intent.name.toLowerCase()} guides across agents`
    && baseCopy.faqTitle('__test__') === `__test__ ${intent.query} FAQ`;

  if (safeLocale === 'zh') {
    return {
      heroDescription: (platformName, siteName) =>
        `在 ${siteName} 浏览 ${platformName} ${intent.query} 精选。这个页面会把常见搜索词、相关分类和商品入口放在一起，帮助你更快开始浏览。`,
      cards: (platformName, intentName = intent.name) => [
        {
          title: `更快找到 ${intentName}`,
          description: `如果你已经知道想看 ${intent.query}，从这个 ${platformName} 页面开始会比在总页里慢慢找更直接。`,
        },
        {
          title: '把常见搜索词放在一起',
          description: '这里会把 spreadsheet、yupoo、links、taobao 等组合词整理成更清晰的浏览入口。',
        },
        {
          title: '继续进入商品和分类',
          description: '你可以先看分类，再进入商品列表，不用重新从头搜索。',
        },
      ],
      searchAnglesTitle: baseCopy.searchAnglesTitle,
      searchAnglesDescription: () =>
        `围绕 ${intent.query} 的常见搜索方式都会整理在这里，方便你快速开始浏览。`,
      nextClickTitle: baseCopy.nextClickTitle,
      nextClickDescription: () =>
        '如果你已经知道想看什么，下一步就继续打开最接近的分类或商品列表。',
      productsTitle: baseCopy.productsTitle,
      productsDescription: () =>
        '这个页面更适合尽快给出可比较的商品结果，而不是只停留在说明层。',
      compareTitle: baseCopy.compareTitle,
      compareDescription: (_platformName, intentName) =>
        `如果你想多看几个平台的 ${intentName} 页面，可以继续比较，不用重新搜索。`,
      faqTitle: baseCopy.faqTitle,
      faqItems: (siteName, platformName) => [
        {
          question: `为什么 ${siteName} 会有单独的 ${platformName} ${intent.query} 页面？`,
          answer:
            `因为当你已经知道想看 ${intent.query} 时，独立页面会比泛平台总页更容易直接开始浏览。`,
        },
        {
          question: `这个页面适合什么时候进入？`,
          answer:
            `当你已经知道大概要看 ${intent.query}，并想更快进入商品和分类时，就适合从这里开始。`,
        },
        {
          question: `我应该先看这里还是 ${platformName} 总页？`,
          answer:
            `如果你已经知道想看 ${intent.query}，就先看这里；如果还想先做总览，再从 ${platformName} 总页开始。`,
        },
      ],
    };
  }

  if (safeLocale === 'fr') {
    return {
      heroDescription: (platformName, siteName) =>
        `Parcourez les selections ${platformName} pour ${intent.query} sur ${siteName}. Cette page rassemble produits, categories et raccourcis utiles pour commencer plus vite.`,
      cards: () => [
        {
          title: `Trouver ${intent.name.toLowerCase()} plus vite`,
          description: `Si vous savez deja que vous voulez explorer ${intent.query}, cette page est un point de depart plus direct qu'une vue plateforme plus large.`,
        },
        {
          title: 'Garder les raccourcis ensemble',
          description: `Les recherches spreadsheet, yupoo, links et taobao autour de ${intent.query} sont reunies ici pour eviter de recommencer la recherche.`,
        },
        {
          title: 'Passer plus vite aux produits',
          description: 'Utilisez cette page pour ouvrir plus vite les categories, les produits et les pages voisines les plus utiles.',
        },
      ],
      searchAnglesTitle: usesGenericEnglishTitles
        ? `Angles de recherche ${intent.name.toLowerCase()}`
        : baseCopy.searchAnglesTitle,
      searchAnglesDescription: () =>
        `Cette page rassemble les recherches les plus courantes autour de ${intent.query} pour demarrer plus facilement.`,
      nextClickTitle: usesGenericEnglishTitles
        ? `Meilleure prochaine etape pour ${intent.query}`
        : baseCopy.nextClickTitle,
      nextClickDescription: () =>
        'Le meilleur clic suivant est souvent la categorie la plus proche ou la liste de produits correspondante.',
      productsTitle: usesGenericEnglishTitles
        ? (platformName) => `Decouvertes ${intent.name.toLowerCase()} pour ${platformName}`
        : baseCopy.productsTitle,
      productsDescription: () =>
        'Cette page fonctionne mieux quand elle montre rapidement des produits visibles a comparer.',
      compareTitle: usesGenericEnglishTitles
        ? (intentName) => `Comparer les pages ${intentName.toLowerCase()} entre plateformes`
        : baseCopy.compareTitle,
      compareDescription: (_platformName, intentName) =>
        `Si vous voulez une vue plus large, comparez aussi les pages ${intentName.toLowerCase()} sur d'autres guides.`,
      faqTitle: usesGenericEnglishTitles
        ? (platformName) => `Questions frequentes ${platformName} ${intent.query}`
        : baseCopy.faqTitle,
      faqItems: (siteName, platformName) => [
        {
          question: `Pourquoi ${siteName} a-t-il une page ${platformName} pour ${intent.query} ?`,
          answer:
            `Parce qu'une page dediee a ${intent.query} permet de commencer plus vite quand la categorie est deja claire.`,
        },
        {
          question: `A quoi sert cette page ${platformName} ${intent.query} ?`,
          answer:
            `Elle sert a parcourir plus facilement les produits, categories et liens utiles lies a ${intent.query}.`,
        },
        {
          question: `Dois-je commencer ici ou sur la page principale ${platformName} ?`,
          answer:
            `Commencez ici si vous savez deja que vous voulez ${intent.query}. Sinon, revenez a la page principale ${platformName} pour une vue plus large.`,
        },
      ],
    };
  }

  if (safeLocale === 'de') {
    return {
      heroDescription: (platformName, siteName) =>
        `Entdecke ${platformName} Auswahl fur ${intent.query} auf ${siteName}. Diese Seite bringt Produkte, Kategorien und nutzliche Einstiege an einem Ort zusammen.`,
      cards: () => [
        {
          title: `${intent.name} schneller finden`,
          description: `Wenn du bereits weisst, dass du ${intent.query} suchst, ist diese Seite der direktere Einstieg als eine breitere Plattform-Ubersicht.`,
        },
        {
          title: 'Haufige Einstiege zusammenhalten',
          description: `Spreadsheet-, yupoo-, links- und taobao-Kombinationen rund um ${intent.query} werden hier gesammelt, damit du nicht neu anfangen musst.`,
        },
        {
          title: 'Schneller zu Produkten und Kategorien',
          description: 'Nutze diese Seite, um schneller in passende Kategorien, sichtbare Produkte und benachbarte Seiten zu wechseln.',
        },
      ],
      searchAnglesTitle: usesGenericEnglishTitles
        ? `Suchwinkel fur ${intent.name.toLowerCase()}`
        : baseCopy.searchAnglesTitle,
      searchAnglesDescription: () =>
        `Hier werden die haufigsten Suchwege rund um ${intent.query} an einer Stelle gebundelt.`,
      nextClickTitle: usesGenericEnglishTitles
        ? `Bester nachster Schritt fur ${intent.query}`
        : baseCopy.nextClickTitle,
      nextClickDescription: () =>
        'Der beste nachste Klick ist meist die passendste Kategorie oder die zugehorige Produktliste.',
      productsTitle: usesGenericEnglishTitles
        ? (platformName) => `Beliebte ${intent.name.toLowerCase()}-Auswahl fur ${platformName}`
        : baseCopy.productsTitle,
      productsDescription: () =>
        'Diese Seite funktioniert am besten, wenn sie schnell sichtbare Produkte zum Vergleichen zeigt.',
      compareTitle: usesGenericEnglishTitles
        ? (intentName) => `${intentName.toLowerCase()}-Seiten zwischen Plattformen vergleichen`
        : baseCopy.compareTitle,
      compareDescription: (_platformName, intentName) =>
        `Wenn du breiter vergleichen willst, schau dir auch ${intentName.toLowerCase()}-Seiten anderer Plattform-Guides an.`,
      faqTitle: usesGenericEnglishTitles
        ? (platformName) => `Haufige Fragen zu ${platformName} ${intent.query}`
        : baseCopy.faqTitle,
      faqItems: (siteName, platformName) => [
        {
          question: `Warum hat ${siteName} eine eigene ${platformName}-Seite fur ${intent.query}?`,
          answer:
            `Weil eine eigene ${intent.query}-Seite ein schnellerer Einstieg ist, wenn die Kategorie schon feststeht.`,
        },
        {
          question: `Wofur ist diese ${platformName}-${intent.query}-Seite gedacht?`,
          answer:
            `Sie hilft dir, relevante Produkte, Kategorien und nutzliche Links rund um ${intent.query} schneller zu sehen.`,
        },
        {
          question: `Sollte ich hier oder auf der Hauptseite von ${platformName} starten?`,
          answer:
            `Starte hier, wenn du bereits weisst, dass du ${intent.query} suchst. Fur einen breiteren Uberblick nutze zuerst die Hauptseite von ${platformName}.`,
        },
      ],
    };
  }

  if (safeLocale === 'es') {
    return {
      heroDescription: (platformName, siteName) =>
        `Explora las selecciones de ${platformName} para ${intent.query} en ${siteName}. Esta pagina reune productos, categorias y atajos utiles en un solo lugar.`,
      cards: () => [
        {
          title: `Encontrar ${intent.name.toLowerCase()} mas rapido`,
          description: `Si ya sabes que quieres ver ${intent.query}, esta pagina es un punto de entrada mas directo que una vista general de plataforma.`,
        },
        {
          title: 'Mantener juntos los atajos mas comunes',
          description: `Las combinaciones con spreadsheet, yupoo, links y taobao relacionadas con ${intent.query} estan reunidas aqui para evitar volver a empezar.`,
        },
        {
          title: 'Entrar antes en productos y categorias',
          description: 'Usa esta pagina para pasar mas rapido a categorias cercanas, productos visibles y paginas relacionadas.',
        },
      ],
      searchAnglesTitle: usesGenericEnglishTitles
        ? `Angulos de busqueda para ${intent.name.toLowerCase()}`
        : baseCopy.searchAnglesTitle,
      searchAnglesDescription: () =>
        `Aqui se juntan las formas mas comunes de buscar ${intent.query} para que sea mas facil empezar a navegar.`,
      nextClickTitle: usesGenericEnglishTitles
        ? `Mejor siguiente paso para ${intent.query}`
        : baseCopy.nextClickTitle,
      nextClickDescription: () =>
        'El mejor siguiente clic suele ser la categoria mas cercana o la lista de productos relacionada.',
      productsTitle: usesGenericEnglishTitles
        ? (platformName) => `Selecciones populares de ${intent.name.toLowerCase()} para ${platformName}`
        : baseCopy.productsTitle,
      productsDescription: () =>
        'Esta pagina funciona mejor cuando muestra enseguida productos visibles que puedas comparar.',
      compareTitle: usesGenericEnglishTitles
        ? (intentName) => `Compara paginas de ${intentName.toLowerCase()} entre plataformas`
        : baseCopy.compareTitle,
      compareDescription: (_platformName, intentName) =>
        `Si quieres una vista mas amplia, compara tambien las paginas de ${intentName.toLowerCase()} en otras guias de plataforma.`,
      faqTitle: usesGenericEnglishTitles
        ? (platformName) => `Preguntas frecuentes de ${platformName} ${intent.query}`
        : baseCopy.faqTitle,
      faqItems: (siteName, platformName) => [
        {
          question: `Por que ${siteName} tiene una pagina ${platformName} para ${intent.query}?`,
          answer:
            `Porque una pagina dedicada a ${intent.query} facilita empezar mas rapido cuando ya tienes clara la categoria.`,
        },
        {
          question: `Para que sirve esta pagina ${platformName} ${intent.query}?`,
          answer:
            `Sirve para ver mas facilmente productos, categorias y enlaces utiles relacionados con ${intent.query}.`,
        },
        {
          question: `Debo empezar aqui o en la pagina principal de ${platformName}?`,
          answer:
            `Empieza aqui si ya sabes que quieres ${intent.query}. Si aun quieres una vista mas amplia, vuelve primero a la pagina principal de ${platformName}.`,
        },
      ],
    };
  }

  if (safeLocale === 'ar') {
    return {
      heroDescription: (platformName, siteName) =>
        `استكشف منتجات ${platformName} الخاصة بـ ${intent.query} على ${siteName}. هذه الصفحة تجمع المنتجات والفئات والاختصارات المفيدة في مكان واحد.`,
      cards: () => [
        {
          title: `الوصول الى ${intent.name} بشكل اسرع`,
          description: `اذا كنت تعرف مسبقا انك تريد ${intent.query} فهذه الصفحة هي نقطة بداية اسرع من صفحة منصة اوسع.`,
        },
        {
          title: 'جمع اختصارات البحث الشائعة',
          description: `يتم جمع تركيبات spreadsheet و yupoo و links و taobao الخاصة بـ ${intent.query} هنا حتى لا تضطر للبدء من جديد.`,
        },
        {
          title: 'الانتقال اسرع الى المنتجات والفئات',
          description: 'استخدم هذه الصفحة للوصول بشكل اسرع الى الفئات المناسبة والمنتجات الظاهرة والصفحات القريبة.',
        },
      ],
      searchAnglesTitle: usesGenericEnglishTitles
        ? `زوايا البحث عن ${intent.name}`
        : baseCopy.searchAnglesTitle,
      searchAnglesDescription: () =>
        `هذه الصفحة تجمع اكثر طرق البحث شيوعا حول ${intent.query} لتسهيل بدء التصفح.`,
      nextClickTitle: usesGenericEnglishTitles
        ? `افضل خطوة تالية لـ ${intent.query}`
        : baseCopy.nextClickTitle,
      nextClickDescription: () =>
        'الخطوة التالية الافضل غالبا هي فتح الفئة الاقرب او قائمة المنتجات المرتبطة بها.',
      productsTitle: usesGenericEnglishTitles
        ? (platformName) => `اكتشافات ${intent.name} الشائعة لـ ${platformName}`
        : baseCopy.productsTitle,
      productsDescription: () =>
        'تعمل هذه الصفحة بشكل افضل عندما تعرض منتجات واضحة يمكن مقارنتها بسرعة.',
      compareTitle: usesGenericEnglishTitles
        ? (intentName) => `قارن صفحات ${intentName.toLowerCase()} بين المنصات`
        : baseCopy.compareTitle,
      compareDescription: (_platformName, intentName) =>
        `اذا اردت نظرة اوسع، يمكنك ايضا مقارنة صفحات ${intentName.toLowerCase()} في ادلة منصات اخرى.`,
      faqTitle: usesGenericEnglishTitles
        ? (platformName) => `الاسئلة الشائعة حول ${platformName} ${intent.query}`
        : baseCopy.faqTitle,
      faqItems: (siteName, platformName) => [
        {
          question: `لماذا لدى ${siteName} صفحة ${platformName} خاصة بـ ${intent.query}؟`,
          answer:
            `لان الصفحة المخصصة لـ ${intent.query} تجعل البداية اسرع عندما تكون الفئة التي تريدها واضحة بالفعل.`,
        },
        {
          question: `ما فائدة صفحة ${platformName} ${intent.query} هذه؟`,
          answer:
            `تساعدك على رؤية المنتجات والفئات والروابط المفيدة المتعلقة بـ ${intent.query} بشكل اسهل.`,
        },
        {
          question: `هل ابدأ من هنا ام من الصفحة الرئيسية لـ ${platformName}؟`,
          answer:
            `ابدأ من هنا اذا كنت تعرف انك تريد ${intent.query}. واذا كنت تريد نظرة اوسع اولا فارجع الى الصفحة الرئيسية لـ ${platformName}.`,
        },
      ],
    };
  }

  if (safeLocale === 'it') {
    return {
      heroDescription: (platformName, siteName) =>
        `Esplora le selezioni ${platformName} per ${intent.query} su ${siteName}. Questa pagina riunisce prodotti, categorie e scorciatoie utili in un solo posto.`,
      cards: () => [
        {
          title: `Trovare ${intent.name.toLowerCase()} piu in fretta`,
          description: `Se sai gia che vuoi vedere ${intent.query}, questa pagina e un punto di partenza piu diretto di una panoramica piattaforma piu ampia.`,
        },
        {
          title: 'Tenere insieme le scorciatoie piu comuni',
          description: `Le combinazioni con spreadsheet, yupoo, links e taobao legate a ${intent.query} sono raccolte qui per evitare di ricominciare la ricerca.`,
        },
        {
          title: 'Passare prima a prodotti e categorie',
          description: 'Usa questa pagina per arrivare piu rapidamente a categorie utili, prodotti visibili e pagine vicine.',
        },
      ],
      searchAnglesTitle: usesGenericEnglishTitles
        ? `Angoli di ricerca per ${intent.name.toLowerCase()}`
        : baseCopy.searchAnglesTitle,
      searchAnglesDescription: () =>
        `Qui sono raccolti i modi piu comuni per cercare ${intent.query}, cosi e piu semplice iniziare a navigare.`,
      nextClickTitle: usesGenericEnglishTitles
        ? `Miglior prossimo passo per ${intent.query}`
        : baseCopy.nextClickTitle,
      nextClickDescription: () =>
        'Il prossimo clic migliore di solito e la categoria piu vicina o la lista prodotti collegata.',
      productsTitle: usesGenericEnglishTitles
        ? (platformName) => `Selezioni popolari di ${intent.name.toLowerCase()} per ${platformName}`
        : baseCopy.productsTitle,
      productsDescription: () =>
        'Questa pagina funziona meglio quando mostra presto prodotti visibili da confrontare.',
      compareTitle: usesGenericEnglishTitles
        ? (intentName) => `Confronta le pagine ${intentName.toLowerCase()} tra piattaforme`
        : baseCopy.compareTitle,
      compareDescription: (_platformName, intentName) =>
        `Se vuoi una vista piu ampia, confronta anche le pagine ${intentName.toLowerCase()} di altre guide piattaforma.`,
      faqTitle: usesGenericEnglishTitles
        ? (platformName) => `Domande frequenti ${platformName} ${intent.query}`
        : baseCopy.faqTitle,
      faqItems: (siteName, platformName) => [
        {
          question: `Perche ${siteName} ha una pagina ${platformName} per ${intent.query}?`,
          answer:
            `Perche una pagina dedicata a ${intent.query} rende piu semplice iniziare quando la categoria e gia chiara.`,
        },
        {
          question: `A cosa serve questa pagina ${platformName} ${intent.query}?`,
          answer:
            `Serve per vedere piu facilmente prodotti, categorie e link utili collegati a ${intent.query}.`,
        },
        {
          question: `Dovrei iniziare qui o dalla pagina principale di ${platformName}?`,
          answer:
            `Inizia qui se sai gia che vuoi ${intent.query}. Se vuoi prima una vista piu ampia, torna alla pagina principale di ${platformName}.`,
        },
      ],
    };
  }

  if (safeLocale === 'pt') {
    return {
      heroDescription: (platformName, siteName) =>
        `Explore as selecoes ${platformName} para ${intent.query} em ${siteName}. Esta pagina junta produtos, categorias e atalhos uteis no mesmo lugar.`,
      cards: () => [
        {
          title: `Encontrar ${intent.name.toLowerCase()} mais depressa`,
          description: `Se ja sabe que quer ver ${intent.query}, esta pagina e um ponto de partida mais direto do que uma vista ampla da plataforma.`,
        },
        {
          title: 'Juntar os atalhos mais comuns',
          description: `As combinacoes com spreadsheet, yupoo, links e taobao ligadas a ${intent.query} ficam reunidas aqui para evitar recomecar a pesquisa.`,
        },
        {
          title: 'Chegar mais cedo a produtos e categorias',
          description: 'Use esta pagina para entrar mais rapido em categorias uteis, produtos visiveis e paginas relacionadas.',
        },
      ],
      searchAnglesTitle: usesGenericEnglishTitles
        ? `Angulos de pesquisa para ${intent.name.toLowerCase()}`
        : baseCopy.searchAnglesTitle,
      searchAnglesDescription: () =>
        `Aqui ficam reunidas as formas mais comuns de pesquisar ${intent.query} para facilitar o inicio da navegacao.`,
      nextClickTitle: usesGenericEnglishTitles
        ? `Melhor passo seguinte para ${intent.query}`
        : baseCopy.nextClickTitle,
      nextClickDescription: () =>
        'O melhor clique seguinte costuma ser a categoria mais proxima ou a lista de produtos correspondente.',
      productsTitle: usesGenericEnglishTitles
        ? (platformName) => `Selecoes populares de ${intent.name.toLowerCase()} para ${platformName}`
        : baseCopy.productsTitle,
      productsDescription: () =>
        'Esta pagina funciona melhor quando mostra cedo produtos visiveis para comparar.',
      compareTitle: usesGenericEnglishTitles
        ? (intentName) => `Compara paginas de ${intentName.toLowerCase()} entre plataformas`
        : baseCopy.compareTitle,
      compareDescription: (_platformName, intentName) =>
        `Se quiser uma vista mais ampla, compare tambem as paginas de ${intentName.toLowerCase()} noutras guias de plataforma.`,
      faqTitle: usesGenericEnglishTitles
        ? (platformName) => `Perguntas frequentes de ${platformName} ${intent.query}`
        : baseCopy.faqTitle,
      faqItems: (siteName, platformName) => [
        {
          question: `Porque e que ${siteName} tem uma pagina ${platformName} para ${intent.query}?`,
          answer:
            `Porque uma pagina dedicada a ${intent.query} torna o inicio mais simples quando a categoria ja esta clara.`,
        },
        {
          question: `Para que serve esta pagina ${platformName} ${intent.query}?`,
          answer:
            `Serve para ver com mais facilidade produtos, categorias e links uteis relacionados com ${intent.query}.`,
        },
        {
          question: `Devo comecar aqui ou na pagina principal de ${platformName}?`,
          answer:
            `Comece aqui se ja souber que quer ${intent.query}. Se quiser primeiro uma vista mais ampla, volte a pagina principal de ${platformName}.`,
        },
      ],
    };
  }

  return {
    heroDescription: (platformName, siteName) =>
      `Browse ${platformName} ${intent.query} finds on ${siteName}. Use this page when you want a quicker way to scan related products, categories and common shortcuts in one place.`,
    cards: () => [
      {
        title: `Find ${intent.name} faster`,
        description: `If you already know you want ${intent.query}, this page is a quicker starting point than a broad platform overview.`,
      },
      {
        title: 'Keep common shortcuts together',
        description: `Spreadsheet, yupoo, links and taobao combinations around ${intent.query} are grouped here so you can browse without restarting.`,
      },
      {
        title: 'Move into products and categories',
        description: 'Use this page to jump from a broad idea into visible picks, matching categories and nearby topics.',
      },
    ],
    searchAnglesTitle: baseCopy.searchAnglesTitle,
    searchAnglesDescription: () =>
      `People often look for ${intent.query} with spreadsheet, yupoo, links and taobao combinations. This page keeps those starting points together.`,
    nextClickTitle: baseCopy.nextClickTitle,
    nextClickDescription: () =>
      'Open the closest category or product path next if you already know what you want to browse.',
    productsTitle: baseCopy.productsTitle,
    productsDescription: () =>
      'This page works best when it quickly shows visible picks you can compare right away.',
    compareTitle: baseCopy.compareTitle,
    compareDescription: (_platformName, intentName) =>
      `If you want a wider view, compare the same ${intentName.toLowerCase()} category across other platform guides without starting over.`,
    faqTitle: baseCopy.faqTitle,
    faqItems: (siteName, platformName) => [
      {
        question: `Why does ${siteName} have a separate ${platformName} ${intent.query} page?`,
        answer:
          `Because a dedicated ${intent.query} page is a quicker starting point when visitors already know the category they want.`,
      },
      {
        question: `What should I use this ${platformName} ${intent.query} page for?`,
        answer:
          `Use it when you already know the category you want to browse and want a shorter path into relevant products, brands and related links.`,
      },
      {
        question: `Should I start here or on the main ${platformName} page?`,
        answer:
          `Start here if you already know you want ${intent.query}. Use the main ${platformName} guide when you still need a broader overview first.`,
      },
    ],
  };
}

export function getPlatformLandingIntentDetailCopy(
  intent: PlatformLandingIntentConfig,
  locale: string = defaultLocale,
  config?: PlatformLandingConfig,
): PlatformLandingIntentDetailCopy {
  const safeLocale = normalizeLocale(locale);
  const localeCopy = PLATFORM_INTENT_DETAIL_COPY[safeLocale as 'en' | 'zh'];
  const narrativeKey = config ? getPlatformLandingNarrativeKey(config) : null;

  if (
    narrativeKey &&
    ['fr', 'de', 'es', 'ar', 'it', 'pt'].includes(safeLocale) &&
    PLATFORM_INTENT_NARRATIVE_TERMS[safeLocale as PlatformLandingIntentNarrativeLocale][
      intent.slug as keyof typeof PLATFORM_INTENT_NARRATIVE_TERMS[PlatformLandingIntentNarrativeLocale]
    ]
  ) {
    const narrativeCopy = createNarrativeIntentCopy(
      config!,
      intent,
      safeLocale as PlatformLandingIntentNarrativeLocale,
      narrativeKey,
    );

    if (narrativeCopy) {
      return createCustomerFacingIntentDetailCopy(safeLocale, intent, narrativeCopy);
    }
  }

  if (safeLocale === 'zh') {
    return createCustomerFacingIntentDetailCopy(
      safeLocale,
      intent,
      localeCopy?.[intent.slug as keyof typeof localeCopy] || PLATFORM_INTENT_DETAIL_COPY_ZH_FALLBACK,
    );
  }

  return createCustomerFacingIntentDetailCopy(
    safeLocale,
    intent,
    localeCopy?.[intent.slug as keyof typeof localeCopy] || createGenericIntentDetailCopy(intent),
  );
}

export function getPlatformLandingIntentSeoDescription(
  config: PlatformLandingConfig,
  intent: PlatformLandingIntentConfig,
  locale: string = defaultLocale,
) {
  const safeLocale = normalizeLocale(locale);
  const narrativeKey = getPlatformLandingNarrativeKey(config);

  if (narrativeKey && ['fr', 'de', 'es', 'ar', 'it', 'pt'].includes(safeLocale)) {
    const terms =
      PLATFORM_INTENT_NARRATIVE_TERMS[safeLocale as PlatformLandingIntentNarrativeLocale][
        intent.slug as keyof typeof PLATFORM_INTENT_NARRATIVE_TERMS[PlatformLandingIntentNarrativeLocale]
      ];

    if (terms) {
      const siteName = getSiteName();

      if (safeLocale === 'fr') {
        return `Explorez les selections ${config.name} autour de ${terms.title} sur ${siteName}. Parcourez plus vite categories, produits et liens utiles depuis une page plus claire.`;
      }

      if (safeLocale === 'de') {
        return `Entdecke ${config.name} Auswahl rund um ${terms.title} auf ${siteName}. Durchsuche schneller Kategorien, Produkte und nutzliche Links uber eine klarere Seite.`;
      }

      if (safeLocale === 'es') {
        return `Explora las selecciones de ${config.name} para ${terms.title} en ${siteName}. Recorre categorias, productos y links utiles desde una pagina mas clara.`;
      }

      if (safeLocale === 'ar') {
        return `استكشف صفحات ${config.name} الخاصة بـ ${terms.title} على ${siteName}. تصفح الفئات والمنتجات والروابط المفيدة من خلال صفحة اوضح واسهل.`;
      }

      if (safeLocale === 'it') {
        return `Esplora le selezioni ${config.name} per ${terms.title} su ${siteName}. Sfoglia categorie, prodotti e link utili da una pagina piu chiara.`;
      }

      return `Explore as selecoes de ${config.name} para ${terms.title} no ${siteName}. Veja categorias, produtos e links uteis numa pagina mais clara.`;
    }
  }

  return (
    safeLocale === 'fr'
      ? `Explorez les selections ${config.name} pour ${intent.query} sur ${getSiteName()}. Parcourez categories, produits et liens utiles depuis une page plus claire.`
      : safeLocale === 'de'
        ? `Entdecke ${config.name} Auswahl fur ${intent.query} auf ${getSiteName()}. Durchsuche Kategorien, Produkte und nutzliche Links uber eine klarere Seite.`
        : safeLocale === 'es'
          ? `Explora las selecciones de ${config.name} para ${intent.query} en ${getSiteName()}. Recorre categorias, productos y links utiles desde una pagina mas clara.`
          : safeLocale === 'ar'
            ? `استكشف صفحات ${config.name} الخاصة بـ ${intent.query} على ${getSiteName()}. تصفح الفئات والمنتجات والروابط المفيدة من خلال صفحة اوضح.`
            : safeLocale === 'it'
              ? `Esplora le selezioni ${config.name} per ${intent.query} su ${getSiteName()}. Sfoglia categorie, prodotti e link utili da una pagina piu chiara.`
              : safeLocale === 'pt'
                ? `Explore as selecoes de ${config.name} para ${intent.query} no ${getSiteName()}. Veja categorias, produtos e links uteis numa pagina mais clara.`
                : `Explore ${config.name} ${intent.query} finds on ${getSiteName()}. Browse useful ${intent.query} picks, categories, products and helpful links from one clearer page.`
  );
}

export function getPlatformLandingIntentPageUiCopy(
  locale: string = defaultLocale,
): PlatformLandingIntentPageUiCopy {
  const safeLocale = normalizeLocale(locale);

  if (safeLocale === 'zh') {
    return {
      browseLabel: (intentName) => `浏览 ${intentName}`,
      backToGuideLabel: (platformName) => `返回 ${platformName} 指南`,
      matchedCategoryDescription: (categoryLabel) => `已将这个主题匹配到 ${categoryLabel} 分类。`,
      noExactCategoryDescription: '暂未命中精确分类，因此当前页面会回退到热门商品。',
      openCategoryLabel: (categoryLabel) => `打开 ${categoryLabel}`,
      browseProductsLabel: '浏览商品',
      openMainPageLabel: (platformName) => `打开 ${platformName} 主页面`,
      viewAllLabel: (intentName) => `查看全部 ${intentName.toLowerCase()}`,
    };
  }

  if (safeLocale === 'fr') {
    return {
      browseLabel: (intentName) => `Explorer ${intentName}`,
      backToGuideLabel: (platformName) => `Retour au guide ${platformName}`,
      matchedCategoryDescription: (categoryLabel) => `Nous avons rattache ce sujet a la categorie ${categoryLabel}.`,
      noExactCategoryDescription: "Aucune categorie exacte n'a ete trouvee, la page bascule donc vers les produits populaires.",
      openCategoryLabel: (categoryLabel) => `Ouvrir ${categoryLabel}`,
      browseProductsLabel: 'Voir les produits',
      openMainPageLabel: (platformName) => `Ouvrir la page principale ${platformName}`,
      viewAllLabel: (intentName) => `Voir tous les ${intentName.toLowerCase()}`,
    };
  }

  if (safeLocale === 'de') {
    return {
      browseLabel: (intentName) => `${intentName} durchsuchen`,
      backToGuideLabel: (platformName) => `Zuruck zum ${platformName}-guide`,
      matchedCategoryDescription: (categoryLabel) => `Dieses Thema wurde der Kategorie ${categoryLabel} zugeordnet.`,
      noExactCategoryDescription: 'Es wurde keine exakte Kategorie gefunden, daher fallt die Seite auf beliebte Produkte zuruck.',
      openCategoryLabel: (categoryLabel) => `${categoryLabel} offnen`,
      browseProductsLabel: 'Produkte durchsuchen',
      openMainPageLabel: (platformName) => `${platformName}-hauptseite offnen`,
      viewAllLabel: (intentName) => `Alle ${intentName.toLowerCase()} ansehen`,
    };
  }

  if (safeLocale === 'es') {
    return {
      browseLabel: (intentName) => `Explorar ${intentName}`,
      backToGuideLabel: (platformName) => `Volver a la guia de ${platformName}`,
      matchedCategoryDescription: (categoryLabel) => `Hemos vinculado este tema con la categoria ${categoryLabel}.`,
      noExactCategoryDescription: 'No se encontro una categoria exacta, asi que la pagina recurre a productos populares.',
      openCategoryLabel: (categoryLabel) => `Abrir ${categoryLabel}`,
      browseProductsLabel: 'Ver productos',
      openMainPageLabel: (platformName) => `Abrir la pagina principal de ${platformName}`,
      viewAllLabel: (intentName) => `Ver todos los ${intentName.toLowerCase()}`,
    };
  }

  if (safeLocale === 'ar') {
    return {
      browseLabel: (intentName) => `تصفح ${intentName}`,
      backToGuideLabel: (platformName) => `العودة الى دليل ${platformName}`,
      matchedCategoryDescription: (categoryLabel) => `قمنا بربط هذا الموضوع بفئة ${categoryLabel}.`,
      noExactCategoryDescription: 'لم يتم العثور على فئة مطابقة تماما، لذلك تعود الصفحة الى المنتجات الشائعة.',
      openCategoryLabel: (categoryLabel) => `افتح ${categoryLabel}`,
      browseProductsLabel: 'تصفح المنتجات',
      openMainPageLabel: (platformName) => `افتح الصفحة الرئيسية لـ ${platformName}`,
      viewAllLabel: (intentName) => `عرض كل ${intentName.toLowerCase()}`,
    };
  }

  if (safeLocale === 'it') {
    return {
      browseLabel: (intentName) => `Esplora ${intentName}`,
      backToGuideLabel: (platformName) => `Torna alla guida ${platformName}`,
      matchedCategoryDescription: (categoryLabel) => `Abbiamo collegato questa pagina alla categoria ${categoryLabel}.`,
      noExactCategoryDescription: 'Non e stata trovata una categoria esatta, quindi la pagina ripiega sui prodotti popolari.',
      openCategoryLabel: (categoryLabel) => `Apri ${categoryLabel}`,
      browseProductsLabel: 'Sfoglia prodotti',
      openMainPageLabel: (platformName) => `Apri la pagina principale di ${platformName}`,
      viewAllLabel: (intentName) => `Vedi tutti i ${intentName.toLowerCase()}`,
    };
  }

  if (safeLocale === 'pt') {
    return {
      browseLabel: (intentName) => `Explorar ${intentName}`,
      backToGuideLabel: (platformName) => `Voltar ao guia de ${platformName}`,
      matchedCategoryDescription: (categoryLabel) => `Ligamos esta pagina a categoria ${categoryLabel}.`,
      noExactCategoryDescription: 'Nao foi encontrada uma categoria exata, por isso a pagina recorre aos produtos populares.',
      openCategoryLabel: (categoryLabel) => `Abrir ${categoryLabel}`,
      browseProductsLabel: 'Ver produtos',
      openMainPageLabel: (platformName) => `Abrir a pagina principal de ${platformName}`,
      viewAllLabel: (intentName) => `Ver todos os ${intentName.toLowerCase()}`,
    };
  }

  return {
    browseLabel: (intentName) => `Browse ${intentName}`,
    backToGuideLabel: (platformName) => `Back to ${platformName} Guide`,
    matchedCategoryDescription: (categoryLabel) => `We matched this page to the ${categoryLabel} category.`,
    noExactCategoryDescription: 'No exact category match was found, so the page falls back to popular products.',
    openCategoryLabel: (categoryLabel) => `Open ${categoryLabel}`,
    browseProductsLabel: 'Browse products',
    openMainPageLabel: (platformName) => `Open ${platformName} main page`,
    viewAllLabel: (intentName) => `View all ${intentName.toLowerCase()}`,
  };
}

function createNarrativeIntentJourneyCopy(
  intent: PlatformLandingIntentConfig,
  locale: PlatformLandingIntentNarrativeLocale,
  narrativeKey: PlatformLandingNarrativeKey,
): PlatformLandingIntentJourneyCopy | null {
  const terms = getPlatformLandingIntentLocalizedTerms(intent, locale);

  if (!terms) {
    return null;
  }

  if (locale === 'fr') {
    const mode =
      narrativeKey === 'research_heavy'
        ? 'plus analytique'
        : narrativeKey === 'visual_mix'
          ? 'plus visuelle'
          : narrativeKey === 'stable_workflow'
            ? 'plus stable'
            : narrativeKey === 'practical_route'
              ? 'plus pragmatique'
              : narrativeKey === 'direct_links'
                ? 'plus directe'
                : 'plus marquee';

    return {
      relatedRoutesTitle: (platformName, intentName) => `Pages ${intentName.toLowerCase()} liees pour ${platformName}`,
      relatedRoutesDescription: (platformName) =>
        `Sur ${platformName}, une session ${terms.title} ${mode} s'etend souvent vers des pages voisines, des categories proches et des comparaisons entre plateformes avant le clic final.`,
      sessionTitle: 'Continuer la navigation ou comparer',
      sessionDescription: (platformName, intentName) =>
        `Utilisez le guide ${platformName} si vous voulez reprendre une vue plus large, ou restez autour de ${intentName.toLowerCase()} pour comparer des pages voisines sans relancer une autre recherche.`,
      guideLabel: (platformName) => `Ouvrir le guide complet ${platformName}`,
      guideDescription: (platformName) =>
        `Revenez a l'entree plus large de ${platformName} pour comparer davantage de categories depuis un seul point.`,
      compareLabel: (pageName, intentName) => `Comparer ${intentName.toLowerCase()} sur ${pageName}`,
      compareDescription: (pageName, intentName) =>
        `Verifiez comment ${pageName} organise la meme page ${intentName.toLowerCase()} avant de continuer plus loin.`,
    };
  }

  if (locale === 'de') {
    const mode =
      narrativeKey === 'research_heavy'
        ? 'analytischere'
        : narrativeKey === 'visual_mix'
          ? 'visuellere'
          : narrativeKey === 'stable_workflow'
            ? 'ruhigere'
            : narrativeKey === 'practical_route'
              ? 'pragmatischere'
              : narrativeKey === 'direct_links'
                ? 'direktere'
                : 'markenlastigere';

    return {
      relatedRoutesTitle: (platformName, intentName) => `Verwandte ${intentName.toLowerCase()}-seiten fur ${platformName}`,
      relatedRoutesDescription: (platformName) =>
        `Bei ${platformName} weitet sich eine ${terms.title}-Suche in ${mode} Sitzungen oft auf benachbarte Seiten, nahe Kategorien und Plattform-Vergleiche aus, bevor der nachste Klick fallt.`,
      sessionTitle: 'Weiter browsen oder vergleichen',
      sessionDescription: (platformName, intentName) =>
        `Nutzen Sie den breiteren ${platformName}-Guide, wenn Sie wieder mehr Uberblick brauchen, oder bleiben Sie nah an ${intentName.toLowerCase()}, um angrenzende Seiten sauber zu vergleichen.`,
      guideLabel: (platformName) => `Den kompletten ${platformName}-guide offnen`,
      guideDescription: (platformName) =>
        `Zuruck zur breiteren ${platformName}-Landingpage, um mehr Kategorien von einem Einstieg aus zu vergleichen.`,
      compareLabel: (pageName, intentName) => `${intentName.toLowerCase()} auf ${pageName} vergleichen`,
      compareDescription: (pageName, intentName) =>
        `Prufen Sie, wie ${pageName} dieselbe ${intentName.toLowerCase()}-Seite strukturiert, bevor Sie tiefer klicken.`,
    };
  }

  if (locale === 'ar') {
    const mode =
      narrativeKey === 'research_heavy'
        ? 'اكثر تحليلا'
        : narrativeKey === 'visual_mix'
          ? 'اكثر بصرية'
          : narrativeKey === 'stable_workflow'
            ? 'اكثر استقرارا'
            : narrativeKey === 'practical_route'
              ? 'اكثر عملية'
              : narrativeKey === 'direct_links'
                ? 'اكثر مباشرة'
                : 'اكثر ارتباطا بالعلامة';

    return {
      relatedRoutesTitle: (platformName, intentName) => `صفحات ${intentName.toLowerCase()} المرتبطة لـ ${platformName}`,
      relatedRoutesDescription: (platformName) =>
        `في ${platformName} تتمدد جلسة ${terms.title} ${mode} غالبا نحو صفحات مجاورة وفئات قريبة ومقارنات بين المنصات قبل النقرة التالية.`,
      sessionTitle: 'اكمل التصفح او قارن',
      sessionDescription: (platformName, intentName) =>
        `استخدم دليل ${platformName} الاوسع اذا كنت تريد استعادة الصورة العامة، او ابق قريبا من ${intentName.toLowerCase()} لمقارنة الصفحات المجاورة بدون بدء بحث جديد.`,
      guideLabel: (platformName) => `افتح دليل ${platformName} الكامل`,
      guideDescription: (platformName) =>
        `عد الى مدخل ${platformName} الاوسع لمقارنة مزيد من الفئات من نقطة واحدة.`,
      compareLabel: (pageName, intentName) => `قارن ${intentName.toLowerCase()} على ${pageName}`,
      compareDescription: (pageName, intentName) =>
        `راجع كيف يرتب ${pageName} صفحة ${intentName.toLowerCase()} نفسها قبل المتابعة.`,
    };
  }

  if (locale === 'it') {
    const mode =
      narrativeKey === 'research_heavy'
        ? 'piu analitica'
        : narrativeKey === 'visual_mix'
          ? 'piu visiva'
          : narrativeKey === 'stable_workflow'
            ? 'piu stabile'
            : narrativeKey === 'practical_route'
              ? 'piu pratica'
              : narrativeKey === 'direct_links'
                ? 'piu diretta'
                : 'piu orientata al brand';

    return {
      relatedRoutesTitle: (platformName, intentName) => `Pagine ${intentName.toLowerCase()} correlate per ${platformName}`,
      relatedRoutesDescription: (platformName) =>
        `Su ${platformName}, una sessione ${terms.title} ${mode} si allarga spesso verso pagine vicine, categorie affini e confronti tra piattaforme prima del clic successivo.`,
      sessionTitle: 'Continua a navigare o confronta',
      sessionDescription: (platformName, intentName) =>
        `Usa la guida piu ampia di ${platformName} se hai bisogno di riprendere il contesto generale, oppure resta vicino a ${intentName.toLowerCase()} per confrontare pagine vicine senza rifare una nuova ricerca.`,
      guideLabel: (platformName) => `Apri la guida completa di ${platformName}`,
      guideDescription: (platformName) =>
        `Torna all'ingresso piu ampio di ${platformName} per confrontare piu categorie da un solo punto.`,
      compareLabel: (pageName, intentName) => `Confronta ${intentName.toLowerCase()} su ${pageName}`,
      compareDescription: (pageName, intentName) =>
        `Controlla come ${pageName} struttura la stessa pagina ${intentName.toLowerCase()} prima di scendere oltre.`,
    };
  }

  if (locale === 'pt') {
    const mode =
      narrativeKey === 'research_heavy'
        ? 'mais analitica'
        : narrativeKey === 'visual_mix'
          ? 'mais visual'
          : narrativeKey === 'stable_workflow'
            ? 'mais estavel'
            : narrativeKey === 'practical_route'
              ? 'mais pratica'
              : narrativeKey === 'direct_links'
                ? 'mais direta'
                : 'mais marcada por marca';

    return {
      relatedRoutesTitle: (platformName, intentName) => `Paginas relacionadas de ${intentName.toLowerCase()} para ${platformName}`,
      relatedRoutesDescription: (platformName) =>
        `Em ${platformName}, uma sessao de ${terms.title} ${mode} costuma abrir-se para paginas vizinhas, categorias proximas e comparacoes entre plataformas antes do clique seguinte.`,
      sessionTitle: 'Continuar a navegar ou comparar',
      sessionDescription: (platformName, intentName) =>
        `Use o guia mais amplo de ${platformName} se precisar de recuperar contexto, ou fique perto de ${intentName.toLowerCase()} para comparar paginas proximas sem voltar a pesquisar.`,
      guideLabel: (platformName) => `Abrir o guia completo de ${platformName}`,
      guideDescription: (platformName) =>
        `Volte para a entrada mais ampla de ${platformName} para comparar mais categorias a partir de um unico ponto.`,
      compareLabel: (pageName, intentName) => `Comparar ${intentName.toLowerCase()} em ${pageName}`,
      compareDescription: (pageName, intentName) =>
        `Veja como ${pageName} organiza a mesma pagina ${intentName.toLowerCase()} antes de descer mais.`,
    };
  }

  const mode =
    narrativeKey === 'research_heavy'
      ? 'mas analitica'
      : narrativeKey === 'visual_mix'
        ? 'mas visual'
        : narrativeKey === 'stable_workflow'
          ? 'mas estable'
          : narrativeKey === 'practical_route'
            ? 'mas practica'
            : narrativeKey === 'direct_links'
              ? 'mas directa'
              : 'mas marcada por marca';

  return {
    relatedRoutesTitle: (platformName, intentName) => `Rutas relacionadas de ${intentName.toLowerCase()} para ${platformName}`,
    relatedRoutesDescription: (platformName) =>
      `En ${platformName}, una sesion de ${terms.title} ${mode} suele abrirse hacia paginas vecinas, categorias cercanas y comparaciones entre plataformas antes del siguiente clic.`,
    sessionTitle: 'Seguir navegando o comparar',
    sessionDescription: (platformName, intentName) =>
      `Usa la guia mas amplia de ${platformName} si necesitas recuperar contexto, o mantente cerca de ${intentName.toLowerCase()} para comparar paginas cercanas sin volver a buscar.`,
    guideLabel: (platformName) => `Abrir la guia completa de ${platformName}`,
    guideDescription: (platformName) =>
      `Vuelve a la entrada mas amplia de ${platformName} para comparar mas categorias desde un solo punto.`,
    compareLabel: (pageName, intentName) => `Compara ${intentName.toLowerCase()} en ${pageName}`,
    compareDescription: (pageName, intentName) =>
      `Revisa como ${pageName} ordena la misma pagina de ${intentName.toLowerCase()} antes de seguir bajando.`,
  };
}

function createNarrativeIntentUserFitCopy(
  intent: PlatformLandingIntentConfig,
  locale: PlatformLandingIntentNarrativeLocale,
  narrativeKey: PlatformLandingNarrativeKey,
): PlatformLandingIntentUserFitCopy | null {
  const terms = getPlatformLandingIntentLocalizedTerms(intent, locale);

  if (!terms) {
    return null;
  }

  if (locale === 'fr') {
    const routeMode =
      narrativeKey === 'research_heavy'
        ? 'plus analytique'
        : narrativeKey === 'visual_mix'
          ? 'plus visuelle'
          : narrativeKey === 'stable_workflow'
            ? 'plus stable'
            : narrativeKey === 'practical_route'
              ? 'plus pragmatique'
              : narrativeKey === 'direct_links'
                ? 'plus directe'
                : 'plus marquee';

    return {
      sectionTitle: (platformName, intentName) => `Quand ouvrir la page ${platformName} ${intentName}`,
      sectionDescription: (_platformName, _intentQuery, categoryLabel) =>
        categoryLabel
          ? `Cette page ${terms.title} s'aligne deja sur ${categoryLabel}, donc elle marche mieux quand la session a quitte la decouverte large pour entrer dans une demande ${routeMode} plus precise.`
          : `Sans categorie exacte, cette page ${terms.title} sert davantage de page de decouverte ${routeMode} avant de basculer vers les produits ou les pages voisines.`,
      cards: (platformName, intentName, intentQuery, categoryLabel) => [
        {
          eyebrow: 'Ideal pour',
          title: `Des visiteurs deja centres sur ${terms.title}`,
          description:
            `Si l'utilisateur sait deja qu'il veut ${intentQuery}, cette page ${platformName} ${routeMode} doit battre une vue plateforme trop large.`,
        },
        {
          eyebrow: 'Ajustement actuel',
          title: categoryLabel ? `Relie a ${categoryLabel}` : 'Decouverte d abord, tri ensuite',
          description:
            categoryLabel
              ? `La page peut faire passer la demande ${intentName.toLowerCase()} plus naturellement vers ${categoryLabel}, ce qui raccourcit le chemin jusqu'aux produits visibles.`
              : `Sans correspondance exacte, cette page garde surtout une fonction de decouverte avant la bascule vers des produits ou des pages voisines.`,
        },
        {
          eyebrow: 'Et apres',
          title: `Comparer les pages ${intentName.toLowerCase()} voisines`,
          description:
            `Apres ${platformName} ${intentName.toLowerCase()}, l'etape utile suivante reste souvent une page voisine ou le guide plateforme plus large, pas une nouvelle recherche generique.`,
        },
      ],
    };
  }

  if (locale === 'de') {
    const routeMode =
      narrativeKey === 'research_heavy'
        ? 'analytischeren'
        : narrativeKey === 'visual_mix'
          ? 'visuelleren'
          : narrativeKey === 'stable_workflow'
            ? 'ruhigeren'
            : narrativeKey === 'practical_route'
              ? 'pragmatischeren'
              : narrativeKey === 'direct_links'
                ? 'direkteren'
                : 'markenlastigeren';

    return {
      sectionTitle: (platformName, intentName) => `Wann die ${platformName}-${intentName}-seite sinnvoll ist`,
      sectionDescription: (_platformName, _intentQuery, categoryLabel) =>
        categoryLabel
          ? `Diese ${terms.title}-Seite passt bereits zur Kategorie ${categoryLabel} und funktioniert daher am besten, wenn die Sitzung schon aus dem breiten Browse-Modus in eine ${routeMode} Absicht gewechselt ist.`
          : `Ohne exakte Kategorie funktioniert diese ${terms.title}-Seite eher als ${routeMode} Entdeckungsseite, bevor Produkte oder benachbarte Seiten ubernehmen.`,
      cards: (platformName, intentName, intentQuery, categoryLabel) => [
        {
          eyebrow: 'Am besten fur',
          title: `Besucher mit klarer ${terms.title}-absicht`,
          description:
            `Wenn Nutzer bereits wissen, dass sie ${intentQuery} wollen, sollte diese ${platformName}-Seite einen breiteren Plattform-Uberblick ubertreffen.`,
        },
        {
          eyebrow: 'Aktuelle Passung',
          title: categoryLabel ? `An ${categoryLabel} angebunden` : 'Erst entdecken, dann filtern',
          description:
            categoryLabel
              ? `Die Seite kann ${intentName.toLowerCase()}-Nachfrage naturlicher in ${categoryLabel} ubergeben und damit den Weg zu sichtbaren Produkten verkurzen.`
              : `Ohne exakte Kategorie passt diese Seite eher fur Exploration, bevor die Sitzung in Produkte oder nahe Seiten fallt.`,
        },
        {
          eyebrow: 'Danach',
          title: `Benachbarte ${intentName.toLowerCase()}-seiten vergleichen`,
          description:
            `Nach ${platformName} ${intentName.toLowerCase()} ist der nachste sinnvolle Schritt meist eine angrenzende Seite oder der breitere Plattform-Guide statt einer neuen generischen Suche.`,
        },
      ],
    };
  }

  if (locale === 'ar') {
    const routeMode =
      narrativeKey === 'research_heavy'
        ? 'اكثر تحليلا'
        : narrativeKey === 'visual_mix'
          ? 'اكثر بصرية'
          : narrativeKey === 'stable_workflow'
            ? 'اكثر استقرارا'
            : narrativeKey === 'practical_route'
              ? 'اكثر عملية'
              : narrativeKey === 'direct_links'
                ? 'اكثر مباشرة'
                : 'اكثر ارتباطا بالعلامة';

    return {
      sectionTitle: (platformName, intentName) => `متى تفتح صفحة ${platformName} ${intentName}`,
      sectionDescription: (_platformName, _intentQuery, categoryLabel) =>
        categoryLabel
          ? `هذه الصفحة الخاصة بـ ${terms.title} مرتبطة بالفعل بفئة ${categoryLabel} ولذلك تعمل بشكل افضل عندما تكون الجلسة قد غادرت التصفح العام ودخلت في نية ${routeMode}.`
          : `من دون فئة دقيقة تعمل هذه الصفحة الخاصة بـ ${terms.title} اكثر كصفحة اكتشاف ${routeMode} قبل النزول الى المنتجات او الصفحات القريبة.`,
      cards: (platformName, intentName, intentQuery, categoryLabel) => [
        {
          eyebrow: 'الافضل لـ',
          title: `المستخدمين ذوي نية واضحة نحو ${terms.title}`,
          description:
            `اذا كان المستخدم يعرف مسبقا انه يريد ${intentQuery} فيفترض ان تتفوق هذه الصفحة من ${platformName} على صفحة منصة اعم.`,
        },
        {
          eyebrow: 'الملاءمة الحالية',
          title: categoryLabel ? `مرتبط بـ ${categoryLabel}` : 'اكتشاف اولا ثم تصفية',
          description:
            categoryLabel
              ? `الصفحة قادرة على تمرير طلب ${intentName.toLowerCase()} نحو ${categoryLabel} بشكل اكثر طبيعية مما يقصر الطريق الى المنتجات الواضحة.`
              : `من دون فئة دقيقة تعمل هذه الصفحة بشكل افضل للاستكشاف قبل الانتقال الى المنتجات او الصفحات المجاورة.`,
        },
        {
          eyebrow: 'الخطوة التالية',
          title: `قارن صفحات ${intentName.toLowerCase()} المجاورة`,
          description:
            `بعد ${platformName} ${intentName.toLowerCase()} تكون الخطوة الانسب غالبا صفحة قريبة او دليل المنصة العام وليس بحثا عاما جديدا.`,
        },
      ],
    };
  }

  if (locale === 'it') {
    const routeMode =
      narrativeKey === 'research_heavy'
        ? 'piu analitica'
        : narrativeKey === 'visual_mix'
          ? 'piu visiva'
          : narrativeKey === 'stable_workflow'
            ? 'piu stabile'
            : narrativeKey === 'practical_route'
              ? 'piu pratica'
              : narrativeKey === 'direct_links'
                ? 'piu diretta'
                : 'piu orientata al brand';

    return {
      sectionTitle: (platformName, intentName) => `Quando aprire la pagina ${platformName} ${intentName}`,
      sectionDescription: (_platformName, _intentQuery, categoryLabel) =>
        categoryLabel
          ? `Questa pagina ${terms.title} e gia allineata con la categoria ${categoryLabel}, quindi funziona meglio quando la sessione ha gia lasciato la scoperta ampia ed e entrata in un'intenzione ${routeMode}.`
          : `Senza una categoria esatta, questa pagina ${terms.title} funziona piu come pagina di scoperta ${routeMode} prima di scendere su prodotti o pagine vicine.`,
      cards: (platformName, intentName, intentQuery, categoryLabel) => [
        {
          eyebrow: 'Ideale per',
          title: `Utenti con un'intenzione chiara su ${terms.title}`,
          description:
            `Se l'utente sa gia che vuole ${intentQuery}, questa pagina di ${platformName} dovrebbe rendere meglio di una panoramica piattaforma troppo ampia.`,
        },
        {
          eyebrow: 'Aderenza attuale',
          title: categoryLabel ? `Collegata a ${categoryLabel}` : 'Prima scoperta, poi filtro',
          description:
            categoryLabel
              ? `La pagina puo far passare la domanda ${intentName.toLowerCase()} verso ${categoryLabel} in modo piu naturale, accorciando il percorso fino ai prodotti visibili.`
              : `Senza una categoria esatta, questa pagina lavora meglio come esplorazione prima di scendere su prodotti o pagine vicine.`,
        },
        {
          eyebrow: 'Passo dopo',
          title: `Confronta pagine vicine di ${intentName.toLowerCase()}`,
          description:
            `Dopo ${platformName} ${intentName.toLowerCase()}, il passo piu utile e spesso una pagina vicina o la guida piattaforma piu ampia, non una nuova ricerca generica.`,
        },
      ],
    };
  }

  if (locale === 'pt') {
    const routeMode =
      narrativeKey === 'research_heavy'
        ? 'mais analitica'
        : narrativeKey === 'visual_mix'
          ? 'mais visual'
          : narrativeKey === 'stable_workflow'
            ? 'mais estavel'
            : narrativeKey === 'practical_route'
              ? 'mais pratica'
              : narrativeKey === 'direct_links'
                ? 'mais direta'
                : 'mais marcada por marca';

    return {
      sectionTitle: (platformName, intentName) => `Quando abrir a pagina ${platformName} ${intentName}`,
      sectionDescription: (_platformName, _intentQuery, categoryLabel) =>
        categoryLabel
          ? `Esta pagina de ${terms.title} ja esta alinhada com a categoria ${categoryLabel}, por isso funciona melhor quando a sessao ja saiu da exploracao ampla e entrou numa intencao ${routeMode}.`
          : `Sem uma categoria exata, esta pagina de ${terms.title} funciona mais como pagina de descoberta ${routeMode} antes de descer para produtos ou paginas proximas.`,
      cards: (platformName, intentName, intentQuery, categoryLabel) => [
        {
          eyebrow: 'Ideal para',
          title: `Utilizadores com intencao clara de ${terms.title}`,
          description:
            `Se o utilizador ja sabe que quer ${intentQuery}, esta pagina de ${platformName} deve render melhor do que uma vista de plataforma demasiado ampla.`,
        },
        {
          eyebrow: 'Ajuste atual',
          title: categoryLabel ? `Ligada a ${categoryLabel}` : 'Primeiro descobrir, depois filtrar',
          description:
            categoryLabel
              ? `A pagina consegue passar a procura por ${intentName.toLowerCase()} para ${categoryLabel} de forma mais natural, encurtando o caminho ate produtos visiveis.`
              : `Sem uma categoria exata, esta pagina funciona melhor para explorar antes de cair em produtos ou paginas vizinhas.`,
        },
        {
          eyebrow: 'Passo seguinte',
          title: `Comparar paginas vizinhas de ${intentName.toLowerCase()}`,
          description:
            `Depois de ${platformName} ${intentName.toLowerCase()}, o passo mais util costuma ser uma pagina proxima ou o guia geral da plataforma, e nao outra pesquisa generica.`,
        },
      ],
    };
  }

  const routeMode =
    narrativeKey === 'research_heavy'
      ? 'mas analitica'
      : narrativeKey === 'visual_mix'
        ? 'mas visual'
        : narrativeKey === 'stable_workflow'
          ? 'mas estable'
          : narrativeKey === 'practical_route'
            ? 'mas practica'
            : narrativeKey === 'direct_links'
              ? 'mas directa'
              : 'mas marcada por marca';

  return {
    sectionTitle: (platformName, intentName) => `Cuando abrir la pagina ${platformName} ${intentName}`,
    sectionDescription: (_platformName, _intentQuery, categoryLabel) =>
      categoryLabel
        ? `Esta pagina de ${terms.title} ya encaja con la categoria ${categoryLabel}, asi que funciona mejor cuando la sesion ya salio de la exploracion amplia y entro en una intencion ${routeMode}.`
        : `Sin una categoria exacta, esta pagina de ${terms.title} funciona mas como pagina de descubrimiento ${routeMode} antes de bajar a productos o paginas cercanas.`,
    cards: (platformName, intentName, intentQuery, categoryLabel) => [
      {
        eyebrow: 'Ideal para',
        title: `Usuarios con intencion clara de ${terms.title}`,
        description:
          `Si el usuario ya sabe que quiere ${intentQuery}, esta pagina de ${platformName} deberia rendir mejor que una vista de plataforma demasiado amplia.`,
      },
      {
        eyebrow: 'Ajuste actual',
        title: categoryLabel ? `Conectada con ${categoryLabel}` : 'Primero descubrir, despues filtrar',
        description:
            categoryLabel
              ? `La pagina puede pasar la demanda de ${intentName.toLowerCase()} hacia ${categoryLabel} de forma mas natural, acortando el camino hasta productos visibles.`
            : `Sin una categoria exacta, esta pagina funciona mejor para explorar antes de caer en productos o paginas vecinas.`,
      },
      {
        eyebrow: 'Siguiente paso',
        title: `Comparar paginas vecinas de ${intentName.toLowerCase()}`,
        description:
          `Despues de ${platformName} ${intentName.toLowerCase()}, lo mas util suele ser una pagina cercana o la guia general de la plataforma, no otra busqueda generica.`,
      },
    ],
  };
}
