const ALL_LOCALES = ['en', 'zh', 'fr', 'de', 'es', 'it', 'pt', 'ar'] as const;

/**
 * 生成完整的 hreflang alternates 配置
 * @param path - 不含 locale 前缀的路径，如 '/products/nike-dunk'
 * @param currentLocale - 当前 locale
 */
export function generateAlternates(
  path: string,
  currentLocale: string,
  siteUrl = '',
) {
  const languages: Record<string, string> = Object.fromEntries(
    ALL_LOCALES.map((l) => [l, `${siteUrl}/${l}${path}`]),
  );
  languages['x-default'] = `${siteUrl}/en${path}`;
  return {
    canonical: `${siteUrl}/${currentLocale}${path}`,
    languages,
  };
}

/**
 * locale → OpenGraph locale 映射
 */
const OG_LOCALE_MAP: Record<string, string> = {
  en: 'en_US',
  zh: 'zh_CN',
  fr: 'fr_FR',
  de: 'de_DE',
  es: 'es_ES',
  it: 'it_IT',
  pt: 'pt_BR',
  ar: 'ar_SA',
};

export function getOgLocale(locale: string): string {
  return OG_LOCALE_MAP[locale] || 'en_US';
}

const PRODUCT_KEYWORD_MAP: Record<string, string[]> = {
  en: ['Chinese products', 'daigou'],
  zh: ['中国商品', '代购'],
  fr: ['produits chinois', "agent d'achat"],
  de: ['chinesische produkte', 'einkaufsagent'],
  es: ['productos chinos', 'agente de compras'],
  it: ['prodotti cinesi', 'agente di acquisto'],
  pt: ['produtos chineses', 'agente de compras'],
  ar: ['منتجات صينية', 'وكيل شراء'],
};

export function getProductMetadataKeywords(locale: string): string[] {
  return PRODUCT_KEYWORD_MAP[locale] || PRODUCT_KEYWORD_MAP.en;
}

/**
 * 标准 googleBot 指令
 */
export const defaultGoogleBot = {
  index: true,
  follow: true,
  'max-image-preview': 'large' as const,
  'max-snippet': -1,
};
