/**
 * SKU 相关类型
 */

export interface SKU {
  id: string;
  name: string;
  price: number;
  currency: string;
  stock: number;
  attributes: Record<string, string>; // { "Color": "White", "Size": "42" }
  image?: string; // 后端字段名
  imageUrl?: string; // 前端兼容字段名
  skuKey?: string;
  weidianSkuId?: string;
}

export interface SKUAttribute {
  name: string;
  values: string[];
}
