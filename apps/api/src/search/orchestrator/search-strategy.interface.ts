/**
 * 搜索策略接口
 *
 * 定义搜索策略的统一接口，支持不同的搜索方式
 */

import { SearchContext, SearchResult } from './search-context';

/**
 * 搜索策略接口
 */
export interface ISearchStrategy {
  /** 策略名称 */
  readonly name: string;

  /**
   * 判断策略是否适用于当前上下文
   */
  canHandle(context: SearchContext): boolean;

  /**
   * 执行搜索
   */
  execute(context: SearchContext): Promise<SearchResult>;
}

/**
 * 搜索后处理器接口
 */
export interface ISearchPostProcessor {
  /** 处理器名称 */
  readonly name: string;

  /**
   * 判断处理器是否适用
   */
  shouldProcess(context: SearchContext): boolean;

  /**
   * 执行后处理
   */
  process(context: SearchContext): void | Promise<void>;
}

/**
 * 搜索增强器接口
 * 用于在搜索结果不足时补充结果
 */
export interface ISearchEnhancer {
  /** 增强器名称 */
  readonly name: string;

  /** 对应的 OrchestratorConfig 开关 key（用于配置启用/禁用） */
  readonly configKey?: 'enableSpellCorrection' | 'enableSemanticEnhance';

  /**
   * 判断是否需要增强
   */
  shouldEnhance(context: SearchContext): boolean;

  /**
   * 执行增强
   */
  enhance(context: SearchContext): Promise<SearchResult | null>;
}
