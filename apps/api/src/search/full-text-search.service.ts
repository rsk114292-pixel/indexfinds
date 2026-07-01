import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { FULL_TEXT_SEARCH_CONFIG } from '../config/search.config';
import { escapeIlike } from './utils/query-validator';
import {
  SpellCorrectionService,
  type SpellCorrectionResult,
} from './spell-correction.service';

export interface FuzzySearchResult {
  product: Product;
  score: number;
  highlights?: {
    title?: string;
    description?: string;
  };
}

export interface SearchSuggestion {
  text: string;
  type: 'product' | 'brand' | 'category' | 'correction';
  score: number;
}

/** 原始 SQL 查询返回的产品行（含评分） */
interface ProductScoreRow extends Record<string, unknown> {
  id: string;
  title: string;
  score: string;
}

/**
 * 类型守卫：验证数据库行是否包含 Product 实体的必需字段
 * 用于安全地将原始 SQL 查询结果转换为 Product 类型
 */
function isValidProductRow(row: unknown): row is Product {
  if (!row || typeof row !== 'object') return false;

  const obj = row as Record<string, unknown>;

  // 验证必需字段
  if (typeof obj.id !== 'string' || !obj.id) return false;
  if (typeof obj.title !== 'string' || !obj.title) return false;
  if (typeof obj.slug !== 'string' || !obj.slug) return false;
  if (typeof obj.status !== 'string' || !obj.status) return false;

  // 验证日期字段
  if (!(obj.createdAt instanceof Date) && typeof obj.createdAt !== 'string') {
    return false;
  }
  if (!(obj.updatedAt instanceof Date) && typeof obj.updatedAt !== 'string') {
    return false;
  }

  return true;
}

/**
 * 安全地将数据库查询结果转换为 Product 类型
 * 如果数据不符合预期，抛出错误而非静默失败
 */
function convertToProduct(row: ProductScoreRow, logger: Logger): Product {
  if (!isValidProductRow(row)) {
    const availableFields = Object.keys(row).join(', ');
    logger.error(
      `数据库返回的行缺少 Product 必需字段。可用字段: ${availableFields}`,
    );
    throw new Error(
      `Invalid product data structure. Expected Product entity fields but got: ${availableFields}`,
    );
  }

  return row as Product;
}

// SpellCorrectionResult 已移至 spell-correction.service.ts
export type { SpellCorrectionResult } from './spell-correction.service';

@Injectable()
export class FullTextSearchService implements OnModuleInit {
  private readonly logger = new Logger(FullTextSearchService.name);
  private pgTrgmEnabled = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly spellCorrectionService: SpellCorrectionService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * 模块初始化时检查 pg_trgm 扩展是否可用
   * DDL（CREATE EXTENSION / CREATE INDEX）已迁移至 migrations/search-system-ddl.sql
   */
  async onModuleInit() {
    try {
      await this.dataSource.query(`SELECT 'test'::text % 'test'::text`);
      this.pgTrgmEnabled = true;
      this.logger.log('pg_trgm 扩展可用');
    } catch {
      this.pgTrgmEnabled = false;
      this.logger.warn(
        'pg_trgm 扩展不可用，将使用降级方案。请执行 migrations/search-system-ddl.sql',
      );
    }
  }

  /**
   * 模糊搜索 - 使用 pg_trgm 进行相似度匹配
   * @param query 搜索词
   * @param threshold 相似度阈值 (0-1)
   */
  async fuzzySearch(
    query: string,
    threshold: number = FULL_TEXT_SEARCH_CONFIG.similarityThreshold,
    limit: number = 20,
  ): Promise<FuzzySearchResult[]> {
    if (!query || query.length < 2) return [];

    try {
      if (this.pgTrgmEnabled) {
        // 使用 pg_trgm 的 word_similarity 函数（按单词匹配，适合短查询词 vs 长标题）
        const results = await this.dataSource.query(
          `
          SELECT p.*, GREATEST(
            word_similarity($1, p.title),
            word_similarity($1, COALESCE(p.description, ''))
          ) as score
          FROM products p
          WHERE p.status = 'active'
            AND (word_similarity($1, p.title) > $2
              OR word_similarity($1, COALESCE(p.description, '')) > $2)
          ORDER BY score DESC
          LIMIT $3
          `,
          [query, threshold, limit],
        );
        return results.map((row: ProductScoreRow) => ({
          product: convertToProduct(row, this.logger),
          score: parseFloat(row.score),
        }));
      }
    } catch (error) {
      this.logger.warn(`pg_trgm 查询失败，使用降级方案: ${error.message}`);
    }

    // 降级方案：使用 ILIKE 模糊匹配
    const results = await this.dataSource.query(
      `
      SELECT p.*, 0.5 as score
      FROM products p
      WHERE p.status = 'active'
        AND (p.title ILIKE $1 OR p.description ILIKE $1)
      ORDER BY p."createdAt" DESC
      LIMIT $2
      `,
      [`%${escapeIlike(query)}%`, limit],
    );
    return results.map((row: ProductScoreRow) => ({
      product: convertToProduct(row, this.logger),
      score: 0.5,
    }));
  }

