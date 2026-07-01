/**
 * AI Provider 抽象接口
 *
 * 符合开闭原则 (OCP)：新增 AI 提供商只需实现此接口，
 * 无需修改现有代码。
 *
 * 已有实现：
 * - QwenAIProvider (DashScope qwen3-vl-plus)
 *
 * 未来可扩展：
 * - OpenAIProvider (GPT-4 Vision)
 * - ClaudeProvider (Claude Vision)
 */
export interface AIProvider {
  /**
   * 分析商品图片（限制图片数量，用于单商品分析）
   * @param prompt 分析提示词
   * @param imageUrls 图片 URL 列表（实现方可自行限制数量）
   * @returns AI 返回的文本响应
   */
  analyzeImages(prompt: string, imageUrls: string[]): Promise<string>;

  /**
   * 分析多张商品图片（不限数量，用于混合商品综合分析）
   * @param prompt 分析提示词
   * @param imageUrls 图片 URL 列表
   * @returns AI 返回的文本响应
   */
  analyzeMultipleImages(prompt: string, imageUrls: string[]): Promise<string>;

  /**
   * 获取当日 API 使用量统计
   */
  getUsageStats(): Promise<{ used: number; date: string }>;

  /**
   * 检查 Provider 是否可用（API Key 已配置等）
   */
  isAvailable(): boolean | Promise<boolean>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
