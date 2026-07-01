import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { QueryProductDto } from './query-product.dto';

describe('QueryProductDto validation', () => {
  const toDto = (data: Record<string, any>) =>
    plainToInstance(QueryProductDto, data);

  // ============================================================
  // 分页限制
  // ============================================================
  describe('page limit (maxPage=250000)', () => {
    it('should pass with page=1', async () => {
      const dto = toDto({ page: 1 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with page=500 (legacy limit)', async () => {
      const dto = toDto({ page: 500 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with page=1565 (real current last-page range)', async () => {
      const dto = toDto({ page: 1565 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with page=250000 (at limit)', async () => {
      const dto = toDto({ page: 250000 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with page=250001 (exceeds limit)', async () => {
      const dto = toDto({ page: 250001 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('should pass with page=10000', async () => {
      const dto = toDto({ page: 10000 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with page=0', async () => {
      const dto = toDto({ page: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });
  });

  // ============================================================
  // 过滤器字段字符校验（防注入）
  // ============================================================
  describe('filter field character validation', () => {
    const filterFields = [
      'categories',
      'brands',
      'colors',
      'styles',
      'genders',
      'occasions',
      'seasons',
      'category',
      'brand',
      'color',
      'style',
      'gender',
    ];

    for (const field of filterFields) {
      it(`should pass ${field} with normal slug values`, async () => {
        const dto = toDto({ [field]: 'nike,adidas-originals' });
        const errors = await validate(dto);
        const fieldErrors = errors.filter((e) => e.property === field);
        expect(fieldErrors).toHaveLength(0);
      });

      it(`should pass ${field} with Unicode characters`, async () => {
        const dto = toDto({ [field]: '耐克,阿迪达斯' });
        const errors = await validate(dto);
        const fieldErrors = errors.filter((e) => e.property === field);
        expect(fieldErrors).toHaveLength(0);
      });

      it(`should reject ${field} with double quotes (injection attempt)`, async () => {
        const dto = toDto({ [field]: 'test" OR status = "draft' });
        const errors = await validate(dto);
        const fieldErrors = errors.filter((e) => e.property === field);
        expect(fieldErrors.length).toBeGreaterThan(0);
      });

      it(`should reject ${field} with backslash`, async () => {
        const dto = toDto({ [field]: 'test\\value' });
        const errors = await validate(dto);
        const fieldErrors = errors.filter((e) => e.property === field);
        expect(fieldErrors.length).toBeGreaterThan(0);
      });

      it(`should reject ${field} with angle brackets (XSS attempt)`, async () => {
        const dto = toDto({ [field]: '<script>alert(1)</script>' });
        const errors = await validate(dto);
        const fieldErrors = errors.filter((e) => e.property === field);
        expect(fieldErrors.length).toBeGreaterThan(0);
      });
    }
  });

  // ============================================================
  // limit 范围
  // ============================================================
  describe('limit range', () => {
    it('should pass with limit=100 (at max)', async () => {
      const dto = toDto({ limit: 100 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with limit=101 (exceeds max)', async () => {
      const dto = toDto({ limit: 101 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'limit')).toBe(true);
    });
  });
});
