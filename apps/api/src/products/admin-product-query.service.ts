import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from './entities/product.entity';
import { escapeIlike } from '../search/utils/query-validator';
import { ProductStatus } from './product-status';

const PRODUCT_WITH_QC_SQL =
  'EXISTS (SELECT 1 FROM product_qc_media pqm WHERE pqm.product_id = product.id)';
const PRODUCT_WITHOUT_QC_SQL =
  'NOT EXISTS (SELECT 1 FROM product_qc_media pqm WHERE pqm.product_id = product.id)';
const PRODUCT_DEAD_LINK_CONFIRMED_SQL =
  'COALESCE(product."weidianDeadLinkAttempts", 0) >= 2';
const PRODUCT_DEAD_LINK_SUSPECTED_SQL =
  'COALESCE(product."weidianDeadLinkAttempts", 0) = 1';
const UNKNOWN_SHOP_KEY = 'unknown';
const UNKNOWN_SHOP_LABEL = '未识别店铺';
const NORMALIZED_SHOP_ID_SQL = `COALESCE(NULLIF(BTRIM(product."weidianShopId"), ''), '${UNKNOWN_SHOP_KEY}')`;
const PRODUCT_UNKNOWN_SHOP_SQL = `COALESCE(NULLIF(BTRIM(product."weidianShopId"), ''), '${UNKNOWN_SHOP_KEY}') = '${UNKNOWN_SHOP_KEY}'`;

interface AdminProductListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priceState?: 'zero' | 'priced';
  qcState?: 'with' | 'without';
  minPrice?: number;
  maxPrice?: number;
  reviewSource?: 'sku_split';
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  deadLink?: 'suspected' | 'confirmed';
  shopIds?: string[];
  shopSearch?: string;
}

interface AdminShopAggregateRow {
  shopId: string;
  shopName: string;
  productCount: string | number;
  pendingReviewCount: string | number;
  withoutQcCount: string | number;
  deadLinkCount: string | number;
}

