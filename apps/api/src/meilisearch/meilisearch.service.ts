import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch, Index } from 'meilisearch';
import type { SearchParams, SearchResponse, RecordAny } from 'meilisearch';
import { MEILI_INDEX, MEILI_TASK_WAIT_OPTIONS } from './meilisearch.constants';

@Injectable()
export class MeilisearchService implements OnModuleInit {
  private readonly logger = new Logger(MeilisearchService.name);
  private client: MeiliSearch;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.client = new MeiliSearch({
      host: this.configService.get<string>(
        'MEILISEARCH_HOST',
        'http://localhost:17700',
      ),
      apiKey: this.configService.get<string>('MEILISEARCH_API_KEY'),
    });
    this.logger.log(
      `Meilisearch client initialized: ${this.configService.get('MEILISEARCH_HOST')}`,
    );
  }

  getClient(): MeiliSearch {
    return this.client;
  }

  getIndex(uid: string = MEILI_INDEX.PRODUCTS): Index {
    return this.client.index(uid);
  }

  async search(
    query: string,
    options?: SearchParams,
  ): Promise<SearchResponse<RecordAny>> {
    return this.getIndex().search(query, options);
  }

  async addDocuments(documents: RecordAny[]): Promise<void> {
    if (!documents.length) return;
    await this.getIndex()
      .addDocuments(documents)
      .waitTask(MEILI_TASK_WAIT_OPTIONS);
  }

  async updateDocuments(documents: RecordAny[]): Promise<void> {
    if (!documents.length) return;
    await this.getIndex()
      .updateDocuments(documents)
      .waitTask(MEILI_TASK_WAIT_OPTIONS);
  }

  async deleteDocument(id: string): Promise<void> {
    await this.getIndex().deleteDocument(id).waitTask(MEILI_TASK_WAIT_OPTIONS);
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.getIndex()
      .deleteDocuments(ids)
      .waitTask(MEILI_TASK_WAIT_OPTIONS);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.client.health();
      return health.status === 'available';
    } catch {
      return false;
    }
  }
}
