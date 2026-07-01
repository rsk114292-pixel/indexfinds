/**
 * 分类相关类型
 */
import type { Translations } from './common';

export interface Category {
  id: string;
  name: string;
  nameEn?: string;
  slug: string;
  level: number;
  sortOrder?: number;
  isActive?: boolean;
  translations?: Translations | null;
  coverImage?: string | null;
  children?: Category[];
  parent?: Category | null;
  productCount?: number;
  heroImage?: string | null;
}

export interface CategorySimple {
  id: string;
  name: string;
  nameEn?: string;
  slug: string;
  translations?: Translations | null;
}

export interface Breadcrumb {
  name: string;
  nameEn?: string;
  slug: string;
  translations?: Translations | null;
}
