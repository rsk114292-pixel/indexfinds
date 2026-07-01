import type { AnalyzedQuery } from '../../search/keyword-analysis.service';
import type { Product } from '../entities/product.entity';

export interface SearchEnhanceResult {
  products: Product[];
  total: number;
  spellCorrected: boolean;
  correctedQuery?: string;
  semanticEnhanced: boolean;
  usedFallback: boolean;
}

export interface SearchEnhanceOptions {
  effectiveSearch: string;
  analyzedQuery: AnalyzedQuery | null;
  filters: SearchFilters;
  sortBy: string;
  intentSortBy: string;
  intentSortApplied: boolean;
  limit: number;
  skip: number;
}

export interface SearchFilters {
  brands?: string;
  category?: string;
  colors?: string;
  genders?: string;
  seasons?: string;
}

export interface SpellCorrectionResult {
  data: Product[];
  total: number;
  correctedQuery: string;
  wasChanged: boolean;
  intentSortApplied: boolean;
}

export interface MultiPathRecallResult {
  products: Product[];
  total: number;
  usedFallback: boolean;
}
