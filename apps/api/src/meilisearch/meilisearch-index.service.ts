import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Settings, Synonyms } from 'meilisearch';
import { MeilisearchService } from './meilisearch.service';
import { MEILI_INDEX, MEILI_TASK_WAIT_OPTIONS } from './meilisearch.constants';
import { SynonymGroup } from '../search/entities/synonym-group.entity';
import { MEILI_STOP_WORDS } from './meilisearch-stop-words';

const MAX_VALUES_PER_FACET = 5000;
const MAX_TOTAL_HITS = 250000;

const INDEX_SETTINGS: Settings = {
  distinctAttribute: 'catalogCoverKey',
  searchableAttributes: [
    'title',
    'brandName',
    'aiBrandName',
    'categoryName',
    'originalTitle',
    'description',
    'colors',
    'styles',
    'genders',
    'occasions',
    'seasons',
  ],
  filterableAttributes: [
    'status',
    'productGroupId',
    'brandSlug',
    'allCategorySlugs',
    'colors',
    'styles',
    'genders',
    'occasions',
    'seasons',
    'priceMin',
    'priceMax',
    'isFeatured',
    'hasVariants',
  ],
  sortableAttributes: [
    'createdAt',
    'priceMin',
    'viewCount',
    'salesCount',
    'ctr',
    'popularityScore',
    'isFeatured',
    'featuredSort',
  ],
  faceting: {
    maxValuesPerFacet: MAX_VALUES_PER_FACET,
  },
  rankingRules: [
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
    'popularityScore:desc',
  ],
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: {
      oneTypo: 4,
      twoTypos: 8,
    },
  },
  pagination: {
    maxTotalHits: MAX_TOTAL_HITS,
  },
};

@Injectable()
export class MeilisearchIndexService {
  private readonly logger = new Logger(MeilisearchIndexService.name);

  constructor(
    private readonly meilisearchService: MeilisearchService,
    @InjectRepository(SynonymGroup)
    private readonly synonymRepository: Repository<SynonymGroup>,
  ) {}

  /**
   * Create index if it doesn't exist and apply settings.
   */
  async ensureIndex(): Promise<void> {
    const client = this.meilisearchService.getClient();

    try {
      await client
        .createIndex(MEILI_INDEX.PRODUCTS, { primaryKey: 'id' })
        .waitTask(MEILI_TASK_WAIT_OPTIONS);
    } catch (error) {
      if (!this.isIndexAlreadyExistsError(error)) {
        throw error;
      }

      this.logger.log(
        `Index "${MEILI_INDEX.PRODUCTS}" already exists, refreshing settings`,
      );
    }

    await this.applySettingsToIndex(MEILI_INDEX.PRODUCTS);

    await this.syncStopWords();
    await this.syncSynonyms();

    this.logger.log(
      `Index "${MEILI_INDEX.PRODUCTS}" ready with settings applied`,
    );
  }

  /**
   * Zero-downtime index rebuild: create temp index for caller to populate.
   */
  async createTempIndex(): Promise<string> {
    const client = this.meilisearchService.getClient();
    const tmpUid = `${MEILI_INDEX.PRODUCTS}_tmp`;

    // Delete leftover temp index if exists
    await client.deleteIndexIfExists(tmpUid);

    await client
      .createIndex(tmpUid, { primaryKey: 'id' })
      .waitTask(MEILI_TASK_WAIT_OPTIONS);
    await this.applySettingsToIndex(tmpUid);

    // Apply stopWords and synonyms to temp index (preserved after swap)
    await this.applyStopWordsToIndex(tmpUid);
    await this.applySynonymsToIndex(tmpUid);

    return tmpUid;
  }

