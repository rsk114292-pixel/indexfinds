/**
 * SKU 相关工具函数
 * 用于处理 SKU 属性解析、尺码识别等逻辑
 */

/**
 * 过滤无效属性值（联系方式、微信、电话等）
 */
export function isInvalidAttribute(key: string, value: string): boolean {
  const lowerKey = key.toLowerCase();
  const lowerValue = value.toLowerCase();
  const blacklistKeywords = [
    "whatsapp", "wechat", "微信", "电话", "phone", "tel", "qq", "contact", "联系",
  ];
  if (blacklistKeywords.some((kw) => lowerKey.includes(kw) || lowerValue.includes(kw))) {
    return true;
  }
  if (/\d{8,}/.test(value.replace(/[\s\-+]/g, ""))) {
    return true;
  }
  return false;
}

/**
 * 判断单个值是否为尺码/规格类型（应该显示为文字按钮而非图片）
 */
export function isSizeValue(value: string): boolean {
  const val = value.trim().toLowerCase();
  // 鞋码：35-48，支持小数点（如 36, 36.5, 37.5, 40, 42）
  if (/^(3[5-9]|4[0-8])(\.\d)?$/.test(val)) return true;
  // 服装尺码（XS, S, M, L, XL 等）
  if (/^(xxs|xs|s|m|l|xl|xxl|xxxl|one\s*size)$/i.test(val)) return true;
  // 身高尺码，必须带"码"字（如 "165码", "170码"，范围 150-200）
  if (/^(1[5-9]\d|200)码$/.test(val)) return true;
  // 长度/尺寸（如 "100cm", "105cm(Length)..."，皮带长度等）
  if (/\d+\s*cm/i.test(val)) return true;
  // 包含 "length" 关键词
  if (val.includes('length')) return true;
  // 多国尺码格式（如 "US4=UK3.5=FR36=JP215=CHN210"）
  if (/^[a-z]{2,3}\d/.test(val) && val.includes('=')) return true;
  // 纯尺码格式（如 "US4", "UK3.5", "EU36", "FR38"）
  if (/^(us|uk|eu|fr|jp|chn|eur)\s*\d/i.test(val)) return true;
  return false;
}

/**
 * 判断属性名是否为尺码/规格类属性
 */
export function isSizeAttributeName(name: string): boolean {
  return /尺码|尺寸|size|码数|鞋码|皮带|长度|length|规格/i.test(name);
}

/**
 * 判断属性名是否为颜色/款式类属性（这类属性的值不应被识别为尺码）
 */
export function isColorAttributeName(name: string): boolean {
  return /color|颜色|款式|style|款|花色|配色/i.test(name);
}

/**
 * 解析 SKU attributes（处理可能的双重 JSON 序列化）
 */
export function parseSkuAttributes(attrs: unknown): Record<string, string> {
  if (!attrs) return {};
  if (typeof attrs === 'object' && attrs !== null) {
    return attrs as Record<string, string>;
  }
  if (typeof attrs === 'string') {
    try {
      const parsed = JSON.parse(attrs);
      // 可能还需要再解析一次（双重序列化的情况）
      if (typeof parsed === 'string') {
        return JSON.parse(parsed);
      }
      return parsed;
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * SKU 属性选项类型
 */
export interface AttributeOption {
  value: string;
  image?: string;
}

/**
 * 属性排序优先级
 */
export function getAttributePriority(hasImages: boolean, isSize: boolean): number {
  if (hasImages && !isSize) return 1; // 有图片的非尺码属性（颜色、款式）
  if (!hasImages && !isSize) return 2; // 无图片的非尺码属性
  if (isSize) return 3; // 尺码/规格属性
  return 4;
}
