import { Injectable, Logger } from '@nestjs/common';
import { Product } from './entities/product.entity';
import { SearchRankingService } from '../search/search-ranking.service';

@Injectable()
export class SearchSortingBoostService {
  private readonly logger = new Logger(SearchSortingBoostService.name);

  constructor(private readonly searchRankingService: SearchRankingService) {}

  applySmartRanking(
    data: Product[],
    searchQuery: string,
    sortBy: string,
    intentSortApplied: boolean,
  ): Product[] {
    if (
      intentSortApplied ||
      sortBy !== 'relevance' ||
      !searchQuery ||
      data.length === 0
    ) {
      return data;
    }

    const searchTerms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    return this.searchRankingService.rankProducts(
      data.map((p) => ({
        ...p,
        name: p.title,
        ctr: p.ctr || 0,
      })),
      searchTerms,
    );
  }

  applyGenderWeightSort(data: Product[], gender: string | null): Product[] {
    this.logger.log(`性别权重排序: gender=${gender}, 产品数=${data.length}`);

    if (!gender || data.length === 0) {
      return data;
    }

    const genderLower = gender.toLowerCase();
    if (genderLower !== 'men' && genderLower !== 'women') {
      return data;
    }

    const sorted = [...data].sort((a, b) => {
      const aGender = (a.aiAttributes?.gender || '').toLowerCase();
      const bGender = (b.aiAttributes?.gender || '').toLowerCase();
      const aScore =
        aGender === genderLower ? 100 : aGender === 'unisex' ? 50 : 0;
      const bScore =
        bGender === genderLower ? 100 : bGender === 'unisex' ? 50 : 0;
      return bScore - aScore;
    });

    const exactMatch = sorted.filter(
      (p) => (p.aiAttributes?.gender || '').toLowerCase() === genderLower,
    ).length;
    const unisexMatch = sorted.filter(
      (p) => (p.aiAttributes?.gender || '').toLowerCase() === 'unisex',
    ).length;
    this.logger.log(
      `性别权重排序完成: 精确匹配=${exactMatch}, unisex=${unisexMatch}`,
    );

    return sorted;
  }

  applyPreferenceBoost(
    products: Product[],
    preferredBrandIds: string[],
    preferredCategoryIds: string[],
    skipReSort: boolean = false,
  ): Product[] {
    if (products.length === 0) {
      return products;
    }

    if (preferredBrandIds.length === 0 && preferredCategoryIds.length === 0) {
      return products;
    }

    const brandIdSet = new Set(preferredBrandIds);
    const categoryIdSet = new Set(preferredCategoryIds);

    const productsWithScore = products.map((product, index) => {
      let boostScore = 0;

      if (product.brand?.id && brandIdSet.has(product.brand.id)) {
        const brandRank = preferredBrandIds.indexOf(product.brand.id);
        boostScore += 0.3 - brandRank * 0.05;
      }

      if (
        product.primaryCategoryId &&
        categoryIdSet.has(product.primaryCategoryId)
      ) {
        const categoryRank = preferredCategoryIds.indexOf(
          product.primaryCategoryId,
        );
        boostScore += 0.2 - categoryRank * 0.03;
      }

      return {
        product,
        originalIndex: index,
        boostScore: Math.max(0, boostScore),
      };
    });

    const hasBoost = productsWithScore.some((p) => p.boostScore > 0);
    if (!hasBoost) {
      return products;
    }

    if (skipReSort) {
      this.logger.log(`个性化偏好加权: 跳过偏好重排序以保持意图排序`);
      return products;
    }

    productsWithScore.sort((a, b) => {
      if (b.boostScore !== a.boostScore) {
        return b.boostScore - a.boostScore;
      }
      return a.originalIndex - b.originalIndex;
    });

    const boostedCount = productsWithScore.filter(
      (p) => p.boostScore > 0,
    ).length;
    this.logger.log(
      `个性化偏好加权: ${boostedCount}/${products.length} 个商品获得加权`,
    );

    return productsWithScore.map((p) => p.product);
  }

  applyGiftCategoryBoost(products: Product[]): Product[] {
    if (products.length === 0) {
      return products;
    }

    const giftCategoryWeights: Record<string, number> = {
      jewelry: 150,
      necklaces: 145,
      bracelets: 145,
      earrings: 145,
      rings: 145,
      handbags: 140,
      'tote-bags': 135,
      'shoulder-bags': 135,
      'crossbody-bags': 135,
      clutches: 130,
      wallets: 125,
      watches: 120,
      sunglasses: 115,
      scarves: 110,
      belts: 105,
      'high-heels': 100,
      heels: 100,
      sandals: 95,
      slippers: 90,
      shoes: 85,
      dresses: 80,
      perfume: 75,
      fragrance: 75,
      skirts: 60,
      blouses: 55,
      tops: 50,
      sneakers: 30,
      'running-shoes': 25,
      'basketball-shoes': 25,
      hoodies: 20,
      sweatshirts: 20,
      't-shirts': 15,
      'down-jackets': 10,
      jackets: 10,
      pants: 5,
      shorts: 5,
    };

    const luxuryBrands = new Set([
      'louis-vuitton',
      'gucci',
      'prada',
      'dior',
      'chanel',
      'hermes',
      'fendi',
      'burberry',
      'versace',
      'balenciaga',
      'bottega-veneta',
      'saint-laurent',
      'celine',
      'loewe',
      'valentino',
      'givenchy',
      'cartier',
      'tiffany',
      'bvlgari',
      'van-cleef-arpels',
    ]);

    const productsWithScore = products.map((product, index) => {
      let giftScore = 50;

      const categorySlug = product.primaryCategory?.slug?.toLowerCase();
      if (categorySlug && giftCategoryWeights[categorySlug] !== undefined) {
        giftScore = giftCategoryWeights[categorySlug];
      }

      const brandSlug = product.brand?.slug?.toLowerCase();
      if (brandSlug && luxuryBrands.has(brandSlug)) {
        giftScore += 20;
      }

      return {
        product,
        originalIndex: index,
        giftScore,
      };
    });

    productsWithScore.sort((a, b) => {
      if (b.giftScore !== a.giftScore) {
        return b.giftScore - a.giftScore;
      }
      return a.originalIndex - b.originalIndex;
    });

    const topCategories = productsWithScore
      .slice(0, 5)
      .map((p) => p.product.primaryCategory?.slug)
      .filter(Boolean);
    this.logger.log(`礼物品类优先排序: 前5个品类=${topCategories.join(', ')}`);

    return productsWithScore.map((p) => p.product);
  }
}
