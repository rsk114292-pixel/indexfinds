import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  RecordImpressionsDto,
  ImpressionItemDto,
  RecordSearchClickDto,
  MarkConversionDto,
  RecordOutboundClickDto,
} from './search-tracking.dto';

/**
 * Phase 1 安全修复测试：
 * #2 — DTO 数组大小限制 (@ArrayMaxSize)
 * #5 — 字段校验 (@IsUUID, @Min, @Max, @MaxLength)
 */
describe('search-tracking DTOs', () => {
  // ============================================================
  // ImpressionItemDto
  // ============================================================
  describe('ImpressionItemDto', () => {
    it('should pass with valid data', async () => {
      const dto = plainToInstance(ImpressionItemDto, {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        position: 0,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with non-UUID productId', async () => {
      const dto = plainToInstance(ImpressionItemDto, {
        productId: 'not-a-uuid',
        position: 0,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('productId');
    });

    it('should fail with negative position', async () => {
      const dto = plainToInstance(ImpressionItemDto, {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        position: -1,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'position')).toBe(true);
    });
  });

  // ============================================================
  // RecordImpressionsDto — @ArrayMaxSize(500)
  // ============================================================
  describe('RecordImpressionsDto', () => {
    const validImpression = {
      productId: '550e8400-e29b-41d4-a716-446655440000',
      position: 0,
    };

    it('should pass with valid data', async () => {
      const dto = plainToInstance(RecordImpressionsDto, {
        searchLogId: '550e8400-e29b-41d4-a716-446655440000',
        impressions: [validImpression],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with 500 impressions (at limit)', async () => {
      const impressions = Array.from({ length: 500 }, (_, i) => ({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        position: i,
      }));
      const dto = plainToInstance(RecordImpressionsDto, {
        searchLogId: '550e8400-e29b-41d4-a716-446655440000',
        impressions,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with 501 impressions (exceeds limit)', async () => {
      const impressions = Array.from({ length: 501 }, (_, i) => ({
        productId: '550e8400-e29b-41d4-a716-446655440000',
        position: i,
      }));
      const dto = plainToInstance(RecordImpressionsDto, {
        searchLogId: '550e8400-e29b-41d4-a716-446655440000',
        impressions,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'impressions')).toBe(true);
    });

    it('should fail with non-UUID searchLogId', async () => {
      const dto = plainToInstance(RecordImpressionsDto, {
        searchLogId: 'invalid-id',
        impressions: [validImpression],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('searchLogId');
    });

    it('should fail with empty searchLogId', async () => {
      const dto = plainToInstance(RecordImpressionsDto, {
        searchLogId: '',
        impressions: [validImpression],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail with non-array impressions', async () => {
      const dto = plainToInstance(RecordImpressionsDto, {
        searchLogId: '550e8400-e29b-41d4-a716-446655440000',
        impressions: 'not-an-array',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // RecordSearchClickDto
  // ============================================================
  describe('RecordSearchClickDto', () => {
    const validClick = {
      searchLogId: '550e8400-e29b-41d4-a716-446655440000',
      query: 'nike shoes',
      productId: '660e8400-e29b-41d4-a716-446655440000',
      position: 3,
    };

    it('should pass with valid required fields', async () => {
      const dto = plainToInstance(RecordSearchClickDto, validClick);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with all optional fields', async () => {
      const dto = plainToInstance(RecordSearchClickDto, {
        ...validClick,
        page: 1,
        userId: '770e8400-e29b-41d4-a716-446655440000',
        sessionId: 'session-abc-123',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with query exceeding 500 characters', async () => {
      const dto = plainToInstance(RecordSearchClickDto, {
        ...validClick,
        query: 'a'.repeat(501),
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'query')).toBe(true);
    });

    it('should fail with position exceeding 10000', async () => {
      const dto = plainToInstance(RecordSearchClickDto, {
        ...validClick,
        position: 10001,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'position')).toBe(true);
    });

    it('should fail with negative position', async () => {
      const dto = plainToInstance(RecordSearchClickDto, {
        ...validClick,
        position: -1,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail with page less than 1', async () => {
      const dto = plainToInstance(RecordSearchClickDto, {
        ...validClick,
        page: 0,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('should fail with page exceeding 1000', async () => {
      const dto = plainToInstance(RecordSearchClickDto, {
        ...validClick,
        page: 1001,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('should fail with non-UUID productId', async () => {
      const dto = plainToInstance(RecordSearchClickDto, {
        ...validClick,
        productId: 'not-a-uuid',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // MarkConversionDto
  // ============================================================
  describe('MarkConversionDto', () => {
    it('should pass with valid UUID', async () => {
      const dto = plainToInstance(MarkConversionDto, {
        searchClickId: '550e8400-e29b-41d4-a716-446655440000',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with non-UUID', async () => {
      const dto = plainToInstance(MarkConversionDto, {
        searchClickId: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // RecordOutboundClickDto
  // ============================================================
  describe('RecordOutboundClickDto', () => {
    it('should pass with valid required fields', async () => {
      const dto = plainToInstance(RecordOutboundClickDto, {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        platformType: 'weidian',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid optional source enum', async () => {
      const dto = plainToInstance(RecordOutboundClickDto, {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        platformType: 'weidian',
        source: 'search',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid attribution fields', async () => {
      const dto = plainToInstance(RecordOutboundClickDto, {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        platformType: 'weidian',
        pageType: 'product',
        pagePath: '/en/products/example-product',
        query: 'nike tech fleece',
        buttonVariant: 'desktop_buy_button',
        locale: 'en',
        viewportDeviceType: 'desktop',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with non-UUID productId', async () => {
      const dto = plainToInstance(RecordOutboundClickDto, {
        productId: 'not-a-uuid',
        platformType: 'weidian',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
