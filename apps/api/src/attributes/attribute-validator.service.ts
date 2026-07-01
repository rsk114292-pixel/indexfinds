import { Injectable, Logger } from '@nestjs/common';
import { ATTRIBUTE_VOCABULARY } from '../common/constants/attribute-vocabulary';
import { ColorsService } from '../colors/colors.service';
import { AttributesService } from './attributes.service';

/** Raw AI output shape (from product.aiAttributes JSON) */
export interface RawAiAttributes {
  gender?: string;
  styles?: string[];
  occasions?: string[];
  seasons?: string[];
  colors?: string[];
  [key: string]: any;
}

/** Normalized output shape after validation */
export interface NormalizedAttributes {
  gender: string | null;
  styles: string[];
  occasions: string[];
  seasons: string[];
  colors: string[];
}

@Injectable()
export class AttributeValidatorService {
  private readonly logger = new Logger(AttributeValidatorService.name);

  constructor(
    private readonly colorsService: ColorsService,
    private readonly attributesService: AttributesService,
  ) {}

  /**
   * Normalize a single value for a static dimension.
   * Returns the canonical value or null if unrecognized.
   */
  normalizeValue(
    dimension: 'gender' | 'style' | 'occasion' | 'season',
    rawValue: string,
  ): string | null {
    const vocab = ATTRIBUTE_VOCABULARY[dimension];
    const trimmed = rawValue.trim();

    // 1. Direct match against valid values (case-insensitive)
    const directMatch = vocab.valid.find(
      (v) => v.toLowerCase() === trimmed.toLowerCase(),
    );
    if (directMatch) return directMatch;

    // 2. Synonym mapping (lookup uses lowercase key)
    const synonymKey = trimmed.toLowerCase();
    const synonymMatch = vocab.synonyms[synonymKey];
    if (synonymMatch) return synonymMatch;

    // 3. No match - discard
    this.logger.debug(
      `Discarding unrecognized ${dimension} value: "${rawValue}"`,
    );
    return null;
  }

  /**
   * Normalize an array of values for a multi-select dimension.
   * Deduplicates results.
   */
  normalizeArray(
    dimension: 'style' | 'occasion' | 'season',
    rawValues: string[],
  ): string[] {
    if (!rawValues?.length) return [];
    const results = rawValues
      .map((v) => this.normalizeValue(dimension, v))
      .filter((v): v is string => v !== null);
    return [...new Set(results)];
  }

  /** Normalize a single color value using ColorsService.matchColor() */
  async normalizeColor(rawValue: string): Promise<string | null> {
    const color = await this.colorsService.matchColor(rawValue);
    return color ? color.nameEn : null;
  }

  /** Normalize an array of colors. Deduplicates results. */
  async normalizeColors(rawColors: string[]): Promise<string[]> {
    if (!rawColors?.length) return [];
    const results: string[] = [];
    for (const raw of rawColors) {
      const normalized = await this.normalizeColor(raw);
      if (normalized) results.push(normalized);
    }
    return [...new Set(results)];
  }

  /**
   * Main entry point: validate and resolve raw AI attributes.
   * Returns both the normalized human-readable values and the
   * corresponding attribute_value IDs for the junction table.
   */
  async validateAndResolve(rawAttrs: RawAiAttributes): Promise<{
    normalized: NormalizedAttributes;
    attributeValueIds: string[];
  }> {
    // Normalize each dimension
    const normalized: NormalizedAttributes = {
      gender: rawAttrs.gender
        ? this.normalizeValue('gender', rawAttrs.gender)
        : null,
      styles: this.normalizeArray('style', rawAttrs.styles || []),
      occasions: this.normalizeArray('occasion', rawAttrs.occasions || []),
      seasons: this.normalizeArray('season', rawAttrs.seasons || []).slice(
        0,
        2,
      ),
      colors: await this.normalizeColors(rawAttrs.colors || []),
    };

    // 季节兜底：AI 可能忽略限制返回3-4个，截取前2个
    if ((rawAttrs.seasons?.length ?? 0) > 2) {
      this.logger.debug(
        `Seasons truncated from ${rawAttrs.seasons?.length} to 2: ${normalized.seasons.join(', ')}`,
      );
    }

    // Resolve normalized values to attribute_value IDs
    const attributeValueIds: string[] = [];

    // Gender (single select)
    if (normalized.gender) {
      const slugs = [normalized.gender.toLowerCase()];
      const values = await this.attributesService.findAttributeValuesBySlug(
        'gender',
        slugs,
      );
      attributeValueIds.push(...values.map((v) => v.id));
    }

    // Styles (multi select)
    if (normalized.styles.length) {
      const slugs = normalized.styles.map((s) =>
        s.toLowerCase().replace(/\s+/g, '-'),
      );
      const values = await this.attributesService.findAttributeValuesBySlug(
        'style',
        slugs,
      );
      attributeValueIds.push(...values.map((v) => v.id));
    }

    // Occasions (multi select)
    if (normalized.occasions.length) {
      const slugs = normalized.occasions.map((s) =>
        s.toLowerCase().replace(/\s+/g, '-'),
      );
      const values = await this.attributesService.findAttributeValuesBySlug(
        'occasion',
        slugs,
      );
      attributeValueIds.push(...values.map((v) => v.id));
    }

    // Seasons (multi select)
    if (normalized.seasons.length) {
      const slugs = normalized.seasons.map((s) =>
        s.toLowerCase().replace(/\s+/g, '-'),
      );
      const values = await this.attributesService.findAttributeValuesBySlug(
        'season',
        slugs,
      );
      attributeValueIds.push(...values.map((v) => v.id));
    }

    // Colors (multi select)
    if (normalized.colors.length) {
      const slugs = normalized.colors.map((s) =>
        s.toLowerCase().replace(/\s+/g, '-'),
      );
      const values = await this.attributesService.findAttributeValuesBySlug(
        'color',
        slugs,
      );
      attributeValueIds.push(...values.map((v) => v.id));
    }

    return { normalized, attributeValueIds };
  }
}
