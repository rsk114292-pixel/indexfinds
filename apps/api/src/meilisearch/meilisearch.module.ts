import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { SynonymGroup } from '../search/entities/synonym-group.entity';
import { MeilisearchService } from './meilisearch.service';
import { MeilisearchIndexService } from './meilisearch-index.service';
import { MeilisearchSyncService } from './meilisearch-sync.service';
import { MeilisearchSyncListener } from './meilisearch-sync.listener';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Product, Category, SynonymGroup]),
  ],
  providers: [
    MeilisearchService,
    MeilisearchIndexService,
    MeilisearchSyncService,
    MeilisearchSyncListener,
  ],
  exports: [
    MeilisearchService,
    MeilisearchSyncService,
    MeilisearchIndexService,
  ],
})
export class MeilisearchModule {}
