import { Injectable, Logger } from '@nestjs/common';

/**
 * 微店 HTML 解析服务
 * 从微店商品页面 HTML 抓取店铺信息（降级方案）
 */
@Injectable()
export class WeidianHtmlParserService {
  private readonly logger = new Logger(WeidianHtmlParserService.name);

  /**
   * 从微店商品页面 HTML 抓取店铺信息（降级方案）
   * 当 Thor API 不返回 seller 信息时使用
   */
  async fetchShopInfoFromHtml(
    itemId: string,
  ): Promise<{ shopId?: string; shopName?: string }> {
    const url = `https://weidian.com/item.html?itemID=${itemId}`;
    this.logger.debug(`[${itemId}] 从 HTML 页面抓取店铺信息: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
      });

      if (!response.ok) {
        this.logger.warn(`[${itemId}] HTML 页面请求失败: ${response.status}`);
        return {};
      }

      const html = await response.text();
      return this.parseShopInfoFromHtml(itemId, html);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${itemId}] 抓取 HTML 页面失败: ${message}`);
      return {};
    }
  }

  /**
   * 从 HTML 内容解析店铺信息
   */
  private parseShopInfoFromHtml(
    itemId: string,
    html: string,
  ): { shopId?: string; shopName?: string } {
    // 方法1: 从 data-obj 属性中提取（微店新版页面结构）
    const dataObjResult = this.parseFromDataObj(itemId, html);
    if (dataObjResult.shopId || dataObjResult.shopName) {
      return dataObjResult;
    }

    // 方法2: 从 window.__INITIAL_STATE__ 中提取
    const initialStateResult = this.parseFromInitialState(itemId, html);
    if (initialStateResult.shopId || initialStateResult.shopName) {
      return initialStateResult;
    }

    // 方法3: 从 pageData JSON 中提取
    const pageDataResult = this.parseFromPageData(itemId, html);
    if (pageDataResult.shopId || pageDataResult.shopName) {
      return pageDataResult;
    }

    // 方法4: 从 HTML 正则匹配中提取
    const regexResult = this.parseFromRegex(itemId, html);
    if (regexResult.shopId || regexResult.shopName) {
      return regexResult;
    }

    this.logger.warn(`[${itemId}] 无法从 HTML 页面提取店铺信息`);
    return {};
  }

  /**
   * 从 data-obj 属性解析
   */
  private parseFromDataObj(
    itemId: string,
    html: string,
  ): { shopId?: string; shopName?: string } {
    const dataObjMatch = html.match(/data-obj="([^"]+)"/);
    if (dataObjMatch) {
      try {
        const decoded = dataObjMatch[1]
          .replace(/&#34;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');

        const data = JSON.parse(decoded);
        const shopInfo = data?.result?.default_model?.shop_info;

        if (shopInfo?.shop_id || shopInfo?.shopName) {
          this.logger.log(
            `[${itemId}] 从 data-obj 获取店铺: ${shopInfo.shopName} (ID: ${shopInfo.shop_id})`,
          );
          return {
            shopId: String(shopInfo.shop_id),
            shopName: shopInfo.shopName,
          };
        }
      } catch (e) {
        this.logger.debug(`[${itemId}] data-obj 解析失败: ${e.message}`);
      }
    }
    return {};
  }

  /**
   * 从 __INITIAL_STATE__ 解析
   */
  private parseFromInitialState(
    itemId: string,
    html: string,
  ): { shopId?: string; shopName?: string } {
    const stateMatch = html.match(
      /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|window\.)/,
    );
    if (stateMatch) {
      try {
        const state = JSON.parse(stateMatch[1]);
        if (state?.shop?.shopName || state?.seller?.shopName) {
          const shop = state.shop || state.seller;
          this.logger.log(
            `[${itemId}] 从 __INITIAL_STATE__ 获取店铺: ${shop.shopName}`,
          );
          return {
            shopId: shop.shopId || shop.shop_id || shop.id,
            shopName: shop.shopName || shop.shop_name || shop.name,
          };
        }
      } catch {
        // JSON 解析失败，继续尝试其他方法
      }
    }
    return {};
  }

  /**
   * 从 pageData JSON 解析
   */
  private parseFromPageData(
    itemId: string,
    html: string,
  ): { shopId?: string; shopName?: string } {
    const pageDataMatch = html.match(
      /(?:itemDetail|pageData|__data__)\s*[:=]\s*(\{[\s\S]*?\})\s*[;,<]/,
    );
    if (pageDataMatch) {
      try {
        const data = JSON.parse(pageDataMatch[1]);
        const shop = data.shop || data.seller || data.shopInfo;
        if (shop?.shopName || shop?.name) {
          this.logger.log(
            `[${itemId}] 从 pageData 获取店铺: ${shop.shopName || shop.name}`,
          );
          return {
            shopId: shop.shopId || shop.shop_id || shop.id,
            shopName: shop.shopName || shop.shop_name || shop.name,
          };
        }
      } catch {
        // 继续尝试其他方法
      }
    }
    return {};
  }

  /**
   * 从正则匹配解析
   */
  private parseFromRegex(
    itemId: string,
    html: string,
  ): { shopId?: string; shopName?: string } {
    // 匹配店铺名
    const shopNamePatterns = [
      /<a[^>]*class="[^"]*shop-?name[^"]*"[^>]*>([^<]+)</i,
      /<span[^>]*class="[^"]*shop-?name[^"]*"[^>]*>([^<]+)</i,
      /<div[^>]*class="[^"]*shop-?name[^"]*"[^>]*>([^<]+)</i,
      /shopName["']\s*:\s*["']([^"']+)["']/,
      /shop_name["']\s*:\s*["']([^"']+)["']/,
      /"shopName"\s*:\s*"([^"]+)"/,
    ];

    for (const pattern of shopNamePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const shopName = match[1].trim();
        if (shopName && shopName.length > 0 && shopName.length < 100) {
          this.logger.log(`[${itemId}] 从 HTML 正则匹配获取店铺: ${shopName}`);
          return { shopName };
        }
      }
    }

    // 匹配店铺 ID
    const shopIdMatch = html.match(/shopId['"]\s*:\s*['"]?(\d+)['"]?/);
    if (shopIdMatch) {
      this.logger.log(`[${itemId}] 从 HTML 获取 shopId: ${shopIdMatch[1]}`);
      return { shopId: shopIdMatch[1] };
    }

    return {};
  }
}
