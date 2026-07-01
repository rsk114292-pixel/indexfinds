/**
 * 搜索初始化服务
 *
 * 负责在应用启动时配置搜索编排器，注册策略、增强器和处理器
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { SearchOrchestratorService } from '../search/orchestrator/search-orchestrator.service';
import { KeywordSearchStrategy } from '../search/strategies/keyword-search.strategy';
import { MultiPathRecallStrategy } from '../search/strategies/multi-path-recall.strategy';
import { BatchIdSearchStrategy } from '../search/strategies/batch-id-search.strategy';
import { SpellCorrectionEnhancer } from '../search/enhancers/spell-correction.enhancer';
import { MultiPathRecallEnhancer } from '../search/enhancers/multi-path-recall.enhancer';
import { SemanticSupplementEnhancer } from '../search/enhancers/semantic-supplement.enhancer';
import { SmartRankingProcessor } from '../search/processors/smart-ranking.processor';

@Injectable()
export class SearchInitializerService implements OnModuleInit {
  private readonly logger = new Logger(SearchInitializerService.name);

  constructor(
    private readonly orchestrator: SearchOrchestratorService,
    private readonly batchIdSearchStrategy: BatchIdSearchStrategy,
    private readonly multiPathRecallStrategy: MultiPathRecallStrategy,
    private readonly keywordSearchStrategy: KeywordSearchStrategy,
    private readonly spellCorrectionEnhancer: SpellCorrectionEnhancer,
    private readonly multiPathRecallEnhancer: MultiPathRecallEnhancer,
    private readonly semanticSupplementEnhancer: SemanticSupplementEnhancer,
    private readonly smartRankingProcessor: SmartRankingProcessor,
  ) {}

  onModuleInit() {
    this.initializeOrchestrator();
  }

  private initializeOrchestrator() {
    this.logger.log('初始化搜索编排器...');

    // 注册策略（按优先级顺序）
    // 1. 批量 ID 查询 - 最高优先级，快速路径
    this.orchestrator.registerStrategy(this.batchIdSearchStrategy);
    // 2. 多路召回 - 用于纯意图搜索
    this.orchestrator.registerStrategy(this.multiPathRecallStrategy);
    // 3. 关键词搜索 - 默认搜索策略
    this.orchestrator.registerStrategy(this.keywordSearchStrategy);

    // 注册增强器（按优先级顺序）
    // 1. 拼写纠正 - 无结果时首先尝试
    this.orchestrator.registerEnhancer(this.spellCorrectionEnhancer);
    // 2. 多路召回 - 作为兜底
    this.orchestrator.registerEnhancer(this.multiPathRecallEnhancer);
    // 3. 语义补充 - 结果不足时补充
    this.orchestrator.registerEnhancer(this.semanticSupplementEnhancer);

    // 注册后处理器
    this.orchestrator.registerPostProcessor(this.smartRankingProcessor);

    this.logger.log(
      `搜索编排器初始化完成 - 策略: ${this.orchestrator.getStrategies().join(', ')}`,
    );
    this.logger.log(`增强器: ${this.orchestrator.getEnhancers().join(', ')}`);
    this.logger.log(
      `后处理器: ${this.orchestrator.getPostProcessors().join(', ')}`,
    );
  }
}
