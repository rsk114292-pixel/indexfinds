/**
 * 搜索编排器服务
 *
 * 负责协调搜索流程，按策略优先级执行搜索，
 * 并在必要时进行降级和增强处理
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SearchContext, SearchResult } from './search-context';
import {
  ISearchStrategy,
  ISearchEnhancer,
  ISearchPostProcessor,
} from './search-strategy.interface';
import { validateSearchConfig } from '../../config/search.config';

export interface OrchestratorConfig {
  /** 是否启用语义增强 */
  enableSemanticEnhance?: boolean;
  /** 是否启用拼写纠正 */
  enableSpellCorrection?: boolean;
  /** 是否启用智能排序 */
  enableSmartRanking?: boolean;
}

@Injectable()
export class SearchOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(SearchOrchestratorService.name);

  /**
   * 模块初始化时校验配置
   */
  onModuleInit(): void {
    try {
      validateSearchConfig();
      this.logger.log('✓ Search configuration validated successfully');
    } catch (error) {
      this.logger.error(
        `✗ Search configuration validation failed: ${error.message}`,
      );
      throw error;
    }
  }

  /** 搜索策略（按优先级排序） */
  private strategies: ISearchStrategy[] = [];

  /** 搜索增强器（按优先级排序） */
  private enhancers: ISearchEnhancer[] = [];

  /** 后处理器（按顺序执行） */
  private postProcessors: ISearchPostProcessor[] = [];

  /**
   * 注册搜索策略
   */
  registerStrategy(strategy: ISearchStrategy): void {
    this.strategies.push(strategy);
    this.logger.log(`注册搜索策略: ${strategy.name}`);
  }

  /**
   * 注册搜索增强器
   */
  registerEnhancer(enhancer: ISearchEnhancer): void {
    this.enhancers.push(enhancer);
    this.logger.log(`注册搜索增强器: ${enhancer.name}`);
  }

  /**
   * 注册后处理器
   */
  registerPostProcessor(processor: ISearchPostProcessor): void {
    this.postProcessors.push(processor);
    this.logger.log(`注册后处理器: ${processor.name}`);
  }

  /**
   * 执行搜索
   */
  async execute(
    context: SearchContext,
    config: OrchestratorConfig = {},
  ): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      // 1. 执行主搜索策略
      await this.executeStrategies(context);

      // 2. 执行增强（如果需要）
      if (!context.hasResults() || context.needsMoreResults()) {
        await this.executeEnhancers(context, config);
      }

      // 3. 执行后处理
      await this.executePostProcessors(context);

      const duration = Date.now() - startTime;
      this.logger.debug(
        `搜索完成, 耗时: ${duration}ms, 结果数: ${context.result?.total ?? 0}`,
      );

      return context.result ?? { products: [], total: 0 };
    } catch (error) {
      this.logger.error(`搜索执行失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 执行搜索策略
   */
  private async executeStrategies(context: SearchContext): Promise<void> {
    for (const strategy of this.strategies) {
      if (context.completed) {
        this.logger.debug(`搜索已完成，跳过策略: ${strategy.name}`);
        break;
      }

      if (!strategy.canHandle(context)) {
        this.logger.debug(`策略不适用: ${strategy.name}`);
        continue;
      }

      try {
        this.logger.debug(`执行搜索策略: ${strategy.name}`);
        const result = await strategy.execute(context);
        context.setResult(result);

        if (result.total > 0) {
          this.logger.debug(
            `策略 ${strategy.name} 找到 ${result.total} 条结果`,
          );
          // 找到结果后不再继续（除非需要更多结果）
          if (!context.needsMoreResults()) {
            break;
          }
        }
      } catch (error) {
        this.logger.warn(
          `策略 ${strategy.name} 执行失败: ${error.message}`,
          error.stack,
        );
        // 继续尝试下一个策略
      }
    }
  }

  /**
   * 执行搜索增强
   */
  private async executeEnhancers(
    context: SearchContext,
    config: OrchestratorConfig,
  ): Promise<void> {
    for (const enhancer of this.enhancers) {
      if (!enhancer.shouldEnhance(context)) {
        continue;
      }

      // 检查配置是否启用（通过 configKey 而非硬编码名称）
      if (enhancer.configKey && config[enhancer.configKey] === false) {
        continue;
      }

      try {
        this.logger.debug(`执行搜索增强: ${enhancer.name}`);
        const result = await enhancer.enhance(context);

        if (result && result.total > 0) {
          context.setResult({
            ...context.result,
            ...result,
          });
          this.logger.debug(
            `增强器 ${enhancer.name} 补充了 ${result.total} 条结果`,
          );

          // 如果结果足够，停止增强
          if (!context.needsMoreResults()) {
            break;
          }
        }
      } catch (error) {
        this.logger.warn(
          `增强器 ${enhancer.name} 执行失败: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * 执行后处理
   */
  private async executePostProcessors(context: SearchContext): Promise<void> {
    for (const processor of this.postProcessors) {
      if (!processor.shouldProcess(context)) {
        continue;
      }

      try {
        this.logger.debug(`执行后处理: ${processor.name}`);
        await processor.process(context);
      } catch (error) {
        this.logger.warn(
          `后处理器 ${processor.name} 执行失败: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * 获取已注册的策略列表
   */
  getStrategies(): string[] {
    return this.strategies.map((s) => s.name);
  }

  /**
   * 获取已注册的增强器列表
   */
  getEnhancers(): string[] {
    return this.enhancers.map((e) => e.name);
  }

  /**
   * 获取已注册的后处理器列表
   */
  getPostProcessors(): string[] {
    return this.postProcessors.map((p) => p.name);
  }
}
