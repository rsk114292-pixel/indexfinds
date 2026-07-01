import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DataSource } from 'typeorm';
import { FullTextSearchService } from './full-text-search.service';
import { SpellCorrectionService } from './spell-correction.service';
import { highlightText } from './utils/search-highlighter.util';

describe('FullTextSearchService', () => {
  let service: FullTextSearchService;

  const mockDataSource = {
    query: jest.fn(),
  };

  const mockSpellCorrectionService = {
    correctQuery: jest.fn(),
    correctWord: jest.fn(),
    getSpellingSuggestions: jest.fn().mockResolvedValue([]),
  };

  const mockCacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FullTextSearchService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: SpellCorrectionService,
          useValue: mockSpellCorrectionService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<FullTextSearchService>(FullTextSearchService);
    jest.clearAllMocks();
  });

  // ============================================================
  // highlightText — tag 参数消毒（Phase 1 #7 安全修复）
  // ============================================================
  describe('highlightText — tag sanitization', () => {
    it('should use default mark tag', () => {
      const result = highlightText('nike shoes', 'nike');
      expect(result).toBe('<mark>nike</mark> shoes');
    });

    it('should allow "em" tag', () => {
      const result = highlightText('nike shoes', 'nike', 'em');
      expect(result).toBe('<em>nike</em> shoes');
    });

    it('should allow "strong" tag', () => {
      const result = highlightText('nike shoes', 'nike', 'strong');
      expect(result).toBe('<strong>nike</strong> shoes');
    });

    it('should allow "b" tag', () => {
      const result = highlightText('nike shoes', 'nike', 'b');
      expect(result).toBe('<b>nike</b> shoes');
    });

    it('should allow "i" tag', () => {
      const result = highlightText('nike shoes', 'nike', 'i');
      expect(result).toBe('<i>nike</i> shoes');
    });

    it('should allow "span" tag', () => {
      const result = highlightText('nike shoes', 'nike', 'span');
      expect(result).toBe('<span>nike</span> shoes');
    });

    it('should reject "script" tag and fallback to "mark"', () => {
      const result = highlightText('nike shoes', 'nike', 'script');
      expect(result).toBe('<mark>nike</mark> shoes');
      expect(result).not.toContain('<script>');
    });

    it('should reject "img" tag and fallback to "mark"', () => {
      const result = highlightText('nike shoes', 'nike', 'img');
      expect(result).toBe('<mark>nike</mark> shoes');
    });

    it('should reject "div" tag and fallback to "mark"', () => {
      const result = highlightText('nike shoes', 'nike', 'div');
      expect(result).toBe('<mark>nike</mark> shoes');
    });

    it('should reject "iframe" tag and fallback to "mark"', () => {
      const result = highlightText('nike shoes', 'nike', 'iframe');
      expect(result).toBe('<mark>nike</mark> shoes');
    });

    it('should reject "object" tag and fallback to "mark"', () => {
      const result = highlightText('nike shoes', 'nike', 'object');
      expect(result).toBe('<mark>nike</mark> shoes');
    });

    it('should reject tag with attributes injection attempt', () => {
      const result = highlightText(
        'nike shoes',
        'nike',
        'mark onload=alert(1)',
      );
      // 非白名单字符串，应降级到 mark
      expect(result).toBe('<mark>nike</mark> shoes');
    });
  });

  // ============================================================
  // highlightText — 基本功能
  // ============================================================
  describe('highlightText — basic functionality', () => {
    it('should highlight multiple words', () => {
      const result = highlightText('nike air max shoes', 'nike max');
      expect(result).toBe('<mark>nike</mark> air <mark>max</mark> shoes');
    });

    it('should be case-insensitive', () => {
      const result = highlightText('Nike SHOES', 'nike shoes');
      expect(result).toBe('<mark>Nike</mark> <mark>SHOES</mark>');
    });

    it('should return original text when query is empty', () => {
      expect(highlightText('nike shoes', '')).toBe('nike shoes');
    });

    it('should return original text when text is empty', () => {
      expect(highlightText('', 'nike')).toBe('');
    });

    it('should return text unchanged when no match', () => {
      const result = highlightText('adidas shoes', 'nike');
      expect(result).toBe('adidas shoes');
    });

    it('should handle null text', () => {
      expect(highlightText(null as unknown as string, 'nike')).toBeNull();
    });

    it('should handle null query', () => {
      expect(highlightText('nike shoes', null as unknown as string)).toBe(
        'nike shoes',
      );
    });

    it('should escape regex special characters in query', () => {
      // 查询包含正则特殊字符不应导致异常
      const result = highlightText('price $100', '$100');
      expect(result).toContain('<mark>$100</mark>');
    });

    it('should handle query with dots and brackets', () => {
      expect(() => {
        highlightText('v2.0 (beta)', 'v2.0');
      }).not.toThrow();
    });
  });

  // ============================================================
  // fuzzySearch — ILIKE 转义验证（Phase 1 #1）
  // ============================================================
  describe('fuzzySearch — ILIKE escaping', () => {
    beforeEach(() => {
      // 模拟 pg_trgm 不可用，强制走降级路径
      (service as any).pgTrgmEnabled = false;
    });

    it('should escape % in query before ILIKE', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.fuzzySearch('100%');

      const call = mockDataSource.query.mock.calls[0];
      // 第一个参数应包含转义后的 %
      expect(call[1][0]).toBe('%100\\%%');
    });

    it('should escape _ in query before ILIKE', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.fuzzySearch('a_b');

      const call = mockDataSource.query.mock.calls[0];
      expect(call[1][0]).toBe('%a\\_b%');
    });

    it('should escape backslash in query before ILIKE', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.fuzzySearch('path\\file');

      const call = mockDataSource.query.mock.calls[0];
      expect(call[1][0]).toBe('%path\\\\file%');
    });

    it('should not modify normal queries', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.fuzzySearch('nike shoes');

      const call = mockDataSource.query.mock.calls[0];
      expect(call[1][0]).toBe('%nike shoes%');
    });

    it('should return empty array for empty query', async () => {
      const result = await service.fuzzySearch('');
      expect(result).toEqual([]);
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('should return empty array for single-char query', async () => {
      const result = await service.fuzzySearch('a');
      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // spellingSuggestions — 委托 SpellCorrectionService
  // ============================================================
  describe('spellingSuggestions — delegation', () => {
    it('should delegate to SpellCorrectionService', async () => {
      mockSpellCorrectionService.getSpellingSuggestions.mockResolvedValue([
        { suggestion: 'nike', score: 0.9 },
      ]);

      const result = await service.spellingSuggestions('nik');

      expect(
        mockSpellCorrectionService.getSpellingSuggestions,
      ).toHaveBeenCalledWith('nik', 5);
      expect(result).toEqual(['nike']);
    });

    it('should return empty array when no suggestions', async () => {
      mockSpellCorrectionService.getSpellingSuggestions.mockResolvedValue([]);

      const result = await service.spellingSuggestions('xyz');

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // searchSuggestions — ILIKE 转义验证
  // ============================================================
  describe('searchSuggestions — ILIKE escaping', () => {
    it('should escape wildcards in prefix', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.searchSuggestions('50%');

      // 应该有两次调用（产品标题 + 品牌名）
      expect(mockDataSource.query).toHaveBeenCalled();
      const firstCall = mockDataSource.query.mock.calls[0];
      // 第一个参数（前缀匹配）应包含转义后的 %
      expect(firstCall[1][0]).toBe('50\\%%');
    });

    it('should return empty for empty prefix', async () => {
      const result = await service.searchSuggestions('');
      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // searchSuggestions — pg_trgm 降级验证
  // ============================================================
  describe('searchSuggestions — pg_trgm fallback', () => {
    it('should use similarity query when pgTrgmEnabled is true', async () => {
      (service as any).pgTrgmEnabled = true;
      mockDataSource.query.mockResolvedValue([
        { title: 'Nike Air', score: '0.9' },
      ]);

      await service.searchSuggestions('nike');

      const firstCall = mockDataSource.query.mock.calls[0];
      // similarity 查询有 4 个参数（prefixEscaped, containsEscaped, prefix, limit）
      expect(firstCall[1]).toHaveLength(4);
      expect(firstCall[0]).toContain('similarity');
    });

    it('should use LIKE-only fallback when pgTrgmEnabled is false', async () => {
      (service as any).pgTrgmEnabled = false;
      mockDataSource.query.mockResolvedValue([]);

      await service.searchSuggestions('nike');

      const firstCall = mockDataSource.query.mock.calls[0];
      // LIKE-only 查询有 3 个参数（prefixEscaped, containsEscaped, limit）
      expect(firstCall[1]).toHaveLength(3);
      expect(firstCall[0]).not.toContain('similarity');
    });

    it('should fall back to LIKE when similarity query throws', async () => {
      (service as any).pgTrgmEnabled = true;
      mockDataSource.query
        .mockRejectedValueOnce(new Error('function similarity does not exist'))
        .mockResolvedValueOnce([{ title: 'Nike Air', score: '0.8' }])
        .mockResolvedValueOnce([]); // brands query

      const result = await service.searchSuggestions('nike');

      // 应有 3 次调用：similarity 失败 → LIKE fallback → brands
      expect(mockDataSource.query).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Nike Air');
    });
  });
});
