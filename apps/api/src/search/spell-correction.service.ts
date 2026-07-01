import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * 拼写纠正结果
 */
export interface SpellCorrectionResult {
  /** 原始查询 */
  original: string;
  /** 纠正后的查询 */
  corrected: string;
  /** 是否发生了纠正 */
  wasChanged: boolean;
  /** 详细的纠正记录 */
  corrections: Array<{
    original: string;
    corrected: string;
    similarity: number;
  }>;
}

/**
 * 单词纠正结果
 */
export interface WordCorrectionResult {
  /** 纠正后的单词 */
  corrected: string;
  /** 相似度评分 */
  similarity: number;
  /** 来源类型 */
  source?: string;
}

/**
 * 拼写纠正服务
 *
 * 负责查询和单词的拼写纠正功能
 * 从品牌名、分类名、产品标题中构建词汇表进行相似度匹配
 */
@Injectable()
export class SpellCorrectionService {
  private readonly logger = new Logger(SpellCorrectionService.name);

  /** 最小单词长度（低于此长度的单词不进行纠正） */
  private readonly MIN_WORD_LENGTH = 3;

  /** 相似度阈值（低于此值的建议不被采纳） */
  private readonly SIMILARITY_THRESHOLD = 0.25;

  constructor(private readonly dataSource: DataSource) {}

  /**
   * 纠正单个单词的拼写
   *
   * 从词库（品牌名、分类名、产品标题）中找到最相似的正确单词
   *
   * @param word 待纠正的单词
   * @returns 纠正结果，如果没有找到合适的纠正则返回 null
   */
  async correctWord(word: string): Promise<WordCorrectionResult | null> {
    if (!word || word.length < this.MIN_WORD_LENGTH) {
      return null;
    }

    const wordLower = word.toLowerCase();

    try {
      // 从品牌名、分类名、产品标题中的常用词汇中查找最相似的词
      const result = await this.dataSource.query(
        `
        WITH vocabulary AS (
          -- 品牌名（高优先级，权重 1.2）
          SELECT DISTINCT lower(name) as word, 'brand' as source, 1.2 as boost
          FROM brands WHERE status = 'active'
          UNION ALL
          -- 分类名（中优先级，权重 1.1）
          SELECT DISTINCT lower(name) as word, 'category' as source, 1.1 as boost
          FROM category WHERE "isActive" = true
          UNION ALL
          -- 产品标题中的单词（基础权重 1.0）
          SELECT DISTINCT word, 'product' as source, 1.0 as boost
          FROM (
            SELECT unnest(string_to_array(lower(title), ' ')) as word
            FROM products WHERE status = 'active'
          ) words
          WHERE length(word) BETWEEN 3 AND 20
            AND word ~ '^[a-z]+$'  -- 只保留纯字母单词
        )
        SELECT word, source, similarity(word, $1) * boost as score
        FROM vocabulary
        WHERE word != $1
          AND similarity(word, $1) > $2
        ORDER BY score DESC
        LIMIT 1
        `,
        [wordLower, this.SIMILARITY_THRESHOLD],
      );

      if (result.length > 0 && result[0].score > this.SIMILARITY_THRESHOLD) {
        return {
          corrected: result[0].word,
          similarity: result[0].score,
          source: result[0].source,
        };
      }
    } catch (error) {
      this.logger.warn(`单词纠正失败: ${error.message}`);
    }

    return null;
  }

