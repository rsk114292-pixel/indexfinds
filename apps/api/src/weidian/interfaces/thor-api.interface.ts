/**
 * 微店 Thor API 响应接口定义
 * 基于真实 API 响应结构
 */

// ========== getItemSkuInfo 响应 ==========

export interface ThorSkuInfoResponse {
  status: {
    code: number; // 0 表示成功
    message: string;
    description: string;
  };
  result: {
    itemTitle?: string; // 商品标题（可能为空，标题由 AI 生成）
    itemMainPic?: string; // 主图 URL
    itemImgs?: string[]; // 商品图片列表
    attrList: ThorAttribute[]; // SKU 属性列表
    skuInfos: ThorSkuInfo[]; // SKU 详情列表
    seller?: ThorSeller; // 店铺信息
  };
}

export interface ThorAttribute {
  attrTitle: string; // 属性名称，如 "颜色"、"尺码"
  attrValues: ThorAttributeValue[];
}

export interface ThorAttributeValue {
  attrId: number; // 属性值 ID
  attrValue: string; // 属性值，如 "黑色"、"M"
  img?: string; // 属性值图片（如颜色图）
  isShowHotTag?: boolean; // 是否显示热门标签
}

export interface ThorSkuInfo {
  attrIds: number[]; // 关联的属性 ID 数组
  skuInfo: {
    id: string; // SKU ID
    discountPrice: number; // 价格（单位：分）
    stock: number; // 库存
    img?: string; // SKU 图片
  };
}

export interface ThorSeller {
  shopId?: string; // 店铺 ID
  shop_id?: string; // 店铺 ID（备用字段名）
  shopName?: string; // 店铺名称
  shop_name?: string; // 店铺名称（备用字段名）
}

// ========== getDetailDesc 响应 ==========

export interface ThorDetailDescResponse {
  status: {
    code: number;
    message: string;
    description: string;
  };
  result: {
    item_detail: {
      block_success: boolean;
      desc_content: ThorDescContent[];
    };
  };
}

export interface ThorDescContent {
  type: number; // 内容类型：2 = 图片，1 = 文本
  url?: string; // 图片 URL（type=2 时）
  text?: string; // 文本内容（type=1 时）
}

// ========== 归一化后的数据结构 ==========

export interface WeidianNormalizedData {
  // 基础信息
  itemId: string;
  title?: string; // 原始标题（可能为空，最终标题由 AI 根据图片生成）
  mainImage?: string;
  images: string[];
  detailImages: string[];

  // SKU 属性
  attributes: {
    name: string; // 属性名，如 "颜色"、"尺码"
    values: {
      id: number;
      value: string;
      image?: string;
    }[];
  }[];

  // SKU 列表
  skus: {
    skuId?: string;
    weidianSkuId?: string;
    attrIds: number[]; // 微店属性 ID 数组
    attributes: Record<string, string>; // { "颜色": "黑色", "尺码": "M" }
    skuKey: string; // 唯一标识：颜色=黑色;尺码=M
    price?: number; // 价格（单位：元）
    stock?: number;
    image?: string;
  }[];

  // 价格范围
  priceMin?: number;
  priceMax?: number;

  // 店铺信息
  shopId?: string;
  shopName?: string;

  // 原始数据（用于缓存）
  rawSkuInfo?: ThorSkuInfoResponse;
  rawDetailDesc?: ThorDetailDescResponse;
}

// ========== 爬取选项 ==========

export interface WeidianScrapeOptions {
  itemId: string;
  wdtoken?: string; // 微店 token（可选）
  forceRefresh?: boolean; // 是否强制刷新缓存
  timeout?: number; // 请求超时时间（毫秒）
}
