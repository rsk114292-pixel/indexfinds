import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Color } from './entities/color.entity';

@Injectable()
export class ColorsService {
  private readonly logger = new Logger(ColorsService.name);

  private colorCache: Color[] | null = null;
  private colorCacheExpiry: number = 0;
  private readonly COLOR_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(Color)
    private colorRepository: Repository<Color>,
  ) {}

  /**
   * Get colors from in-memory cache (TTL 5 minutes).
   * Colors rarely change, so cache hit rate is near 100%.
   */
  private async getCachedColors(): Promise<Color[]> {
    if (this.colorCache && Date.now() < this.colorCacheExpiry) {
      return this.colorCache;
    }
    this.colorCache = await this.colorRepository.find({
      where: { isActive: true },
    });
    this.colorCacheExpiry = Date.now() + this.COLOR_CACHE_TTL;
    return this.colorCache;
  }

  /**
   * Invalidate the in-memory color cache.
   * Called after create/update/delete operations.
   */
  private invalidateCache(): void {
    this.colorCache = null;
    this.colorCacheExpiry = 0;
  }

  /**
   * Parse aliasesEn from the entity.
   * TypeORM simple-array stores as comma-separated string in DB
   * but returns as string[] at runtime. Handle both cases defensively.
   */
  private parseAliases(aliasesEn: string | string[] | null): string[] {
    if (!aliasesEn) return [];
    if (Array.isArray(aliasesEn)) return aliasesEn;
    return aliasesEn
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
  }

  async create(colorData: Partial<Color>): Promise<Color> {
    const color = this.colorRepository.create(colorData);
    const saved = await this.colorRepository.save(color);
    this.invalidateCache();
    return saved;
  }

  async findAll(): Promise<Color[]> {
    return this.colorRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async findBySlug(slug: string): Promise<Color | null> {
    return this.colorRepository.findOne({ where: { slug } });
  }

  /**
   * 根据输入文本匹配颜色 — 四层匹配策略：
   *
   * Layer 1: Exact match on nameEn or slug
   * Layer 2: Alias exact match in aliasesEn
   * Layer 3: Substring fuzzy match (longest-match-wins to avoid
   *          "green" matching before "army green" for input "dark army green")
   * Layer 4: Fallback to Multicolor + warn log
   */
  async matchColor(input: string): Promise<Color | null> {
    const colors = await this.getCachedColors();
    const normalized = input.trim().toLowerCase();

    if (!normalized) return null;

    // Layer 1: Exact match on nameEn or slug
    const exactMatch = colors.find(
      (c) =>
        c.nameEn?.toLowerCase() === normalized ||
        c.slug.toLowerCase() === normalized,
    );
    if (exactMatch) return exactMatch;

    // Layer 2: Alias exact match in aliasesEn
    for (const color of colors) {
      const aliases = this.parseAliases(color.aliasesEn);
      if (aliases.some((alias) => alias.toLowerCase() === normalized)) {
        return color;
      }
    }

    // Layer 3: Substring fuzzy match (longest-match-wins)
    // Check if the input CONTAINS any known alias (alias priority over color name)
    let bestAliasMatch: Color | null = null;
    let longestAliasLen = 0;
    for (const color of colors) {
      const aliases = this.parseAliases(color.aliasesEn);
      for (const alias of aliases) {
        const aliasLower = alias.toLowerCase();
        if (normalized.includes(aliasLower) && alias.length > longestAliasLen) {
          bestAliasMatch = color;
          longestAliasLen = alias.length;
        }
      }
    }
    if (bestAliasMatch) return bestAliasMatch;

    // Then check if input contains any standard color nameEn
    let bestNameMatch: Color | null = null;
    let longestNameLen = 0;
    for (const color of colors) {
      if (!color.nameEn) continue;
      const name = color.nameEn.toLowerCase();
      if (normalized.includes(name) && name.length > longestNameLen) {
        bestNameMatch = color;
        longestNameLen = name.length;
      }
    }
    if (bestNameMatch) return bestNameMatch;

    // Layer 4: Fallback to Multicolor + warn log
    const multicolor = colors.find((c) => c.slug === 'multicolor');
    this.logger.warn(
      `Color "${input}" could not be matched to any standard color, falling back to Multicolor`,
    );
    return multicolor || null;
  }

  async upsert(colorData: Partial<Color>): Promise<Color> {
    const existing = await this.colorRepository.findOne({
      where: { slug: colorData.slug },
    });
    if (existing) {
      await this.colorRepository.update(existing.id, colorData);
      this.invalidateCache();
      return this.colorRepository.findOne({
        where: { id: existing.id },
      }) as Promise<Color>;
    }
    return this.create(colorData);
  }
}