  /**
   * 拼写纠错建议
   *
   * 委托给 SpellCorrectionService 处理
   * 找到与输入最相似的已有词汇（品牌、分类、产品标题）
   */
  async spellingSuggestions(
    query: string,
    limit: number = 5,
  ): Promise<string[]> {
    const suggestions =
      await this.spellCorrectionService.getSpellingSuggestions(query, limit);
    return suggestions.map((s) => s.suggestion);
  }

  /**
   * 搜索建议（自动补全）
   *
   * 使用内存缓存优化热门前缀的查询性能
   * TTL: 5分钟（300秒）
   */
  async searchSuggestions(
    prefix: string,
    limit: number = 10,
  ): Promise<SearchSuggestion[]> {
    if (!prefix || prefix.length < 1) return [];

    // 生成缓存键：前缀 + limit
    const cacheKey = `search:suggestions:${prefix.toLowerCase()}:${limit}`;

    // 尝试从缓存获取
    const cached = await this.cacheManager.get<SearchSuggestion[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const suggestions: SearchSuggestion[] = [];
    const prefixEscaped = `${escapeIlike(prefix.toLowerCase())}%`;
    const containsEscaped = `%${escapeIlike(prefix.toLowerCase())}%`;

    // 1. 产品标题匹配（pg_trgm 可用时使用 similarity 增强，否则降级到 LIKE）
    let productResults: Array<{ title: string; score: string }> = [];

    if (this.pgTrgmEnabled) {
      try {
        productResults = await this.dataSource.query(
          `
          SELECT DISTINCT title,
            CASE WHEN lower(title) LIKE $1 THEN 1.0
                 WHEN lower(title) LIKE $2 THEN 0.8
                 ELSE similarity(title, $3) END as score
          FROM products
          WHERE status = 'active'
            AND (lower(title) LIKE $1 OR lower(title) LIKE $2 OR similarity(title, $3) > 0.2)
          ORDER BY score DESC
          LIMIT $4
          `,
          [prefixEscaped, containsEscaped, prefix, limit],
        );
      } catch (error) {
        this.logger.warn(
          `searchSuggestions: similarity 查询失败，使用降级方案: ${error.message}`,
        );
      }
    }

    if (productResults.length === 0) {
      productResults = await this.dataSource.query(
        `
        SELECT DISTINCT title,
          CASE WHEN lower(title) LIKE $1 THEN 1.0
               WHEN lower(title) LIKE $2 THEN 0.8
               ELSE 0.5 END as score
        FROM products
        WHERE status = 'active'
          AND (lower(title) LIKE $1 OR lower(title) LIKE $2)
        ORDER BY score DESC
        LIMIT $3
        `,
        [prefixEscaped, containsEscaped, limit],
      );
    }

    for (const row of productResults) {
      suggestions.push({
        text: row.title,
        type: 'product',
        score: parseFloat(row.score),
      });
    }

    // 2. 品牌名匹配
    const brandResults = await this.dataSource.query(
      `
      SELECT DISTINCT name,
        CASE WHEN lower(name) LIKE $1 THEN 1.0 ELSE 0.7 END as score
      FROM brands
      WHERE status = 'active'
        AND lower(name) LIKE $1
      ORDER BY score DESC
      LIMIT 5
      `,
      [prefixEscaped],
    );

    for (const row of brandResults) {
      suggestions.push({
        text: row.name,
        type: 'brand',
        score: parseFloat(row.score),
      });
    }

    // 排序并限制结果
    const result = suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // 存入缓存（TTL: 5分钟 = 300秒）
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  /**
   * 纠正整个查询的拼写
   *
   * 委托给 SpellCorrectionService 处理
   * 批量查询所有词的纠正建议（避免 N+1）
   */
  async correctQuery(query: string): Promise<SpellCorrectionResult> {
    return this.spellCorrectionService.correctQuery(query);
  }
}