@Injectable()
export class AdminProductQueryService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  private buildAdminProductsQuery(
    query: AdminProductListQuery,
    options?: {
      includeRelations?: boolean;
      excludeShopFilter?: boolean;
    },
  ): SelectQueryBuilder<Product> {
    const qb = this.productRepository.createQueryBuilder('product');

    if (options?.includeRelations) {
      qb.leftJoinAndSelect('product.brand', 'brand')
        .leftJoinAndSelect('product.primaryCategory', 'primaryCategory')
        .loadRelationCountAndMap('product.qcPhotoCount', 'product.qcMedia');
    }

    this.applyAdminFilters(qb, query, {
      excludeShopFilter: options?.excludeShopFilter,
    });

    return qb;
  }

  private applyAdminFilters(
    qb: SelectQueryBuilder<Product>,
    query: AdminProductListQuery,
    options?: {
      excludeShopFilter?: boolean;
    },
  ) {
    const {
      search,
      status,
      priceState,
      qcState,
      minPrice,
      maxPrice,
      reviewSource,
      deadLink,
      shopIds,
      shopSearch,
    } = query;

    if (status && status !== 'all') {
      qb.andWhere('product.status = :status', { status });
    }

    if (reviewSource === 'sku_split') {
      qb.andWhere('product."skuVariantKey" IS NOT NULL');
    }

    if (priceState === 'zero') {
      qb.andWhere('COALESCE(product."priceMin", 0) <= 0');
    } else if (priceState === 'priced') {
      qb.andWhere('COALESCE(product."priceMin", 0) > 0');
    }

    if (qcState === 'with') {
      qb.andWhere(PRODUCT_WITH_QC_SQL);
    } else if (qcState === 'without') {
      qb.andWhere(PRODUCT_WITHOUT_QC_SQL);
    }

    if (typeof minPrice === 'number' && Number.isFinite(minPrice)) {
      qb.andWhere('COALESCE(product."priceMin", 0) >= :minPrice', { minPrice });
    }

    if (typeof maxPrice === 'number' && Number.isFinite(maxPrice)) {
      qb.andWhere('COALESCE(product."priceMin", 0) <= :maxPrice', { maxPrice });
    }

    if (deadLink === 'confirmed') {
      qb.andWhere(PRODUCT_DEAD_LINK_CONFIRMED_SQL);
    } else if (deadLink === 'suspected') {
      qb.andWhere(PRODUCT_DEAD_LINK_SUSPECTED_SQL);
    }

    if (search && search.trim()) {
      const exact = search.trim();
      const keyword = `%${escapeIlike(exact)}%`;
      qb.andWhere(
        `(product.title ILIKE :keyword
          OR product."originalTitle" ILIKE :keyword
          OR product."weidianItemId" = :exact
          OR product."splitSourceWeidianId" = :exact
          OR product."weidianShopName" ILIKE :keyword)`,
        { keyword, exact },
      );
    }

    if (shopSearch && shopSearch.trim()) {
      qb.andWhere('product."weidianShopName" ILIKE :shopKeyword', {
        shopKeyword: `%${escapeIlike(shopSearch.trim())}%`,
      });
    }

    if (!options?.excludeShopFilter) {
      const normalizedShopIds = Array.from(
        new Set((shopIds || []).map((shopId) => shopId.trim()).filter(Boolean)),
      );
      const includesUnknown = normalizedShopIds.includes(UNKNOWN_SHOP_KEY);
      const concreteShopIds = normalizedShopIds.filter(
        (shopId) => shopId !== UNKNOWN_SHOP_KEY,
      );

      if (concreteShopIds.length > 0 && includesUnknown) {
        qb.andWhere(
          `(product."weidianShopId" IN (:...shopIds) OR ${PRODUCT_UNKNOWN_SHOP_SQL})`,
          { shopIds: concreteShopIds },
        );
      } else if (concreteShopIds.length > 0) {
        qb.andWhere('product."weidianShopId" IN (:...shopIds)', {
          shopIds: concreteShopIds,
        });
      } else if (includesUnknown) {
        qb.andWhere(PRODUCT_UNKNOWN_SHOP_SQL);
      }
    }
  }

  async findAllAdmin(query: AdminProductListQuery): Promise<{
    data: Product[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const {
      page = 1,
      limit: rawLimit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const qb = this.buildAdminProductsQuery(query, { includeRelations: true });

    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'priceMin',
      'viewCount',
      'salesCount',
      'popularityScore',
      'title',
    ];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    qb.orderBy(`product.${sortField}`, sortOrder === 'ASC' ? 'ASC' : 'DESC');

    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    if (data.length > 0) {
      const productIds = data.map((product) => product.id);
      const embeddingRows = await this.productRepository.manager.query(
        `SELECT DISTINCT product_id FROM product_image_embeddings WHERE product_id = ANY($1) AND embedding IS NOT NULL`,
        [productIds],
      );
      const embeddingSet = new Set(
        embeddingRows.map((row: { product_id: string }) => row.product_id),
      );
      for (const product of data) {
        (product as any).hasEmbedding = embeddingSet.has(product.id);
      }
    }

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAdminShopOptions(
    query: AdminProductListQuery,
    limit: number = 50,
  ): Promise<{
    data: Array<{
      shopId: string;
      shopName: string;
      productCount: number;
      pendingReviewCount: number;
      withoutQcCount: number;
      deadLinkCount: number;
    }>;
    meta: {
      totalProducts: number;
      totalShops: number;
      missingProductCount: number;
      pendingReviewCount: number;
      withoutQcCount: number;
      deadLinkCount: number;
    };
  }> {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const baseQb = this.buildAdminProductsQuery(query, {
      excludeShopFilter: true,
    });
    const [baseSql, baseParams] = baseQb
      .clone()
      .select([
        `${NORMALIZED_SHOP_ID_SQL} AS "shopId"`,
        `NULLIF(BTRIM(product."weidianShopName"), '') AS "shopName"`,
        `CASE WHEN product.status = '${ProductStatus.PENDING_REVIEW}' THEN 1 ELSE 0 END AS "isPendingReview"`,
        `CASE WHEN ${PRODUCT_WITHOUT_QC_SQL} THEN 1 ELSE 0 END AS "isWithoutQc"`,
        `CASE WHEN ${PRODUCT_DEAD_LINK_CONFIRMED_SQL} THEN 1 ELSE 0 END AS "isDeadLink"`,
        `CASE WHEN ${PRODUCT_UNKNOWN_SHOP_SQL} THEN 1 ELSE 0 END AS "isUnknown"`,
      ])
      .getQueryAndParameters();

    const rawRowsPromise: Promise<AdminShopAggregateRow[]> =
      this.productRepository.manager.query(
        `
          SELECT
            stats."shopId" AS "shopId",
            COALESCE(MAX(stats."shopName"), '${UNKNOWN_SHOP_LABEL}') AS "shopName",
            COUNT(*)::int AS "productCount",
            COALESCE(SUM(stats."isPendingReview"), 0)::int AS "pendingReviewCount",
            COALESCE(SUM(stats."isWithoutQc"), 0)::int AS "withoutQcCount",
            COALESCE(SUM(stats."isDeadLink"), 0)::int AS "deadLinkCount"
          FROM (${baseSql}) stats
          GROUP BY stats."shopId"
          ORDER BY COUNT(*) DESC, COALESCE(MAX(stats."shopName"), '${UNKNOWN_SHOP_LABEL}') ASC
          LIMIT ${safeLimit}
        `,
        baseParams,
      );

    const totalsPromise: Promise<
      Array<{
        totalProducts: string | number;
        pendingReviewCount: string | number;
        withoutQcCount: string | number;
        deadLinkCount: string | number;
        missingProductCount: string | number;
      }>
    > = this.productRepository.manager.query(
      `
        SELECT
          COUNT(*)::int AS "totalProducts",
          COALESCE(SUM(stats."isPendingReview"), 0)::int AS "pendingReviewCount",
          COALESCE(SUM(stats."isWithoutQc"), 0)::int AS "withoutQcCount",
          COALESCE(SUM(stats."isDeadLink"), 0)::int AS "deadLinkCount",
          COALESCE(SUM(stats."isUnknown"), 0)::int AS "missingProductCount"
        FROM (${baseSql}) stats
      `,
      baseParams,
    );

    const totalShopsPromise: Promise<Array<{ totalShops: string | number }>> =
      this.productRepository.manager.query(
        `
          SELECT COUNT(DISTINCT stats."shopId")::int AS "totalShops"
          FROM (${baseSql}) stats
        `,
        baseParams,
      );

    const [rawRows, totalsRows, totalShopsRows] = await Promise.all([
      rawRowsPromise,
      totalsPromise,
      totalShopsPromise,
    ]);
    const totals = totalsRows[0];
    const totalShopsRow = totalShopsRows[0];

    return {
      data: rawRows.map((row) => ({
        shopId: row.shopId || UNKNOWN_SHOP_KEY,
        shopName: row.shopName || UNKNOWN_SHOP_LABEL,
        productCount: parseInt(String(row.productCount), 10) || 0,
        pendingReviewCount: parseInt(String(row.pendingReviewCount), 10) || 0,
        withoutQcCount: parseInt(String(row.withoutQcCount), 10) || 0,
        deadLinkCount: parseInt(String(row.deadLinkCount), 10) || 0,
      })),
      meta: {
        totalProducts: parseInt(String(totals?.totalProducts || '0'), 10) || 0,
        totalShops: parseInt(String(totalShopsRow?.totalShops || '0'), 10) || 0,
        missingProductCount:
          parseInt(String(totals?.missingProductCount || '0'), 10) || 0,
        pendingReviewCount:
          parseInt(String(totals?.pendingReviewCount || '0'), 10) || 0,
        withoutQcCount:
          parseInt(String(totals?.withoutQcCount || '0'), 10) || 0,
        deadLinkCount: parseInt(String(totals?.deadLinkCount || '0'), 10) || 0,
      },
    };
  }
}
