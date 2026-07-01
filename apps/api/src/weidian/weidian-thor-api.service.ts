import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import {
  ThorSkuInfoResponse,
  ThorDetailDescResponse,
} from './interfaces/thor-api.interface';

/**
 * Thor API 调用服务
 * 负责与微店 Thor API 通信
 */
@Injectable()
export class WeidianThorApiService {
  private readonly logger = new Logger(WeidianThorApiService.name);
  private readonly THOR_BASE_URL = 'https://thor.weidian.com';
  // 微店 API 超时时间：30秒
  private readonly FETCH_TIMEOUT_MS = 30000;

  /**
   * 获取商品 SKU 信息（Thor API）
   */
  async fetchItemSkuInfo(
    itemId: string,
    wdtoken?: string,
  ): Promise<ThorSkuInfoResponse> {
    const param = JSON.stringify({ itemId });
    const timestamp = Date.now();
    let url = `${this.THOR_BASE_URL}/detail/getItemSkuInfo/1.0?param=${encodeURIComponent(param)}&_=${timestamp}`;

    if (wdtoken) {
      url += `&wdtoken=${encodeURIComponent(wdtoken)}`;
    }

    this.logger.debug(`请求 SKU 信息: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.FETCH_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getRequestHeaders(itemId),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = (await response.json()) as unknown;
      const data = json as ThorSkuInfoResponse;

      if (data.status.code !== 0) {
        throw new Error(`API Error: ${data.status.message}`);
      }

      return data;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpException(
          `获取微店 SKU 信息超时 (${this.FETCH_TIMEOUT_MS / 1000}s)`,
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`获取 SKU 信息失败: ${itemId}`, stack);
      throw new HttpException(
        `获取微店 SKU 信息失败: ${message}`,
        HttpStatus.BAD_GATEWAY,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 获取商品详情描述（Thor API）
   */
  async fetchDetailDesc(
    itemId: string,
    wdtoken?: string,
  ): Promise<ThorDetailDescResponse> {
    const param = JSON.stringify({ vItemId: itemId });
    const timestamp = Date.now();
    let url = `${this.THOR_BASE_URL}/detail/getDetailDesc/1.0?param=${encodeURIComponent(param)}&_=${timestamp}`;

    if (wdtoken) {
      url += `&wdtoken=${encodeURIComponent(wdtoken)}`;
    }

    this.logger.debug(`请求详情描述: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.FETCH_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getRequestHeaders(itemId),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = (await response.json()) as unknown;
      const data = json as ThorDetailDescResponse;

      if (data.status.code !== 0) {
        throw new Error(`API Error: ${data.status.message}`);
      }

      return data;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpException(
          `获取微店详情描述超时 (${this.FETCH_TIMEOUT_MS / 1000}s)`,
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`获取详情描述失败: ${itemId}`, stack);
      throw new HttpException(
        `获取微店详情描述失败: ${message}`,
        HttpStatus.BAD_GATEWAY,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 获取请求头
   */
  private getRequestHeaders(itemId: string): Record<string, string> {
    return {
      Accept: 'application/json, */*',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: `https://weidian.com/item.html?itemID=${itemId}`,
    };
  }
}
