import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../brands/entities/brand.entity';
import { BrandEvents } from '../shared/events/brand.events';

@Injectable()
export class BrandCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrandCacheService.name);
  private brandMap: Map<string, string> = new Map(); // token -> slug
  /** 父品牌 slug → 子品牌 slug 列表 */
  private parentChildMap: Map<string, string[]> = new Map();
  private refreshTimer: NodeJS.Timeout | null = null;
  private refreshPromise: Promise<void> | null = null;
  private readonly REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5分钟
  private readonly MAX_BRAND_MAP_SIZE = 50_000; // Map 条目上限

  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {}

  async onModuleInit() {
    await this.loadBrands();
    this.startAutoRefresh();
  }

  async onModuleDestroy() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.refreshPromise) {
      await this.refreshPromise;
    }
  }

  /**
   * 从缓存查找品牌
   * @param token 搜索词（品牌名、slug 或别名）
   * @returns 品牌 slug，未找到返回 null
   */
  findBrand(token: string): string | null {
    const tokenLower = token.toLowerCase().trim();
    return this.brandMap.get(tokenLower) || null;
  }

  /**
   * 检查是否是品牌词
   */
  isBrand(token: string): boolean {
    return this.findBrand(token) !== null;
  }

  /**
   * 获取品牌 slug 及其所有子品牌 slug
   *
   * 用于搜索扩展：搜 "nike" 时返回 ["nike", "air-jordan", "nike-sb", "nike-acg"]
   * 使 filter-applier 能同时匹配母品牌和子品牌产品
   */
  getBrandWithChildren(slug: string): string[] {
    const slugLower = slug.toLowerCase();
    const children = this.parentChildMap.get(slugLower) || [];
    return [slugLower, ...children];
  }

  /**
   * 获取缓存统计
   */
  getStats(): {
    brandCount: number;
    termCount: number;
    parentChildPairs: number;
  } {
    const slugs = new Set(this.brandMap.values());
    const childCount = Array.from(this.parentChildMap.values()).reduce(
      (sum, children) => sum + children.length,
      0,
    );
    return {
      brandCount: slugs.size,
      termCount: this.brandMap.size,
      parentChildPairs: childCount,
    };
  }

  /**
   * 加载品牌到内存缓存
   */
  private async loadBrands(): Promise<void> {
    try {
      const brands = await this.brandRepository.find({
        where: { status: 'active' },
        select: ['name', 'slug', 'aliases', 'parentId'],
        relations: ['parent'],
      });

      const newMap = new Map<string, string>();
      const newParentChildMap = new Map<string, string[]>();

      for (const brand of brands) {
        const slug = brand.slug;

        // 添加品牌名
        newMap.set(brand.name.toLowerCase(), slug);

        // 添加 slug
        newMap.set(slug.toLowerCase(), slug);

        // 添加别名
        if (brand.aliases && Array.isArray(brand.aliases)) {
          for (const alias of brand.aliases) {
            if (alias && alias.trim()) {
              newMap.set(alias.toLowerCase().trim(), slug);
            }
          }
        }

        // 构建父子映射
        if (brand.parent) {
          const parentSlug = brand.parent.slug.toLowerCase();
          const children = newParentChildMap.get(parentSlug) || [];
          children.push(slug.toLowerCase());
          newParentChildMap.set(parentSlug, children);
        }
      }

      if (newMap.size > this.MAX_BRAND_MAP_SIZE) {
        this.logger.warn(
          `Brand map size (${newMap.size}) exceeds limit (${this.MAX_BRAND_MAP_SIZE}). Consider pruning inactive brands.`,
        );
      }

      this.brandMap = newMap;
      this.parentChildMap = newParentChildMap;
      this.logger.log(
        `Loaded ${brands.length} brands, ${newMap.size} terms, ${newParentChildMap.size} parent-child groups into cache`,
      );
    } catch (error) {
      this.logger.error('Failed to load brands into cache', error);
    }
  }

  /**
   * 监听品牌变更事件，立即刷新缓存
   */
  @OnEvent(BrandEvents.CREATED)
  @OnEvent(BrandEvents.UPDATED)
  @OnEvent(BrandEvents.DELETED)
  @OnEvent(BrandEvents.MERGED)
  @OnEvent(BrandEvents.APPROVED)
  async handleBrandChange() {
    this.logger.debug('Brand changed, refreshing cache...');
    await this.loadBrands();
  }

  private startAutoRefresh(): void {
    const scheduleNext = async () => {
      try {
        this.refreshPromise = this.loadBrands();
        await this.refreshPromise;
      } catch (error) {
        this.logger.error('Brand cache refresh failed:', error);
      } finally {
        this.refreshPromise = null;
        this.refreshTimer = setTimeout(
          () => void scheduleNext(),
          this.REFRESH_INTERVAL_MS,
        );
      }
    };
    this.refreshTimer = setTimeout(
      () => void scheduleNext(),
      this.REFRESH_INTERVAL_MS,
    );
  }
}
