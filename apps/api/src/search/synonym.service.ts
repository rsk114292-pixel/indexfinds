import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository, ILike } from 'typeorm';
import { SynonymGroup } from './entities/synonym-group.entity';
import {
  CreateSynonymGroupDto,
  UpdateSynonymGroupDto,
  QuerySynonymGroupDto,
  BatchImportSynonymDto,
} from './dto';
import { escapeIlike } from './utils/query-validator';
import { SynonymEvents } from '../shared/events/synonym.events';

@Injectable()
export class SynonymService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SynonymService.name);
  private synonymMap: Map<string, string[]> = new Map();
  private refreshTimer: NodeJS.Timeout | null = null;
  private refreshPromise: Promise<void> | null = null;
  private readonly REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5分钟
  private readonly MAX_SYNONYM_MAP_SIZE = 50_000; // Map 条目上限

  constructor(
    @InjectRepository(SynonymGroup)
    private readonly synonymRepository: Repository<SynonymGroup>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    await this.loadSynonymsFromDB();
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

  // ==================== 核心查询扩展方法 ====================

  expandQuery(term: string): string[] {
    const termLower = term.toLowerCase().trim();
    const expanded = this.synonymMap.get(termLower);
    return expanded ? [...expanded] : [term];
  }

  expandTerms(terms: string[]): string[] {
    const result = new Set<string>();
    for (const term of terms) {
      this.expandQuery(term).forEach((t) => result.add(t));
    }
    return Array.from(result);
  }

  // ==================== 缓存管理 ====================

  private async loadSynonymsFromDB(): Promise<void> {
    try {
      const groups = await this.synonymRepository.find({
        where: { isActive: true },
      });

      const newMap = new Map<string, string[]>();

      for (const group of groups) {
        const allTerms = [group.canonicalTerm, ...group.synonyms].map((t) =>
          t.toLowerCase().trim(),
        );

        for (const term of allTerms) {
          newMap.set(term, allTerms);
        }
      }

      if (newMap.size > this.MAX_SYNONYM_MAP_SIZE) {
        this.logger.warn(
          `Synonym map size (${newMap.size}) exceeds limit (${this.MAX_SYNONYM_MAP_SIZE}). Consider pruning inactive synonym groups.`,
        );
      }

      this.synonymMap = newMap;
      this.logger.log(
        `Loaded ${groups.length} synonym groups, ${newMap.size} terms`,
      );
    } catch (error) {
      this.logger.error('Failed to load synonyms', error);
    }
  }

  private startAutoRefresh(): void {
    const scheduleNext = async () => {
      try {
        this.refreshPromise = this.loadSynonymsFromDB();
        await this.refreshPromise;
      } catch (error) {
        this.logger.error('Synonym refresh failed:', error);
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

  // ==================== CRUD 方法 ====================

  async create(dto: CreateSynonymGroupDto): Promise<SynonymGroup> {
    const group = this.synonymRepository.create({
      ...dto,
      category: dto.category || 'general',
    });
    const saved = await this.synonymRepository.save(group);
    await this.loadSynonymsFromDB();
    this.eventEmitter.emit(SynonymEvents.UPDATED);
    return saved;
  }

  async findAll(query: QuerySynonymGroupDto): Promise<{
    data: SynonymGroup[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit: rawLimit = 20, q, category, isActive } = query;
    const limit = Math.min(Math.max(rawLimit, 1), 200);

    const qb = this.synonymRepository.createQueryBuilder('sg');

    if (q) {
      qb.andWhere('(sg.name ILIKE :q OR sg.canonical_term ILIKE :q)', {
        q: `%${escapeIlike(q)}%`,
      });
    }

    if (category) {
      qb.andWhere('sg.category = :category', { category });
    }

    if (isActive !== undefined) {
      qb.andWhere('sg.is_active = :isActive', {
        isActive: isActive === 'true',
      });
    }

    qb.orderBy('sg.created_at', 'DESC');

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<SynonymGroup> {
    const group = await this.synonymRepository.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException(`Synonym group ${id} not found`);
    }
    return group;
  }

  async update(id: string, dto: UpdateSynonymGroupDto): Promise<SynonymGroup> {
    const group = await this.findOne(id);
    Object.assign(group, dto);
    const saved = await this.synonymRepository.save(group);
    await this.loadSynonymsFromDB();
    this.eventEmitter.emit(SynonymEvents.UPDATED);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const group = await this.findOne(id);
    await this.synonymRepository.remove(group);
    await this.loadSynonymsFromDB();
    this.eventEmitter.emit(SynonymEvents.UPDATED);
  }

  async batchImport(
    dto: BatchImportSynonymDto,
  ): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const groupDto of dto.groups) {
      const existing = await this.synonymRepository.findOne({
        where: { canonicalTerm: ILike(groupDto.canonicalTerm) },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await this.synonymRepository.save(
        this.synonymRepository.create({
          ...groupDto,
          category: groupDto.category || 'general',
        }),
      );
      created++;
    }

    await this.loadSynonymsFromDB();
    this.eventEmitter.emit(SynonymEvents.UPDATED);
    return { created, skipped };
  }

  // ==================== 统计方法 ====================

  async getStats(): Promise<{
    totalGroups: number;
    totalTerms: number;
    byCategory: Record<string, number>;
  }> {
    const groups = await this.synonymRepository.find({
      where: { isActive: true },
    });

    const byCategory: Record<string, number> = {};
    for (const group of groups) {
      byCategory[group.category] = (byCategory[group.category] || 0) + 1;
    }

    return {
      totalGroups: groups.length,
      totalTerms: this.synonymMap.size,
      byCategory,
    };
  }
}
