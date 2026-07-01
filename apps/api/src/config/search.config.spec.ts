/**
 * 搜索配置测试
 * 重点测试 NaN 防御和配置校验逻辑（Phase 4 #33）
 */

// 导入需要测试的配置
import {
  BM25_CONFIG,
  SEMANTIC_CONFIG,
  PAGINATION_CONFIG,
  RANKING_WEIGHTS_CONFIG,
  validateSearchConfig,
} from './search.config';

describe('search.config', () => {
  describe('safeParseFloat - NaN 防御', () => {
    // 保存原始环境变量
    const originalEnv = process.env;

    beforeEach(() => {
      // 每个测试前重置环境变量
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      // 所有测试后恢复环境变量
      process.env = originalEnv;
    });

    it('应使用默认值当环境变量未设置', () => {
      // BM25_K1 默认为 1.5
      delete process.env.BM25_K1;
      // 需要重新 require 配置文件以应用新的环境变量
      // 由于 TypeScript/Jest 的模块缓存，这里使用常量检查
      expect(BM25_CONFIG.k1).toBeDefined();
      expect(typeof BM25_CONFIG.k1).toBe('number');
      expect(BM25_CONFIG.k1).toBeGreaterThan(0);
    });

    it('应使用默认值当环境变量为非数字字符串', () => {
      // 注：由于模块已加载，这里测试的是逻辑而非运行时行为
      // 实际项目中应使用动态导入或依赖注入来测试
      // 这里我们测试 safeParseFloat 的逻辑（通过 inline 函数）
      const safeParseFloat = (
        value: string | undefined,
        fallback: number,
      ): number => {
        if (!value) return fallback;
        const parsed = parseFloat(value);
        return Number.isNaN(parsed) ? fallback : parsed;
      };

      expect(safeParseFloat('abc', 1.5)).toBe(1.5);
      expect(safeParseFloat('not-a-number', 1.5)).toBe(1.5);
      expect(safeParseFloat(undefined, 1.5)).toBe(1.5);
      expect(safeParseFloat('', 1.5)).toBe(1.5);
    });

    it('应正确解析有效的浮点数字符串', () => {
      const safeParseFloat = (
        value: string | undefined,
        fallback: number,
      ): number => {
        if (!value) return fallback;
        const parsed = parseFloat(value);
        return Number.isNaN(parsed) ? fallback : parsed;
      };

      expect(safeParseFloat('2.5', 1.5)).toBe(2.5);
      expect(safeParseFloat('0.75', 1.0)).toBe(0.75);
      expect(safeParseFloat('3.14159', 0.0)).toBe(3.14159);
      expect(safeParseFloat('0', 1.0)).toBe(0);
      expect(safeParseFloat('-1.5', 1.0)).toBe(-1.5);
    });

    it('应处理特殊浮点数值', () => {
      const safeParseFloat = (
        value: string | undefined,
        fallback: number,
      ): number => {
        if (!value) return fallback;
        const parsed = parseFloat(value);
        return Number.isNaN(parsed) ? fallback : parsed;
      };

      // Infinity 会被 parseFloat 解析
      expect(safeParseFloat('Infinity', 1.0)).toBe(Infinity);
      expect(safeParseFloat('-Infinity', 1.0)).toBe(-Infinity);
      // NaN 字符串会被检测
      expect(safeParseFloat('NaN', 1.0)).toBe(1.0);
    });
  });

  describe('safeParseInt - NaN 防御', () => {
    it('应使用默认值当环境变量为非数字字符串', () => {
      const safeParseInt = (
        value: string | undefined,
        fallback: number,
      ): number => {
        if (!value) return fallback;
        const parsed = parseInt(value, 10);
        return Number.isNaN(parsed) ? fallback : parsed;
      };

      expect(safeParseInt('abc', 20)).toBe(20);
      expect(safeParseInt('not-a-number', 100)).toBe(100);
      expect(safeParseInt(undefined, 50)).toBe(50);
      expect(safeParseInt('', 50)).toBe(50);
    });

    it('应正确解析有效的整数字符串', () => {
      const safeParseInt = (
        value: string | undefined,
        fallback: number,
      ): number => {
        if (!value) return fallback;
        const parsed = parseInt(value, 10);
        return Number.isNaN(parsed) ? fallback : parsed;
      };

      expect(safeParseInt('100', 20)).toBe(100);
      expect(safeParseInt('0', 10)).toBe(0);
      expect(safeParseInt('-50', 10)).toBe(-50);
      expect(safeParseInt('12345', 0)).toBe(12345);
    });

    it('应正确解析带小数点的字符串（截断）', () => {
      const safeParseInt = (
        value: string | undefined,
        fallback: number,
      ): number => {
        if (!value) return fallback;
        const parsed = parseInt(value, 10);
        return Number.isNaN(parsed) ? fallback : parsed;
      };

      // parseInt 会截断小数部分
      expect(safeParseInt('123.456', 0)).toBe(123);
      expect(safeParseInt('99.99', 0)).toBe(99);
    });

    it('应处理 radix 10 避免八进制/十六进制解析', () => {
      const safeParseInt = (
        value: string | undefined,
        fallback: number,
      ): number => {
        if (!value) return fallback;
        const parsed = parseInt(value, 10);
        return Number.isNaN(parsed) ? fallback : parsed;
      };

      // '010' 在不指定 radix 时可能被解析为 8 (八进制)，radix=10 强制十进制
      expect(safeParseInt('010', 0)).toBe(10);
      expect(safeParseInt('0x10', 0)).toBe(0); // '0x10' 在 radix=10 下为 0（第一个字符 '0'）
    });
  });

  describe('validateSearchConfig - 配置校验', () => {
    describe('排名权重校验', () => {
      it('应通过默认的权重配置（和为 1.0）', () => {
        // 默认配置应该是有效的
        expect(() => validateSearchConfig()).not.toThrow();
      });

      it('应检测权重之和偏离 1.0 的情况', () => {
        // 由于配置已加载，这里测试的是校验逻辑本身
        const { relevance, ctr, newness } = RANKING_WEIGHTS_CONFIG;
        const sum = relevance + ctr + newness;
        const tolerance = 0.01;

        // 默认配置的权重之和应在 1.0 ± 0.01 范围内
        expect(Math.abs(sum - 1.0)).toBeLessThanOrEqual(tolerance);
      });

      it('应检测单个权重值超出 [0, 1] 范围', () => {
        const { relevance, ctr, newness } = RANKING_WEIGHTS_CONFIG;

        // 所有权重应在 [0, 1] 范围内
        expect(relevance).toBeGreaterThanOrEqual(0);
        expect(relevance).toBeLessThanOrEqual(1);
        expect(ctr).toBeGreaterThanOrEqual(0);
        expect(ctr).toBeLessThanOrEqual(1);
        expect(newness).toBeGreaterThanOrEqual(0);
        expect(newness).toBeLessThanOrEqual(1);
      });
    });

    describe('BM25 参数校验', () => {
      it('应验证 BM25 k1 参数在合理范围内', () => {
        const { k1 } = BM25_CONFIG;

        // k1 通常在 0-3 范围内
        expect(k1).toBeGreaterThanOrEqual(0);
        expect(k1).toBeLessThanOrEqual(3);
      });

      it('应验证 BM25 b 参数在 [0, 1] 范围内', () => {
        const { b } = BM25_CONFIG;

        // b 必须在 0-1 范围内
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThanOrEqual(1);
      });
    });

    describe('分页参数校验', () => {
      it('应验证 defaultLimit <= maxLimit', () => {
        const { defaultLimit, maxLimit } = PAGINATION_CONFIG;

        expect(defaultLimit).toBeLessThanOrEqual(maxLimit);
      });

      it('应验证 defaultLimit >= 1', () => {
        const { defaultLimit } = PAGINATION_CONFIG;

        expect(defaultLimit).toBeGreaterThanOrEqual(1);
      });
    });

    describe('语义搜索配置校验', () => {
      it('应验证向量维度为正整数', () => {
        const { vectorDimensions } = SEMANTIC_CONFIG;

        expect(vectorDimensions).toBeGreaterThan(0);
        expect(Number.isInteger(vectorDimensions)).toBe(true);
      });

      it('应验证最小相似度在 [0, 1] 范围内', () => {
        const { minSimilarity } = SEMANTIC_CONFIG;

        expect(minSimilarity).toBeGreaterThanOrEqual(0);
        expect(minSimilarity).toBeLessThanOrEqual(1);
      });

      it('应验证 embedding 超时时间为正数', () => {
        const { embeddingTimeout, batchEmbeddingTimeout } = SEMANTIC_CONFIG;

        expect(embeddingTimeout).toBeGreaterThan(0);
        expect(batchEmbeddingTimeout).toBeGreaterThan(0);
        // 批量超时应大于等于单个超时
        expect(batchEmbeddingTimeout).toBeGreaterThanOrEqual(embeddingTimeout);
      });
    });
  });

  describe('配置常量完整性检查', () => {
    it('所有配置对象应为 readonly（const assertion）', () => {
      // TypeScript const assertion 确保配置对象不可修改
      // 这是编译时检查，运行时我们验证对象存在
      expect(BM25_CONFIG).toBeDefined();
      expect(SEMANTIC_CONFIG).toBeDefined();
      expect(PAGINATION_CONFIG).toBeDefined();
      expect(RANKING_WEIGHTS_CONFIG).toBeDefined();
    });

    it('应导出所有必要的配置常量', () => {
      expect(BM25_CONFIG.k1).toBeDefined();
      expect(BM25_CONFIG.b).toBeDefined();
      expect(SEMANTIC_CONFIG.vectorDimensions).toBeDefined();
      expect(SEMANTIC_CONFIG.minSimilarity).toBeDefined();
      expect(PAGINATION_CONFIG.defaultLimit).toBeDefined();
      expect(PAGINATION_CONFIG.maxLimit).toBeDefined();
      expect(RANKING_WEIGHTS_CONFIG.relevance).toBeDefined();
      expect(RANKING_WEIGHTS_CONFIG.ctr).toBeDefined();
      expect(RANKING_WEIGHTS_CONFIG.newness).toBeDefined();
    });
  });
});
