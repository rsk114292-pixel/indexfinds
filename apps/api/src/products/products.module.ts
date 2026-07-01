import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../queue/queue.module';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductStatusService } from './product-status.service';
import { ProductSkuService } from './product-sku.service';
import { ProductImportService } from './product-import.service';
import { ProductQueryService } from './product-query.service';
import { ProductSearchRuntimeService } from './product-search-runtime.service';
import { ProductDetailService } from './product-detail.service';
import { ProductPurchaseService } from './product-purchase.service';
import { ProductCatalogQueryService } from './product-catalog-query.service';
import { AdminProductQueryService } from './admin-product-query.service';
import { ProductFilterBuilderService } from './product-filter-builder.service';
import { ProductFacetService } from './product-facet.service';
import { ProductSearchEnhancerService } from './product-search-enhancer.service';
import { ProductAIEnhancerService } from './product-ai-enhancer.service';
import { ProductCreatorService } from './product-creator.service';
import { ProductDataMapperService } from './product-data-mapper.service';
import { ProductEventListener } from './product-event.listener';
import { MixedProductService } from './mixed-product.service';
import { MixedProductQueryService } from './mixed-product-query.service';
import { MixedProductSplitService } from './mixed-product-split.service';
import { MixedProductHistoryService } from './mixed-product-history.service';
import { SearchSpellCorrectionService } from './search-spell-correction.service';
import { SearchRecallEnhancerService } from './search-recall-enhancer.service';
import { SearchSortingBoostService } from './search-sorting-boost.service';
import { Product } from './entities/product.entity';
import { ProductInteractionEvent } from './entities/product-interaction-event.entity';
import { ProductQcMedia } from './entities/product-qc-media.entity';
import { Sku } from './entities/sku.entity';
import { WeidianCache } from './entities/weidian-cache.entity';
import { ProductSplitHistory } from './entities/product-split-history.entity';
import { SkuSplitJob } from './entities/sku-split-job.entity';
import { SkuSplitItem } from './entities/sku-split-item.entity';
import { SkuSplitBatch } from './entities/sku-split-batch.entity';
import { SkuSplitBatchItem } from './entities/sku-split-batch-item.entity';
import { SkuSplitAnalyzerService } from './services/sku-split-analyzer.service';
import { SkuSplitService } from './services/sku-split.service';
import { UnifiedDuplicateCheckService } from './services/unified-duplicate-check.service';
import { SkuSplitProcessor } from '../queue/processors/sku-split.processor';
import { SkuSplitBatchProcessor } from '../queue/processors/sku-split-batch.processor';
import { SkuSplitController } from './sku-split.controller';
import { Category } from '../categories/entities/category.entity';
import { Brand } from '../brands/entities/brand.entity';
import { WeidianModule } from '../weidian/weidian.module';
import { CategoriesModule } from '../categories/categories.module';
import { BrandsModule } from '../brands/brands.module';
import { AIModule } from '../ai/ai.module';
import { SettingsModule } from '../settings/settings.module';
import { PlatformsModule } from '../platforms/platforms.module';
import { SearchModule } from '../search/search.module';
import { ProductDataModule } from '../shared/product-data.module';
import { AttributesModule } from '../attributes/attributes.module';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';
// 搜索策略
import { KeywordSearchStrategy } from '../search/strategies/keyword-search.strategy';
import { MultiPathRecallStrategy } from '../search/strategies/multi-path-recall.strategy';
import { BatchIdSearchStrategy } from '../search/strategies/batch-id-search.strategy';
// 搜索增强器
import { SpellCorrectionEnhancer } from '../search/enhancers/spell-correction.enhancer';
import { MultiPathRecallEnhancer } from '../search/enhancers/multi-path-recall.enhancer';
import { SemanticSupplementEnhancer } from '../search/enhancers/semantic-supplement.enhancer';
// 后处理器
import { SmartRankingProcessor } from '../search/processors/smart-ranking.processor';
// 搜索初始化器
import { SearchInitializerService } from './search-initializer.service';
import { PopularityScoreService } from './popularity-score.service';

import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductInteractionEvent,
      ProductQcMedia,
      Sku,
      WeidianCache,
      Category,
      Brand,
      ProductSplitHistory,
      SkuSplitJob,
      SkuSplitItem,
      SkuSplitBatch,
      SkuSplitBatchItem,
    ]),
    BullModule.registerQueue({ name: QUEUE_NAMES.EMBEDDING }),
    BullModule.registerQueue({ name: QUEUE_NAMES.SKU_SPLIT }),
    BullModule.registerQueue({ name: QUEUE_NAMES.SKU_SPLIT_BATCH }),
    WeidianModule,
    CategoriesModule,
    BrandsModule,
    AIModule,
    SettingsModule,
    PlatformsModule,
    SearchModule,
    ProductDataModule, // ProductQueryFacadeService 由此模块提供
    AttributesModule,
    MeilisearchModule,
    ConfigModule,
  ],
  controllers: [SkuSplitController, ProductsController],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) =>
        new Redis({
          host: configService.get('REDIS_HOST', '127.0.0.1'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD') || undefined,
          family: 4,
        }),
      inject: [ConfigService],
    },
    ProductsService,
    ProductStatusService,
    ProductSkuService,
    ProductImportService,
    ProductQueryService,
    ProductSearchRuntimeService,
    ProductDetailService,
    ProductPurchaseService,
    ProductCatalogQueryService,
    AdminProductQueryService,
    ProductFilterBuilderService,
    ProductFacetService,
    ProductSearchEnhancerService,
    ProductAIEnhancerService,
    ProductCreatorService,
    ProductDataMapperService,
    ProductEventListener,
    MixedProductService,
    MixedProductQueryService,
    MixedProductSplitService,
    MixedProductHistoryService,
    SearchSpellCorrectionService,
    SearchRecallEnhancerService,
    SearchSortingBoostService,
    // 搜索策略
    KeywordSearchStrategy,
    MultiPathRecallStrategy,
    BatchIdSearchStrategy,
    // 搜索增强器
    SpellCorrectionEnhancer,
    MultiPathRecallEnhancer,
    SemanticSupplementEnhancer,
    // 后处理器
    SmartRankingProcessor,
    // 搜索初始化器
    SearchInitializerService,
    // 热度分计算
    PopularityScoreService,
    // SKU 拆分
    SkuSplitAnalyzerService,
    SkuSplitService,
    SkuSplitProcessor,
    SkuSplitBatchProcessor,
    // 统一去重
    UnifiedDuplicateCheckService,
  ],
  exports: [
    ProductsService,
    ProductStatusService,
    ProductSkuService,
    ProductImportService,
    ProductQueryService,
    ProductSearchRuntimeService,
    ProductDetailService,
    ProductPurchaseService,
    ProductCatalogQueryService,
    AdminProductQueryService,
    ProductFilterBuilderService,
    ProductFacetService,
    ProductSearchEnhancerService,
    ProductDataModule, // re-export: ProductQueryFacadeService 供其他模块使用
    ProductAIEnhancerService, // 供 BatchModule 使用
    MixedProductService, // 供拆分操作使用
    SkuSplitAnalyzerService,
    SkuSplitService,
    UnifiedDuplicateCheckService,
  ],
})
export class ProductsModule {}
