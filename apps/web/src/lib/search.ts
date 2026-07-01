import { API_BASE_URL } from '@/lib/constants';

export interface Category {
  id: string;
  name: string;
  chineseName: string;
  slug: string;
  productCount?: number;
}

export interface Product {
  id: string;
  title: string;
  chineseTitle: string;
  slug: string;
  aiBrandName?: string;
  category?: Category;
  images?: string[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  productCount?: number;
}

export interface SearchSuggestions {
  brands: Brand[];
  products: Product[];
  categories: Category[];
}

/**
 * 获取搜索建议
 * @param query 搜索关键词
 * @returns 搜索建议结果
 */
export async function fetchSearchSuggestions(query: string, signal?: AbortSignal): Promise<SearchSuggestions> {
  const response = await fetch(`${API_BASE_URL}/products/suggest?q=${encodeURIComponent(query)}`, { signal });

  if (!response.ok) {
    throw new Error('Failed to fetch search suggestions');
  }

  return response.json();
}
