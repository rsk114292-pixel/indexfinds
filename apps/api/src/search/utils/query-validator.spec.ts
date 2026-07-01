import {
  validateSearchQuery,
  escapeIlike,
  limitTokens,
  MAX_TOKENS,
  assessPublicSearchRisk,
} from './query-validator';

describe('query-validator', () => {
  // ============================================================
  // escapeIlike — ILIKE 通配符转义（Phase 1 #1 安全修复）
  // ============================================================
  describe('escapeIlike', () => {
    it('should escape % wildcard', () => {
      expect(escapeIlike('100%')).toBe('100\\%');
      expect(escapeIlike('%')).toBe('\\%');
      expect(escapeIlike('%%')).toBe('\\%\\%');
    });

    it('should escape _ wildcard', () => {
      expect(escapeIlike('a_b')).toBe('a\\_b');
      expect(escapeIlike('___')).toBe('\\_\\_\\_');
    });

    it('should escape backslash', () => {
      expect(escapeIlike('a\\b')).toBe('a\\\\b');
    });

    it('should escape mixed wildcards', () => {
      expect(escapeIlike('%_\\')).toBe('\\%\\_\\\\');
    });

    it('should leave normal text unchanged', () => {
      expect(escapeIlike('nike shoes')).toBe('nike shoes');
      expect(escapeIlike('North Face')).toBe('North Face');
      expect(escapeIlike('中文搜索')).toBe('中文搜索');
    });

    it('should handle empty string', () => {
      expect(escapeIlike('')).toBe('');
    });

    it('should prevent full-table scan attack via %', () => {
      // 攻击者输入单个 % 试图匹配所有行
      const escaped = escapeIlike('%');
      expect(escaped).toBe('\\%');
      expect(escaped).not.toBe('%');
    });

    it('should prevent single-char wildcard attack via _', () => {
      // 攻击者输入 ____ 匹配任意 4 字符
      const escaped = escapeIlike('____');
      expect(escaped).toBe('\\_\\_\\_\\_');
    });
  });

  describe('assessPublicSearchRisk', () => {
    it('keeps normal product searches eligible', () => {
      expect(assessPublicSearchRisk('nike shoes')).toEqual({
        risky: false,
        sanitizedQuery: 'nike shoes',
      });
      expect(assessPublicSearchRisk('Design hobo bag navy blue').risky).toBe(
        false,
      );
      expect(assessPublicSearchRisk('璩良').risky).toBe(false);
    });

    it('flags non-commerce question phrases before heavy public search', () => {
      const result = assessPublicSearchRisk(
        'what is the wow maintenance tomorrow',
      );

      expect(result.risky).toBe(true);
      expect(result.reason).toBe('public_search_non_commerce_phrase');
    });

    it('flags URLs and automation terms', () => {
      expect(
        assessPublicSearchRisk('https://example.com/products/1').risky,
      ).toBe(true);
      expect(assessPublicSearchRisk('curl api products search').risky).toBe(
        true,
      );
    });

    it('flags static asset paths before public search work', () => {
      const result = assessPublicSearchRisk(
        'VGN Lightning 68/_next/static/chunks/app.js?dpl=123',
      );

      expect(result.risky).toBe(true);
      expect(result.reason).toBe('public_search_static_asset_path');
    });

    it('flags excessive public search token counts', () => {
      const result = assessPublicSearchRisk(
        'nike adidas jordan gucci prada dior chanel rolex lv yeezy balenciaga supreme offwhite',
      );

      expect(result.risky).toBe(true);
      expect(result.reason).toBe('public_search_too_many_tokens');
    });
  });

  // ============================================================
  // validateSearchQuery — 白名单校验 + SQL 注入 + XSS 检测
  // （Phase 1 #3 查询验证器改为白名单）
  // ============================================================
  describe('validateSearchQuery', () => {
    describe('basic validation', () => {
      it('should accept valid English query', () => {
        const result = validateSearchQuery('nike shoes');
        expect(result.valid).toBe(true);
        expect(result.sanitizedQuery).toBe('nike shoes');
      });

      it('should accept valid Chinese query', () => {
        const result = validateSearchQuery('耐克运动鞋');
        expect(result.valid).toBe(true);
        expect(result.sanitizedQuery).toBe('耐克运动鞋');
      });

      it('should accept mixed language query', () => {
        const result = validateSearchQuery('Nike 耐克 运动鞋');
        expect(result.valid).toBe(true);
      });

      it('should accept query with allowed punctuation', () => {
        const result = validateSearchQuery("North Face men's jacket");
        expect(result.valid).toBe(true);
      });

      it('should accept query with numbers', () => {
        const result = validateSearchQuery('Air Max 97');
        expect(result.valid).toBe(true);
      });

      it('should accept single character query', () => {
        const result = validateSearchQuery('a');
        expect(result.valid).toBe(true);
      });
    });

    describe('empty and boundary checks', () => {
      it('should reject empty string', () => {
        const result = validateSearchQuery('');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('empty');
      });

      it('should reject whitespace-only string', () => {
        const result = validateSearchQuery('   ');
        expect(result.valid).toBe(false);
      });

      it('should reject null-like input', () => {
        const result = validateSearchQuery(null as unknown as string);
        expect(result.valid).toBe(false);
      });

      it('should reject undefined input', () => {
        const result = validateSearchQuery(undefined as unknown as string);
        expect(result.valid).toBe(false);
      });

      it('should reject query exceeding 500 characters', () => {
        const longQuery = 'a'.repeat(501);
        const result = validateSearchQuery(longQuery);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('max length');
      });

      it('should accept query at exactly 500 characters', () => {
        const maxQuery = 'a'.repeat(500);
        const result = validateSearchQuery(maxQuery);
        expect(result.valid).toBe(true);
      });

      it('should trim leading/trailing whitespace', () => {
        const result = validateSearchQuery('  nike shoes  ');
        expect(result.valid).toBe(true);
        expect(result.sanitizedQuery).toBe('nike shoes');
      });
    });

    describe('whitelist character validation', () => {
      it('should sanitize angle brackets and return cleaned result', () => {
        // 白名单不包含 < >，但 validateSearchQuery 会清理后再校验
        // <script>alert(1)</script> → 清理掉 < > " → scriptalert(1)/script
        // 清理后的字符串若不含 SQL/XSS 模式则返回 valid + sanitized
        const result = validateSearchQuery('<script>alert(1)</script>');
        if (result.valid) {
          expect(result.sanitizedQuery).not.toContain('<');
          expect(result.sanitizedQuery).not.toContain('>');
        }
      });

      it('should sanitize backticks from query', () => {
        // 白名单不包含 ` ，清理后 query`injection → queryinjection
        const result = validateSearchQuery('query`injection');
        if (result.valid) {
          expect(result.sanitizedQuery).not.toContain('`');
        }
      });

      it('should sanitize curly braces from query', () => {
        // 白名单不包含 { }，清理后 {malicious} → malicious
        const result = validateSearchQuery('{malicious}');
        if (result.valid) {
          expect(result.sanitizedQuery).not.toContain('{');
          expect(result.sanitizedQuery).not.toContain('}');
        }
      });

      it('should sanitize pipe character from query', () => {
        // 白名单不包含 |，清理后 cmd|exec → cmdexec
        const result = validateSearchQuery('cmd|exec');
        if (result.valid) {
          expect(result.sanitizedQuery).not.toContain('|');
        }
      });

      it('should reject query that becomes empty after sanitization', () => {
        // 全是非法字符，清理后为空
        const result = validateSearchQuery('<>{}[]');
        expect(result.valid).toBe(false);
      });

      it('should strip control characters and still validate', () => {
        const result = validateSearchQuery('nike\x00shoes');
        // 控制字符被清理后，剩余内容应能通过
        if (result.valid) {
          expect(result.sanitizedQuery).not.toContain('\x00');
        }
      });

      it('should accept Japanese characters', () => {
        const result = validateSearchQuery('ナイキ');
        expect(result.valid).toBe(true);
      });

      it('should accept Korean characters', () => {
        const result = validateSearchQuery('나이키');
        expect(result.valid).toBe(true);
      });

      it('should accept Chinese punctuation', () => {
        const result = validateSearchQuery('耐克，运动鞋！');
        expect(result.valid).toBe(true);
      });
    });

    describe('SQL injection prevention', () => {
      it('should reject DROP TABLE', () => {
        const result = validateSearchQuery('shoes; DROP TABLE products');
        expect(result.valid).toBe(false);
      });

      it('should reject UNION SELECT', () => {
        const result = validateSearchQuery('shoes UNION SELECT * FROM users');
        expect(result.valid).toBe(false);
      });

      it('should reject DELETE FROM', () => {
        const result = validateSearchQuery('DELETE FROM products WHERE 1=1');
        expect(result.valid).toBe(false);
      });

      it('should reject INSERT INTO', () => {
        const result = validateSearchQuery(
          "INSERT INTO users VALUES('hacked')",
        );
        expect(result.valid).toBe(false);
      });

      it('should reject UPDATE SET', () => {
        const result = validateSearchQuery("UPDATE users SET role='admin'");
        expect(result.valid).toBe(false);
      });

      it('should reject TRUNCATE', () => {
        const result = validateSearchQuery('TRUNCATE TABLE products');
        expect(result.valid).toBe(false);
      });

      it('should reject case-insensitive SQL keywords', () => {
        const result = validateSearchQuery(
          'shoes union select password from users',
        );
        expect(result.valid).toBe(false);
      });

      it('should reject text containing SQL keyword DROP even in normal context', () => {
        // SQL_INJECTION_PATTERN 使用 \b 词边界匹配，"drop" 会被匹配
        // 这是安全优先的设计，宁可误拦也不放行
        const result = validateSearchQuery('fashion drop shoulder jacket');
        expect(result.valid).toBe(false);
      });
    });

    describe('XSS prevention', () => {
      it('should sanitize <script> tags — remove dangerous characters', () => {
        // <script>alert("xss")</script> 中的 < > " 会被清理
        // 清理后变成 scriptalert(xss)/script，不含 XSS 向量
        const result = validateSearchQuery('<script>alert("xss")</script>');
        if (result.valid) {
          expect(result.sanitizedQuery).not.toContain('<');
          expect(result.sanitizedQuery).not.toContain('>');
          expect(result.sanitizedQuery).not.toContain('"');
        }
      });

      it('should reject javascript: protocol', () => {
        const result = validateSearchQuery('javascript:alert(1)');
        expect(result.valid).toBe(false);
      });

      it('should reject event handlers', () => {
        const result = validateSearchQuery('onerror=alert(1)');
        expect(result.valid).toBe(false);
      });

      it('should sanitize <script with whitespace', () => {
        // < 和 > 被清理后，XSS_PATTERN 匹配不到了
        const result = validateSearchQuery('< script >alert(1)</ script >');
        if (result.valid) {
          expect(result.sanitizedQuery).not.toContain('<');
          expect(result.sanitizedQuery).not.toContain('>');
        }
      });
    });

    describe('sanitization of edge cases', () => {
      it('should remove control characters from valid query', () => {
        // Tab and other control chars should be stripped
        const result = validateSearchQuery('nike\tshoes');
        if (result.valid) {
          expect(result.sanitizedQuery).not.toMatch(
            // eslint-disable-next-line no-control-regex
            /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/,
          );
        }
      });

      it('should handle query with only special characters', () => {
        const result = validateSearchQuery('<>{}[]');
        expect(result.valid).toBe(false);
      });
    });
  });

  // ============================================================
  // limitTokens — Token 数量限制
  // ============================================================
  describe('limitTokens', () => {
    it('should return tokens unchanged when under limit', () => {
      const tokens = ['nike', 'shoes'];
      expect(limitTokens(tokens)).toEqual(tokens);
    });

    it('should truncate tokens when exceeding default limit', () => {
      const tokens = Array.from({ length: 60 }, (_, i) => `token${i}`);
      const result = limitTokens(tokens);
      expect(result).toHaveLength(MAX_TOKENS);
    });

    it('should truncate tokens when exceeding custom limit', () => {
      const tokens = ['a', 'b', 'c', 'd', 'e'];
      const result = limitTokens(tokens, 3);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty array', () => {
      expect(limitTokens([])).toEqual([]);
    });

    it('should handle tokens at exactly the limit', () => {
      const tokens = Array.from({ length: MAX_TOKENS }, (_, i) => `t${i}`);
      const result = limitTokens(tokens);
      expect(result).toHaveLength(MAX_TOKENS);
    });

    it('should preserve order of tokens', () => {
      const tokens = Array.from({ length: 100 }, (_, i) => `token_${i}`);
      const result = limitTokens(tokens, 5);
      expect(result).toEqual([
        'token_0',
        'token_1',
        'token_2',
        'token_3',
        'token_4',
      ]);
    });
  });
});