  /**
   * 纠正整个查询的拼写
   *
   * 批量查询所有词的纠正建议（避免 N+1 查询）
   * 对多词查询使用单次批量 SQL，对单词查询优化为简单查询
   *
   * @param query 待纠正的查询字符串
   * @returns 纠正结果，包含原始查询、纠正后查询及详细的纠正信息
   */
  async correctQuery(query: string): Promise<SpellCorrectionResult> {
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    if (words.length === 0) {
      return {
        original: query,
        corrected: query,
        wasChanged: false,
        corrections: [],
      };
    }

    // 单词查询：使用简单查询
    if (words.length === 1) {
      const correction = await this.correctWord(words[0]);
      if (correction && correction.similarity > 0.3) {
        this.logger.log(
          `拼写纠正: "${words[0]}" → "${correction.corrected}" (相似度: ${correction.similarity.toFixed(2)})`,
        );
        return {
          original: query,
          corrected: correction.corrected,
          wasChanged: true,
          corrections: [
            {
              original: words[0],
              corrected: correction.corrected,
              similarity: correction.similarity,
            },
          ],
        };
      }
      return {
        original: query,
        corrected: query,
        wasChanged: false,
        corrections: [],
      };
    }

    // 多词查询：批量纠正（避免 N+1 查询）
    try {
      const batchResults = await this.dataSource.query(
        `
        WITH input_words AS (
          SELECT unnest($1::text[]) as word
        ),
        vocabulary AS (
          SELECT DISTINCT lower(name) as word, 1.2 as boost FROM brands WHERE status = 'active'
          UNION ALL
          SELECT DISTINCT lower(name) as word, 1.1 as boost FROM category WHERE "isActive" = true
          UNION ALL
          SELECT DISTINCT w.word, 1.0 as boost FROM (
            SELECT unnest(string_to_array(lower(title), ' ')) as word
            FROM products WHERE status = 'active'
          ) w WHERE length(w.word) BETWEEN 3 AND 20 AND w.word ~ '^[a-z]+$'
        )
        SELECT
          iw.word as original,
          v.word as corrected,
          similarity(v.word, iw.word) * v.boost as score
        FROM input_words iw
        CROSS JOIN LATERAL (
          SELECT word, boost
          FROM vocabulary
          WHERE word != iw.word
            AND similarity(word, iw.word) > $2
          ORDER BY similarity(word, iw.word) * boost DESC
          LIMIT 1
        ) v
        WHERE similarity(v.word, iw.word) * v.boost > 0.3
        `,
        [words, this.SIMILARITY_THRESHOLD],
      );

      if (batchResults.length === 0) {
        return {
          original: query,
          corrected: query,
          wasChanged: false,
          corrections: [],
        };
      }

      // 构建纠正映射
      const correctionMap = new Map<
        string,
        { corrected: string; similarity: number }
      >();
      for (const row of batchResults) {
        correctionMap.set(row.original, {
          corrected: row.corrected,
          similarity: parseFloat(row.score),
        });
      }

      // 应用纠正
      const correctedWords = words.map((word) => {
        const correction = correctionMap.get(word);
        return correction ? correction.corrected : word;
      });

      const correctedQuery = correctedWords.join(' ');
      const wasChanged = correctedQuery !== query.toLowerCase();

      if (wasChanged) {
        const correctionList = Array.from(correctionMap.entries()).map(
          ([original, { corrected, similarity }]) => ({
            original,
            corrected,
            similarity,
          }),
        );

        this.logger.log(
          `批量拼写纠正: "${query}" → "${correctedQuery}" (${correctionList.length} 处修改)`,
        );

        return {
          original: query,
          corrected: correctedQuery,
          wasChanged: true,
          corrections: correctionList,
        };
      }

      return {
        original: query,
        corrected: query,
        wasChanged: false,
        corrections: [],
      };
    } catch (error) {
      this.logger.error(`批量拼写纠正失败: ${error.message}`);
      return {
        original: query,
        corrected: query,
        wasChanged: false,
        corrections: [],
      };
    }
  }

  /**
   * 获取拼写建议列表
   *
   * 为给定查询返回多个可能的拼写纠正建议
   *
   * @param query 查询字符串
   * @param limit 返回建议的最大数量
   * @returns 建议列表，按相似度降序排列
   */
  async getSpellingSuggestions(
    query: string,
    limit = 5,
  ): Promise<
    Array<{ suggestion: string; similarity: number; source: string }>
  > {
    if (!query || query.length < 2) {
      return [];
    }

    const queryLower = query.toLowerCase();

    try {
      const results = await this.dataSource.query(
        `
        WITH vocabulary AS (
          SELECT DISTINCT lower(name) as word, 'brand' as source, 1.2 as boost
          FROM brands WHERE status = 'active'
          UNION ALL
          SELECT DISTINCT lower(name) as word, 'category' as source, 1.1 as boost
          FROM category WHERE "isActive" = true
          UNION ALL
          SELECT DISTINCT lower(title) as word, 'product' as source, 1.0 as boost
          FROM products WHERE status = 'active'
        )
        SELECT word as suggestion, source, similarity(word, $1) * boost as score
        FROM vocabulary
        WHERE word != $1
          AND similarity(word, $1) > 0.2
        ORDER BY score DESC
        LIMIT $2
        `,
        [queryLower, limit],
      );

      return results.map((row: any) => ({
        suggestion: row.suggestion,
        similarity: parseFloat(row.score),
        source: row.source,
      }));
    } catch (error) {
      this.logger.warn(`获取拼写建议失败: ${error.message}`);
      return [];
    }
  }
}
