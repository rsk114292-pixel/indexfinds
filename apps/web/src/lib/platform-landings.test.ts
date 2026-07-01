import {
  getPlatformLandingComparisonPages,
  getPlatformLandingConfigBySlugLike,
  getPlatformLandingIntentDetailCopy,
  getPlatformLandingIntentJourneyCopy,
  getPlatformLandingIntentPageUiCopy,
  getPlatformLandingIntentSeoDescription,
  getPlatformLandingIntentUserFitCopy,
  getPlatformLandingIntentBySlug,
  getPlatformLandingNarrativeOverrides,
  getPlatformLandingPageCopy,
  getPlatformLandingSegment,
  getPlatformLandingSeo,
  getCustomPlatformLandingIntentSlugs,
  getLocalizedPlatformLandingIntentSlugs,
  getRelatedPlatformLandingIntents,
  resolvePlatformLandingSlug,
} from './platform-landings';

describe('platform landings', () => {
  it('resolves canonical platform slugs from common aliases', () => {
    expect(resolvePlatformLandingSlug('cnfan-spreadsheet')).toBe('cnfans-spreadsheet');
    expect(resolvePlatformLandingSlug('opp-buy-spreadsheet')).toBe('oopbuy-spreadsheet');
    expect(resolvePlatformLandingSlug('kako')).toBe('kakobuy-spreadsheet');
    expect(resolvePlatformLandingSlug('orentdig')).toBe('orientdig-spreadsheet');
    expect(resolvePlatformLandingSlug('surperbuy-spreadsheet')).toBe('superbuy-spreadsheet');
  });

  it('returns platform config from alias-like slugs', () => {
    expect(getPlatformLandingConfigBySlugLike('muelbuy-spreadsheet')?.key).toBe('mulebuy');
    expect(getPlatformLandingConfigBySlugLike('mulebiy')?.key).toBe('mulebuy');
    expect(getPlatformLandingConfigBySlugLike('superbay')?.key).toBe('superbuy');
    expect(getPlatformLandingConfigBySlugLike('surperbuy-spreadsheet')?.key).toBe('superbuy');
    expect(getPlatformLandingConfigBySlugLike('cnfanse')?.key).toBe('cnfans');
    expect(getPlatformLandingConfigBySlugLike('cnfanas')?.key).toBe('cnfans');
    expect(getPlatformLandingConfigBySlugLike('acbouy-spreadsheet')?.key).toBe('acbuy');
    expect(getPlatformLandingConfigBySlugLike('acbuuy')?.key).toBe('acbuy');
    expect(getPlatformLandingConfigBySlugLike('hubbuy')?.key).toBe('hubbuycn');
    expect(getPlatformLandingConfigBySlugLike('kakobut')?.key).toBe('kakobuy');
    expect(getPlatformLandingConfigBySlugLike('kakobyu')?.key).toBe('kakobuy');
    expect(getPlatformLandingConfigBySlugLike('orentdig-spreadsheet')?.key).toBe('orientdig');
  });

  it('exposes long-tail intent definitions', () => {
    expect(getPlatformLandingIntentBySlug('shoes')?.query).toBe('shoes');
    expect(getPlatformLandingIntentBySlug('jackets')?.query).toBe('jackets');
    expect(getPlatformLandingIntentBySlug('bags')?.query).toBe('bags');
    expect(getPlatformLandingIntentBySlug('accessories')?.query).toBe('accessories');
    expect(getPlatformLandingIntentBySlug('hoodies')?.query).toBe('hoodies');
    expect(getPlatformLandingIntentBySlug('sneakers')?.query).toBe('sneakers');
    expect(getPlatformLandingIntentBySlug('shirts')?.query).toBe('shirts');
    expect(getPlatformLandingIntentBySlug('jewelry')?.query).toBe('jewelry');
    expect(getPlatformLandingIntentBySlug('watches')?.query).toBe('watches');
    expect(getPlatformLandingIntentBySlug('shorts')?.query).toBe('shorts');
    expect(getPlatformLandingIntentBySlug('pants')?.query).toBe('pants');
    expect(getPlatformLandingIntentBySlug('sweaters')?.query).toBe('sweaters');
  });

  it('returns custom and fallback detail copy for topic pages', () => {
    const shoesIntent = getPlatformLandingIntentBySlug('shoes');
    const bagsIntent = getPlatformLandingIntentBySlug('bags');
    const accessoriesIntent = getPlatformLandingIntentBySlug('accessories');
    const shortsIntent = getPlatformLandingIntentBySlug('shorts');

    expect(shoesIntent).toBeDefined();
    expect(bagsIntent).toBeDefined();
    expect(accessoriesIntent).toBeDefined();
    expect(shortsIntent).toBeDefined();

    const customCopy = getPlatformLandingIntentDetailCopy(shoesIntent!, 'en');
    const secondCustomCopy = getPlatformLandingIntentDetailCopy(bagsIntent!, 'zh');
    const thirdCustomCopy = getPlatformLandingIntentDetailCopy(accessoriesIntent!, 'en');
    const fallbackCopy = getPlatformLandingIntentDetailCopy(shortsIntent!, 'en');

    expect(customCopy.faqTitle('CNFans')).toBe('CNFans shoes FAQ');
    expect(customCopy.searchAnglesTitle).toBe('High-intent shoe searches');
    expect(secondCustomCopy.searchAnglesTitle).toBe('包袋类常见搜索路径');
    expect(thirdCustomCopy.searchAnglesTitle).toBe('Accessory search angles');
    expect(fallbackCopy.searchAnglesTitle).toBe('Shorts search shortcuts');
    expect(fallbackCopy.productsTitle('CNFans')).toBe('Popular shorts finds for CNFans');
  });

  it('returns localized topic detail copy for high-value intents on new platforms', () => {
    const shoesIntent = getPlatformLandingIntentBySlug('shoes');
    const bagsIntent = getPlatformLandingIntentBySlug('bags');
    const hoodiesIntent = getPlatformLandingIntentBySlug('hoodies');
    const watchesIntent = getPlatformLandingIntentBySlug('watches');
    const accessoriesIntent = getPlatformLandingIntentBySlug('accessories');
    const jacketsIntent = getPlatformLandingIntentBySlug('jackets');
    const pantsIntent = getPlatformLandingIntentBySlug('pants');
    const sneakersIntent = getPlatformLandingIntentBySlug('sneakers');
    const shirtsIntent = getPlatformLandingIntentBySlug('shirts');
    const jewelryIntent = getPlatformLandingIntentBySlug('jewelry');
    const sweatersIntent = getPlatformLandingIntentBySlug('sweaters');
    const shortsIntent = getPlatformLandingIntentBySlug('shorts');
    const mulebuy = getPlatformLandingConfigBySlugLike('mulebuy-spreadsheet');
    const lovegobuy = getPlatformLandingConfigBySlugLike('lovegobuy-spreadsheet');
    const hacoo = getPlatformLandingConfigBySlugLike('hacoo-spreadsheet');
    const cnfans = getPlatformLandingConfigBySlugLike('cnfans-spreadsheet');
    const itaobuy = getPlatformLandingConfigBySlugLike('itaobuy-spreadsheet');
    const mycnbox = getPlatformLandingConfigBySlugLike('mycnbox-spreadsheet');
    const pantherbuy = getPlatformLandingConfigBySlugLike('pantherbuy-spreadsheet');
    const vigorbuy = getPlatformLandingConfigBySlugLike('vigorbuy-spreadsheet');

    expect(shoesIntent).toBeDefined();
    expect(bagsIntent).toBeDefined();
    expect(hoodiesIntent).toBeDefined();
    expect(watchesIntent).toBeDefined();
    expect(accessoriesIntent).toBeDefined();
    expect(jacketsIntent).toBeDefined();
    expect(pantsIntent).toBeDefined();
    expect(sneakersIntent).toBeDefined();
    expect(shirtsIntent).toBeDefined();
    expect(jewelryIntent).toBeDefined();
    expect(sweatersIntent).toBeDefined();
    expect(shortsIntent).toBeDefined();
    expect(mulebuy).toBeDefined();
    expect(lovegobuy).toBeDefined();
    expect(hacoo).toBeDefined();
    expect(cnfans).toBeDefined();
    expect(itaobuy).toBeDefined();
    expect(mycnbox).toBeDefined();
    expect(pantherbuy).toBeDefined();
    expect(vigorbuy).toBeDefined();

    const frCopy = getPlatformLandingIntentDetailCopy(shoesIntent!, 'fr', mulebuy!);
    const deCopy = getPlatformLandingIntentDetailCopy(bagsIntent!, 'de', lovegobuy!);
    const esCopy = getPlatformLandingIntentDetailCopy(watchesIntent!, 'es', hacoo!);
    const frAccessoriesCopy = getPlatformLandingIntentDetailCopy(accessoriesIntent!, 'fr', mycnbox!);
    const deJacketsCopy = getPlatformLandingIntentDetailCopy(jacketsIntent!, 'de', itaobuy!);
    const esPantsCopy = getPlatformLandingIntentDetailCopy(pantsIntent!, 'es', pantherbuy!);
    const frSneakersCopy = getPlatformLandingIntentDetailCopy(sneakersIntent!, 'fr', mulebuy!);
    const esShirtsCopy = getPlatformLandingIntentDetailCopy(shirtsIntent!, 'es', itaobuy!);
    const deJewelryCopy = getPlatformLandingIntentDetailCopy(jewelryIntent!, 'de', hacoo!);
    const frSweatersCopy = getPlatformLandingIntentDetailCopy(sweatersIntent!, 'fr', lovegobuy!);
    const deShortsCopy = getPlatformLandingIntentDetailCopy(shortsIntent!, 'de', vigorbuy!);
    const arShoesCopy = getPlatformLandingIntentDetailCopy(shoesIntent!, 'ar', mulebuy!);
    const fallbackCopy = getPlatformLandingIntentDetailCopy(hoodiesIntent!, 'fr', cnfans!);

    expect(frCopy.searchAnglesTitle).toBe('Angles de recherche chaussures');
    expect(frCopy.heroDescription('Mulebuy', 'Finds Spreadsheet')).toContain('produits, categories');
    expect(deCopy.compareDescription('Lovegobuy', 'Bags')).toContain('Plattform-Guides');
    expect(esCopy.heroDescription('Hacoo', 'Finds Spreadsheet')).toContain('productos, categorias');
    expect(frAccessoriesCopy.searchAnglesTitle).toBe('Angles de recherche accessoires');
    expect(deJacketsCopy.searchAnglesTitle).toBe('Suchwinkel fur jacken');
    expect(esPantsCopy.productsTitle('Pantherbuy')).toBe(
      'Selecciones populares de pantalones para Pantherbuy',
    );
    expect(frSneakersCopy.compareDescription('Mulebuy', 'Sneakers')).toContain("d'autres guides");
    expect(esShirtsCopy.searchAnglesTitle).toBe('Angulos de busqueda para camisas');
    expect(deJewelryCopy.heroDescription('Hacoo', 'Finds Spreadsheet')).toContain('Produkte, Kategorien');
    expect(frSweatersCopy.productsTitle('Lovegobuy')).toBe('Decouvertes pulls pour Lovegobuy');
    expect(deShortsCopy.compareDescription('Vigorbuy', 'Shorts')).toContain('Plattform-Guides');
    expect(arShoesCopy.searchAnglesTitle).toBe('زوايا البحث عن الاحذية');
    expect(fallbackCopy.heroDescription('CNFans', 'Finds Spreadsheet')).toContain(
      'produits, categories et raccourcis utiles',
    );
  });

  it('returns adjacent topic guides for internal linking', () => {
    expect(getRelatedPlatformLandingIntents('shoes').map((intent) => intent.slug)).toEqual([
      'sneakers',
      'hoodies',
      'pants',
      'accessories',
    ]);
    expect(getRelatedPlatformLandingIntents('jewelry', 2).map((intent) => intent.slug)).toEqual([
      'accessories',
      'watches',
    ]);
    expect(
      getRelatedPlatformLandingIntents('bags', 3, 'Watches').map((intent) => intent.slug),
    ).toEqual(['watches', 'accessories', 'jewelry']);
  });

  it('returns localized narrative overrides for new-platform batches and remaining long-tail additions', () => {
    const mulebuy = getPlatformLandingConfigBySlugLike('mulebuy-spreadsheet');
    const orientdig = getPlatformLandingConfigBySlugLike('orientdig-spreadsheet');
    const parcelup = getPlatformLandingConfigBySlugLike('parcelup-spreadsheet');
    const eastmallbuy = getPlatformLandingConfigBySlugLike('eastmallbuy-spreadsheet');
    const hubbuycn = getPlatformLandingConfigBySlugLike('hubbuycn-spreadsheet');
    const yoybuy = getPlatformLandingConfigBySlugLike('yoybuy-spreadsheet');
    const lovegobuy = getPlatformLandingConfigBySlugLike('lovegobuy-spreadsheet');
    const hoobuy = getPlatformLandingConfigBySlugLike('hoobuy-spreadsheet');
    const itaobuy = getPlatformLandingConfigBySlugLike('itaobuy-spreadsheet');
    const mycnbox = getPlatformLandingConfigBySlugLike('mycnbox-spreadsheet');
    const hacoo = getPlatformLandingConfigBySlugLike('hacoo-spreadsheet');
    const vigorbuy = getPlatformLandingConfigBySlugLike('vigorbuy-spreadsheet');
    const cnfans = getPlatformLandingConfigBySlugLike('cnfans-spreadsheet');

    expect(mulebuy).toBeDefined();
    expect(orientdig).toBeDefined();
    expect(parcelup).toBeDefined();
    expect(eastmallbuy).toBeDefined();
    expect(hubbuycn).toBeDefined();
    expect(yoybuy).toBeDefined();
    expect(lovegobuy).toBeDefined();
    expect(hoobuy).toBeDefined();
    expect(itaobuy).toBeDefined();
    expect(mycnbox).toBeDefined();
    expect(hacoo).toBeDefined();
    expect(vigorbuy).toBeDefined();
    expect(cnfans).toBeDefined();

    expect(
      getPlatformLandingNarrativeOverrides(mulebuy!, 'fr')?.searchAnglesDescription('Mulebuy'),
    ).toContain('page les rassemble');
    expect(
      getPlatformLandingNarrativeOverrides(orientdig!, 'de')?.heroDescription('Finds Spreadsheet', 'Orientdig'),
    ).toContain('hilft dir');
    expect(
      getPlatformLandingNarrativeOverrides(parcelup!, 'es')?.compareDescription('ParcelUp'),
    ).toContain('otras guias');
    expect(
      getPlatformLandingNarrativeOverrides(eastmallbuy!, 'fr')?.heroDescription('Finds Spreadsheet', 'Eastmallbuy'),
    ).toContain('aide a parcourir');
    expect(
      getPlatformLandingNarrativeOverrides(hubbuycn!, 'de')?.searchAnglesDescription('Hubbuycn'),
    ).toContain('bundelt');
    expect(
      getPlatformLandingNarrativeOverrides(yoybuy!, 'es')?.seoDescription('Finds Spreadsheet', 'Yoybuy'),
    ).toContain('pagina en espanol mas clara');
    expect(
      getPlatformLandingNarrativeOverrides(lovegobuy!, 'fr')?.heroDescription('Finds Spreadsheet', 'Lovegobuy'),
    ).toContain('page Lovegobuy');
    expect(
      getPlatformLandingNarrativeOverrides(hoobuy!, 'es')?.searchAnglesDescription('Hoobuy'),
    ).toContain('busquedas');
    expect(
      getPlatformLandingNarrativeOverrides(itaobuy!, 'de')?.compareDescription('iTaoBuy'),
    ).toContain('Plattform-Guides');
    expect(
      getPlatformLandingNarrativeOverrides(mycnbox!, 'fr')?.compareDescription('MyCNBox'),
    ).toContain('autres guides de plateforme');
    expect(
      getPlatformLandingNarrativeOverrides(hacoo!, 'es')?.heroDescription('Finds Spreadsheet', 'Hacoo'),
    ).toContain('pagina Hacoo');
    expect(
      getPlatformLandingNarrativeOverrides(vigorbuy!, 'de')?.seoDescription('Finds Spreadsheet', 'Vigorbuy'),
    ).toContain('klarere deutsche Seite');
    expect(
      getPlatformLandingNarrativeOverrides(mulebuy!, 'ar')?.searchAnglesDescription('Mulebuy'),
    ).toContain('هذه الصفحة تجمعها');
    expect(
      getPlatformLandingNarrativeOverrides(mulebuy!, 'it')?.searchAnglesDescription('Mulebuy'),
    ).toContain('Questa pagina');
    expect(
      getPlatformLandingNarrativeOverrides(lovegobuy!, 'pt')?.heroDescription('Finds Spreadsheet', 'Lovegobuy'),
    ).toContain('pagina Lovegobuy');
    expect(getPlatformLandingNarrativeOverrides(cnfans!, 'fr')).toBeNull();
  });

  it('uses localized narrative overrides in seo descriptions when available', () => {
    const mulebuy = getPlatformLandingConfigBySlugLike('mulebuy-spreadsheet');
    const basetao = getPlatformLandingConfigBySlugLike('basetao-spreadsheet');
    const ootdbuy = getPlatformLandingConfigBySlugLike('ootdbuy-spreadsheet');
    const ezbuycn = getPlatformLandingConfigBySlugLike('ezbuycn-spreadsheet');
    const lovegobuy = getPlatformLandingConfigBySlugLike('lovegobuy-spreadsheet');
    const hacoo = getPlatformLandingConfigBySlugLike('hacoo-spreadsheet');
    const itaobuy = getPlatformLandingConfigBySlugLike('itaobuy-spreadsheet');

    expect(mulebuy).toBeDefined();
    expect(basetao).toBeDefined();
    expect(ootdbuy).toBeDefined();
    expect(ezbuycn).toBeDefined();
    expect(lovegobuy).toBeDefined();
    expect(hacoo).toBeDefined();
    expect(itaobuy).toBeDefined();

    expect(getPlatformLandingSeo(mulebuy!, 'fr').description).toContain('page en francais plus claire');
    expect(getPlatformLandingSeo(basetao!, 'de').description).toContain('klarere deutsche Seite');
    expect(getPlatformLandingSeo(ootdbuy!, 'es').description).toContain('pagina en espanol mas clara');
    expect(getPlatformLandingSeo(ezbuycn!, 'fr').description).toContain('categories');
    expect(getPlatformLandingSeo(lovegobuy!, 'es').description).toContain('links utiles');
    expect(getPlatformLandingSeo(hacoo!, 'de').description).toContain('Kategorien');
    expect(getPlatformLandingSeo(itaobuy!, 'fr').description).toContain('liens utiles');
    expect(getPlatformLandingSeo(mulebuy!, 'it').description).toContain('pagina italiana');
    expect(getPlatformLandingSeo(lovegobuy!, 'pt').description).toContain('pagina em portugues');
    expect(getPlatformLandingSeo(mulebuy!, 'fr').title).toBe('Selections Mulebuy Spreadsheet');
    expect(getPlatformLandingSeo(mulebuy!, 'fr').title).not.toContain('Finds Spreadsheet');
    expect(getPlatformLandingSeo(basetao!, 'de').description).not.toMatch(/spreadsheet Finds/);
    expect(getPlatformLandingSeo(lovegobuy!, 'pt').description).not.toMatch(/spreadsheet finds/i);
  });

  it('uses localized topic seo descriptions and page ui copy when available', () => {
    const shoesIntent = getPlatformLandingIntentBySlug('shoes');
    const bagsIntent = getPlatformLandingIntentBySlug('bags');
    const watchesIntent = getPlatformLandingIntentBySlug('watches');
    const accessoriesIntent = getPlatformLandingIntentBySlug('accessories');
    const jacketsIntent = getPlatformLandingIntentBySlug('jackets');
    const pantsIntent = getPlatformLandingIntentBySlug('pants');
    const shirtsIntent = getPlatformLandingIntentBySlug('shirts');
    const jewelryIntent = getPlatformLandingIntentBySlug('jewelry');
    const sweatersIntent = getPlatformLandingIntentBySlug('sweaters');
    const shortsIntent = getPlatformLandingIntentBySlug('shorts');
    const mulebuy = getPlatformLandingConfigBySlugLike('mulebuy-spreadsheet');
    const lovegobuy = getPlatformLandingConfigBySlugLike('lovegobuy-spreadsheet');
    const hacoo = getPlatformLandingConfigBySlugLike('hacoo-spreadsheet');
    const mycnbox = getPlatformLandingConfigBySlugLike('mycnbox-spreadsheet');
    const itaobuy = getPlatformLandingConfigBySlugLike('itaobuy-spreadsheet');
    const pantherbuy = getPlatformLandingConfigBySlugLike('pantherbuy-spreadsheet');
    const fishgoo = getPlatformLandingConfigBySlugLike('fishgoo-spreadsheet');
    const vigorbuy = getPlatformLandingConfigBySlugLike('vigorbuy-spreadsheet');

    expect(shoesIntent).toBeDefined();
    expect(bagsIntent).toBeDefined();
    expect(watchesIntent).toBeDefined();
    expect(accessoriesIntent).toBeDefined();
    expect(jacketsIntent).toBeDefined();
    expect(pantsIntent).toBeDefined();
    expect(shirtsIntent).toBeDefined();
    expect(jewelryIntent).toBeDefined();
    expect(sweatersIntent).toBeDefined();
    expect(shortsIntent).toBeDefined();
    expect(mulebuy).toBeDefined();
    expect(lovegobuy).toBeDefined();
    expect(hacoo).toBeDefined();
    expect(mycnbox).toBeDefined();
    expect(itaobuy).toBeDefined();
    expect(pantherbuy).toBeDefined();
    expect(fishgoo).toBeDefined();
    expect(vigorbuy).toBeDefined();

    expect(getPlatformLandingIntentSeoDescription(mulebuy!, shoesIntent!, 'fr')).toContain(
      'page plus claire',
    );
    expect(getPlatformLandingIntentSeoDescription(lovegobuy!, bagsIntent!, 'de')).toContain(
      'klarere Seite',
    );
    expect(getPlatformLandingIntentSeoDescription(hacoo!, watchesIntent!, 'es')).toContain(
      'pagina mas clara',
    );
    expect(getPlatformLandingIntentSeoDescription(mycnbox!, accessoriesIntent!, 'fr')).toContain(
      'categories, produits',
    );
    expect(getPlatformLandingIntentSeoDescription(itaobuy!, jacketsIntent!, 'de')).toContain(
      'Kategorien, Produkte',
    );
    expect(getPlatformLandingIntentSeoDescription(pantherbuy!, pantsIntent!, 'es')).toContain(
      'categorias, productos',
    );
    expect(getPlatformLandingIntentSeoDescription(mulebuy!, shoesIntent!, 'ar')).toContain(
      'صفحة اوضح',
    );
    expect(getPlatformLandingIntentSeoDescription(itaobuy!, shirtsIntent!, 'es')).toContain(
      'links utiles',
    );
    expect(getPlatformLandingIntentSeoDescription(fishgoo!, jewelryIntent!, 'de')).toContain(
      'nutzliche Links',
    );
    expect(getPlatformLandingIntentSeoDescription(mycnbox!, sweatersIntent!, 'fr')).toContain(
      'liens utiles',
    );
    expect(getPlatformLandingIntentSeoDescription(vigorbuy!, shortsIntent!, 'de')).toContain(
      'klarere Seite',
    );
    expect(getPlatformLandingIntentSeoDescription(mulebuy!, shoesIntent!, 'it')).toContain(
      'pagina piu chiara',
    );
    expect(getPlatformLandingIntentSeoDescription(lovegobuy!, bagsIntent!, 'pt')).toContain(
      'pagina mais clara',
    );
    expect(getPlatformLandingIntentSeoDescription(lovegobuy!, bagsIntent!, 'de')).not.toMatch(
      / Finds /,
    );
    expect(getPlatformLandingIntentSeoDescription(hacoo!, watchesIntent!, 'es')).not.toMatch(
      / finds /i,
    );

    const frUi = getPlatformLandingIntentPageUiCopy('fr');
    const deUi = getPlatformLandingIntentPageUiCopy('de');
    const esUi = getPlatformLandingIntentPageUiCopy('es');
    const arUi = getPlatformLandingIntentPageUiCopy('ar');
    const itUi = getPlatformLandingIntentPageUiCopy('it');
    const ptUi = getPlatformLandingIntentPageUiCopy('pt');

    expect(frUi.backToGuideLabel('Mulebuy')).toBe('Retour au guide Mulebuy');
    expect(deUi.openMainPageLabel('Lovegobuy')).toBe('Lovegobuy-hauptseite offnen');
    expect(esUi.matchedCategoryDescription('Relojes')).toBe(
      'Hemos vinculado este tema con la categoria Relojes.',
    );
    expect(arUi.openMainPageLabel('Mulebuy')).toBe('افتح الصفحة الرئيسية لـ Mulebuy');
    expect(itUi.backToGuideLabel('Mulebuy')).toBe('Torna alla guida Mulebuy');
    expect(ptUi.openMainPageLabel('Lovegobuy')).toBe('Abrir a pagina principal de Lovegobuy');
  });

  it('keeps generic non-English topic fallback titles localized', () => {
    const shortsIntent = getPlatformLandingIntentBySlug('shorts');
    const ptCopy = getPlatformLandingIntentDetailCopy(shortsIntent!, 'pt');
    const frCopy = getPlatformLandingIntentDetailCopy(shortsIntent!, 'fr');
    const deCopy = getPlatformLandingIntentDetailCopy(shortsIntent!, 'de');

    expect(shortsIntent).toBeDefined();
    expect(frCopy.searchAnglesTitle).toBe('Angles de recherche shorts');
    expect(deCopy.productsTitle('Vigorbuy')).toBe('Beliebte shorts-Auswahl fur Vigorbuy');
    expect(ptCopy.compareTitle('Shorts')).toBe('Compara paginas de shorts entre plataformas');
    expect(frCopy.faqTitle('Mulebuy')).toBe('Questions frequentes Mulebuy shorts');
  });

  it('keeps non-English builders free of raw finds/agent/topic leftovers', () => {
    const mulebuy = getPlatformLandingConfigBySlugLike('mulebuy-spreadsheet');
    const shoesIntent = getPlatformLandingIntentBySlug('shoes');

    expect(mulebuy).toBeDefined();
    expect(shoesIntent).toBeDefined();

    for (const locale of ['fr', 'de', 'es', 'it', 'pt', 'ar'] as const) {
      const pageCopy = getPlatformLandingPageCopy(locale);
      const narrative = getPlatformLandingNarrativeOverrides(mulebuy!, locale);
      const journey = getPlatformLandingIntentJourneyCopy(shoesIntent!, locale, mulebuy!);
      const userFit = getPlatformLandingIntentUserFitCopy(shoesIntent!, locale, mulebuy!);

      expect(pageCopy.heroEyebrow).not.toMatch(/\bagent\b/i);
      expect(narrative?.seoDescription('Findsindex', 'Mulebuy')).not.toMatch(/\bfinds\b/i);
      expect(narrative?.compareDescription('Mulebuy')).not.toMatch(/\bagents?\b/i);
      expect(journey.relatedRoutesDescription('Mulebuy', 'shoes')).not.toMatch(/\btopics?\b/i);
      expect(journey.relatedRoutesDescription('Mulebuy', 'shoes')).not.toMatch(/\bagents?\b/i);
      expect(
        userFit.sectionDescription('Mulebuy', 'shoes', null),
      ).not.toMatch(/\btopics?\b|\bagent\b/i);
    }

    const zhJourney = getPlatformLandingIntentJourneyCopy(shoesIntent!, 'zh', mulebuy!);
    const zhUserFit = getPlatformLandingIntentUserFitCopy(shoesIntent!, 'zh', mulebuy!);

    expect(zhJourney.relatedRoutesDescription('Mulebuy', 'shoes')).not.toContain('topic');
    expect(zhJourney.relatedRoutesDescription('Mulebuy', 'shoes')).not.toContain('agent');
    expect(zhUserFit.sectionDescription('Mulebuy', 'shoes', null)).not.toContain('topic');
  });

  it('prioritizes comparison pages by platform segment', () => {
    expect(
      getPlatformLandingComparisonPages('orientdig-spreadsheet')
        .slice(0, 3)
        .every((page) => getPlatformLandingSegment(page) === 'growth'),
    ).toBe(true);

    expect(
      getPlatformLandingComparisonPages('lovbuy-spreadsheet')
        .slice(0, 3)
        .every((page) => getPlatformLandingSegment(page) === 'long_tail'),
    ).toBe(true);
  });

  it('exposes platform segments and custom topic coverage for seo inventory', () => {
    const featuredConfig = getPlatformLandingConfigBySlugLike('cnfans-spreadsheet');
    const growthConfig = getPlatformLandingConfigBySlugLike('orientdig-spreadsheet');
    const longTailConfig = getPlatformLandingConfigBySlugLike('lovbuy-spreadsheet');

    expect(featuredConfig).toBeDefined();
    expect(growthConfig).toBeDefined();
    expect(longTailConfig).toBeDefined();

    expect(getPlatformLandingSegment(featuredConfig!)).toBe('featured');
    expect(getPlatformLandingSegment(growthConfig!)).toBe('growth');
    expect(getPlatformLandingSegment(longTailConfig!)).toBe('long_tail');

    expect(getCustomPlatformLandingIntentSlugs('en')).toContain('shoes');
    expect(getCustomPlatformLandingIntentSlugs('zh')).toContain('bags');
    expect(getCustomPlatformLandingIntentSlugs('en')).not.toContain('shorts');
    expect(getLocalizedPlatformLandingIntentSlugs('fr')).toContain('shorts');
    expect(getLocalizedPlatformLandingIntentSlugs('de')).toContain('sweaters');
    expect(getLocalizedPlatformLandingIntentSlugs('es')).toContain('jewelry');
    expect(getLocalizedPlatformLandingIntentSlugs('ar')).toContain('pants');
    expect(getLocalizedPlatformLandingIntentSlugs('it')).toContain('shirts');
    expect(getLocalizedPlatformLandingIntentSlugs('pt')).toContain('watches');
  });
});
