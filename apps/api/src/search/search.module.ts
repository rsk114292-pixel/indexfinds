import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { KeywordAnalysisService } from './keyword-analysis.service';
import { SearchRankingService } from './search-ranking.service';
import { SearchAnalyticsService } from './search-analytics.service';
import { SearchRecordingService } from './search-recording.service';
import { SearchCTRService } from './search-ctr.service';
import { SearchAnalyticsAdminService } from './search-analytics-admin.service';
import { FullTextSearchService } from './full-text-search.service';
import { VisualSearchService } from './visual-search.service';
import { VisualSearchController } from './visual-search.controller';
import { VisualSearchByProductCacheInterceptor } from './visual-search-cache.interceptor';
import { EmbeddingProcessor } from '../queue/processors/embedding.processor';
import { SearchEventListener } from './search-event.listener';
import { SearchLog } from './entities/search-log.entity';
import { HotSearch } from './entities/hot-search.entity';
import { ProductImageEmbedding } from './entities/product-image-embedding.entity';
import { SearchImpression } from './entities/search-impression.entity';
import { SearchClick } from './entities/search-click.entity';
import { SynonymController } from './synonym.controller';
import { SearchTrackingController } from './search-tracking.controller';
import { SearchAnalyticsController } from './search-analytics.controller';
import { OutboundTrackingController } from './outbound-tracking.controller';
import { OutboundTrackingService } from './outbound-tracking.service';
import { OutboundClick } from './entities/outbound-click.entity';
import { BM25RankingService } from './bm25-ranking.service';
import { SearchSuggestionService } from './search-suggestion.service';
import { SemanticSearchService } from './semantic-search.service';
import { EmbeddingGenerationService } from './embedding-generation.service';
import { SemanticSearchController } from './semantic-search.controller';
import { EmbeddingHealthService } from './embedding-health.service';
import { ProductTextEmbedding } from './entities/product-text-embedding.entity';
import { Brand } from '../brands/entities/brand.entity';
import { Category } from '../categories/entities/category.entity';
import { QueueModule } from '../queue/queue.module';
import { MultiPathRecallService } from './multi-path-recall.service';
import { ProductDataModule } from '../shared/product-data.module';
import { SearchOrchestratorService } from './orchestrator/search-orchestrator.service';
import { QueryAnalysisModule } from './query-analysis.module';
import { SpellCorrectionService } from './spell-correction.service';
import { SearchMetricsService } from './search-metrics.service';
import { SearchMetricsController } from './search-metrics.controller';
import { SearchSchedulerService } from './search-scheduler.service';
import { HotSearchAdminService } from './hot-search-admin.service';
import { HotSearchAdminController } from './hot-search-admin.controller';
import { HotSearchExperiment } from './entities/hot-search-experiment.entity';
import { HotSearchExperimentEvent } from './entities/hot-search-experiment-event.entity';
import { PersonalizedHotSearchService } from './personalized-hot-search.service';
import { HotSearchExperimentService } from './hot-search-experiment.service';
import { HotSearchExperimentController } from './hot-search-experiment.controller';
import { ReferralModule } from '../referral/referral.module';
import { VisitTrackingModule } from '../visit-tracking/visit-tracking.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      SearchLog,
      HotSearch,
      ProductImageEmbedding,
      ProductTextEmbedding,
      SearchImpression,
      SearchClick,
      OutboundClick,
      Brand,
      Category,
      HotSearchExperiment,
      HotSearchExperimentEvent,
    ]),
    QueueModule,
    QueryAnalysisModule, // SynonymService, BrandCacheService, IntentDetectorService
    ProductDataModule, // ProductQueryFacadeService（独立模块，消除循环依赖）
    ReferralModule,
    VisitTrackingModule,
  ],
  controllers: [
    VisualSearchController,
    SynonymController,
    SearchTrackingController,
    SearchAnalyticsController,
    OutboundTrackingController,
    SemanticSearchController,
    SearchMetricsController, // 性能监控端点
    HotSearchAdminController, // 热搜管理端点
    HotSearchExperimentController, // 实验管理端点
  ],
  providers: [
    KeywordAnalysisService,
    SearchRankingService,
    SearchAnalyticsService,
    SearchRecordingService,
    SearchCTRService,
    SearchAnalyticsAdminService,
    FullTextSearchService,
    SpellCorrectionService,
    VisualSearchService,
    VisualSearchByProductCacheInterceptor,
    EmbeddingProcessor,
    SearchEventListener,
    BM25RankingService,
    OutboundTrackingService,
    SearchSuggestionService,
    SemanticSearchService,
    EmbeddingGenerationService,
    MultiPathRecallService,
    SearchOrchestratorService,
    EmbeddingHealthService,
    SearchMetricsService, // 性能监控服务
    SearchSchedulerService, // 热搜定时重置 + 日志清理
    HotSearchAdminService, // 热搜管理 CRUD
    PersonalizedHotSearchService, // 个性化热搜
    HotSearchExperimentService, // A/B 实验
  ],
  exports: [
    // === 核心 Facade 服务（主要入口） ===
    SearchOrchestratorService, // 主搜索入口
    SearchAnalyticsService, // 分析入口

    // === Embedding 服务（供 Queue 和 Products 使用） ===
    SemanticSearchService, // 文本向量生成
    VisualSearchService, // 图片向量生成

    // === 被 Products 模块依赖的服务 ===
    // 注：理想情况下应通过 SearchOrchestratorService Facade 访问，
    // 但由于历史原因和性能考虑，暂时保留直接导出
    KeywordAnalysisService, // 关键词分析（product-query.service）
    SearchRankingService, // 排序服务（search-sorting-boost.service）
    FullTextSearchService, // 全文搜索（products.controller）
    MultiPathRecallService, // 多路召回（search-recall-enhancer.service）

    // === 被 Analytics 模块依赖的服务 ===
    OutboundTrackingService, // 外链追踪（admin-analytics.controller）

    // === 查询分析模块（re-export） ===
    QueryAnalysisModule, // 包含: SynonymService, BrandCacheService, IntentDetectorService

    // === 个性化热搜（被 ProductsController 使用） ===
    PersonalizedHotSearchService,

    // 已移除不必要的导出：
    // - BM25RankingService（仅被 SearchRankingService 和 MultiPathRecallService 内部使用）
    // - SearchSuggestionService（仅内部使用）
    // - EmbeddingHealthService（仅内部使用）
  ],
})
export class SearchModule {}
