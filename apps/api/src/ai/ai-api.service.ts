import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { AIProvider } from './interfaces/ai-provider.interface';
import { SettingsService } from '../settings/settings.service';

/**
 * Qwen AI Provider - 阿里云 DashScope 实现
 *
 * 实现 AIProvider 接口，可通过 AI_PROVIDER token 注入，
 * 方便未来替换为其他 AI 提供商。
 * 配置从数据库 settings 表动态读取，支持在管理后台在线修改。
 */
@Injectable()
export class AIApiService implements AIProvider {
  private readonly logger = new Logger(AIApiService.name);
  private readonly maxSingleImages = 4;

  private readonly USAGE_CACHE_KEY = 'ai:daily:usage';

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private settingsService: SettingsService,
  ) {}

  async isAvailable(): Promise<boolean> {
    const config = await this.settingsService.getAIConfig();
    return !!config.apiKey;
  }

  private getTodayCacheKey(): string {
    const today = new Date().toISOString().slice(0, 10);
    return `${this.USAGE_CACHE_KEY}:${today}`;
  }

  async incrementUsage(): Promise<void> {
    const key = this.getTodayCacheKey();
    const usage = (await this.cacheManager.get<number>(key)) || 0;
    await this.cacheManager.set(key, usage + 1, 86400000);
  }

  async getUsageStats(): Promise<{ used: number; date: string }> {
    const key = this.getTodayCacheKey();
    const used = (await this.cacheManager.get<number>(key)) || 0;
    return { used, date: new Date().toISOString().slice(0, 10) };
  }

  async analyzeImages(prompt: string, imageUrls: string[]): Promise<string> {
    return this.callAPI(prompt, imageUrls.slice(0, this.maxSingleImages));
  }

  async analyzeMultipleImages(
    prompt: string,
    imageUrls: string[],
  ): Promise<string> {
    return this.callAPI(prompt, imageUrls);
  }

  // 保留旧方法名作为兼容别名
  async callQwenVLAPI(prompt: string, imageUrls: string[]): Promise<string> {
    return this.analyzeImages(prompt, imageUrls);
  }

  async callQwenVLAPIMultiImage(
    prompt: string,
    imageUrls: string[],
  ): Promise<string> {
    return this.analyzeMultipleImages(prompt, imageUrls);
  }

  private async callAPI(
    prompt: string,
    imageUrls: string[],
    retryCount = 0,
  ): Promise<string> {
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [3000, 6000, 12000]; // 3s, 6s, 12s
    // AI 分析超时：3分钟（大量图片分析需要较长时间）
    const TIMEOUT_MS = 180000;

    // 从数据库动态读取配置
    const aiConfig = await this.settingsService.getAIConfig();

    if (!aiConfig.apiKey) {
      throw new Error('AI API Key 未配置，请在管理后台 AI Config 中设置');
    }

    const content: Array<{ image?: string; text?: string }> = [];

    for (const url of imageUrls) {
      content.push({ image: url });
    }

    content.push({ text: prompt });

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(aiConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: aiConfig.model,
          input: {
            messages: [{ role: 'user', content }],
          },
          parameters: {
            // 显式设置最大输出 tokens
            // qwen3-vl-plus 支持最大 32K 输出
            max_tokens: 32000,
            // 返回格式为 JSON
            result_format: 'message',
          },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`AI API 调用超时 (${TIMEOUT_MS / 1000}s)`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();

      // 检查是否是限流错误（429 或 503 Too many requests）
      const isRateLimited =
        response.status === 429 ||
        (response.status >= 500 && errorText.includes('Too many requests'));

      if (isRateLimited && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount];
        this.logger.warn(
          `⚠️ API 限流，${delay / 1000}s 后重试 (${retryCount + 1}/${MAX_RETRIES})...`,
        );
        await this.sleep(delay);
        return this.callAPI(prompt, imageUrls, retryCount + 1);
      }

      throw new Error(
        `Qwen VL API 调用失败: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    await this.incrementUsage();

    const data = (await response.json()) as {
      output?: {
        choices?: Array<{
          finish_reason?: string;
          message?: { content?: Array<{ text?: string }> };
        }>;
      };
    };

    // 防御性检查 API 响应结构
    if (!data?.output?.choices?.length) {
      this.logger.error(
        `API 响应格式异常: ${JSON.stringify(data).slice(0, 500)}`,
      );
      throw new Error('Qwen VL API 返回格式异常: 缺少 output.choices');
    }

    const choice = data.output.choices[0];
    if (!choice) {
      throw new Error('Qwen VL API 返回格式异常: choices[0] 为空');
    }

    const finishReason = choice.finish_reason;
    const responseContent = choice.message?.content;

    if (
      !responseContent ||
      !Array.isArray(responseContent) ||
      !responseContent[0]?.text
    ) {
      this.logger.error(
        `API 响应内容异常: ${JSON.stringify(choice).slice(0, 500)}`,
      );
      throw new Error('Qwen VL API 返回格式异常: 缺少 message.content[0].text');
    }

    const text = responseContent[0].text;

    this.logger.log(
      `API 响应: finish_reason=${finishReason}, 输出长度=${text.length} 字符`,
    );

    if (finishReason === 'length') {
      this.logger.warn(
        '⚠️ API 响应被截断 (finish_reason=length)，输出可能不完整',
      );
    }

    return text;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