  /**
   * Atomically swap temp index with production, then delete old.
   */
  async swapAndCleanup(tmpUid: string): Promise<void> {
    const client = this.meilisearchService.getClient();

    await client
      .swapIndexes([{ indexes: [MEILI_INDEX.PRODUCTS, tmpUid] } as any])
      .waitTask(MEILI_TASK_WAIT_OPTIONS);

    // After swap, tmpUid holds old data — delete it
    await client.deleteIndex(tmpUid).waitTask(MEILI_TASK_WAIT_OPTIONS);

    this.logger.log('Index swap completed successfully');
  }

  /**
   * Sync synonyms from database to the production index.
   */
  async syncSynonyms(): Promise<void> {
    await this.applySynonymsToIndex(MEILI_INDEX.PRODUCTS);
  }

  /**
   * Sync standard linguistic stop words to the production index.
   */
  async syncStopWords(): Promise<void> {
    await this.applyStopWordsToIndex(MEILI_INDEX.PRODUCTS);
  }

  /**
   * 校验当前索引配置是否与代码中定义一致
   */
  async validateSettings(): Promise<{
    configMatch: boolean;
    missingSort: string[];
    missingFilter: string[];
    documentCount: number;
  }> {
    const client = this.meilisearchService.getClient();
    const index = client.index(MEILI_INDEX.PRODUCTS);

    const [settings, stats] = await Promise.all([
      index.getSettings(),
      index.getStats(),
    ]);

    const expectedSort = INDEX_SETTINGS.sortableAttributes ?? [];
    const actualSort = settings.sortableAttributes ?? [];
    const missingSort = expectedSort.filter((a) => !actualSort.includes(a));

    const expectedFilter = (INDEX_SETTINGS.filterableAttributes ?? []).map(
      String,
    );
    const actualFilter = (settings.filterableAttributes ?? []).map(String);
    const missingFilter = expectedFilter.filter(
      (a) => !actualFilter.includes(a),
    );

    return {
      configMatch: missingSort.length === 0 && missingFilter.length === 0,
      missingSort,
      missingFilter,
      documentCount: stats.numberOfDocuments,
    };
  }

  // ===== Internal helpers =====

  private async applySynonymsToIndex(indexUid: string): Promise<void> {
    const groups = await this.synonymRepository.find({
      where: { isActive: true },
    });

    const synonyms: Synonyms = {};

    for (const group of groups) {
      const allTerms = [group.canonicalTerm, ...group.synonyms].map((t) =>
        t.toLowerCase().trim(),
      );

      for (const term of allTerms) {
        const others = allTerms.filter((t) => t !== term);
        if (others.length > 0) {
          synonyms[term] = others;
        }
      }
    }

    const client = this.meilisearchService.getClient();
    await client
      .index(indexUid)
      .updateSynonyms(synonyms)
      .waitTask(MEILI_TASK_WAIT_OPTIONS);

    this.logger.log(
      `Synced ${groups.length} synonym groups (${Object.keys(synonyms).length} terms) to index "${indexUid}"`,
    );
  }

  private async applyStopWordsToIndex(indexUid: string): Promise<void> {
    const client = this.meilisearchService.getClient();
    await client
      .index(indexUid)
      .updateStopWords(MEILI_STOP_WORDS)
      .waitTask(MEILI_TASK_WAIT_OPTIONS);

    this.logger.log(
      `Synced ${MEILI_STOP_WORDS.length} stop words to index "${indexUid}"`,
    );
  }

  private async applySettingsToIndex(indexUid: string): Promise<void> {
    const client = this.meilisearchService.getClient();
    await client
      .index(indexUid)
      .updateSettings(INDEX_SETTINGS)
      .waitTask(MEILI_TASK_WAIT_OPTIONS);
  }

  private isIndexAlreadyExistsError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybeError = error as {
      code?: string;
      errorCode?: string;
      message?: string;
    };

    return (
      maybeError.code === 'index_already_exists' ||
      maybeError.errorCode === 'index_already_exists' ||
      maybeError.message?.toLowerCase().includes('already exists') === true
    );
  }
}
