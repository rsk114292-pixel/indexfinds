import {
  correctBrandByTitle,
  BRAND_CORRECTION_RULES,
} from './brand-correction';

describe('correctBrandByTitle', () => {
  // ========== Nike → Air Jordan ==========
  describe('Nike → Air Jordan correction', () => {
    it('should correct "Nike" to "Air Jordan" when title contains "Jordan"', () => {
      expect(
        correctBrandByTitle(
          'Nike',
          'Nike Air Jordan 1 Retro High OG Chicago Sneakers',
        ),
      ).toBe('Air Jordan');
    });

    it('should correct "Nike" to "Air Jordan" when title contains "Jumpman"', () => {
      expect(
        correctBrandByTitle('Nike', 'Nike Jumpman Logo Basketball Shoes'),
      ).toBe('Air Jordan');
    });

    it('should be case-insensitive on title', () => {
      expect(correctBrandByTitle('Nike', 'JORDAN 4 RETRO BRED')).toBe(
        'Air Jordan',
      );
    });

    it('should be case-insensitive on brand', () => {
      expect(correctBrandByTitle('NIKE', 'Air Jordan 1 Low')).toBe(
        'Air Jordan',
      );
    });

    it('should NOT correct "Nike" when title has no Jordan keywords', () => {
      expect(
        correctBrandByTitle('Nike', 'Nike Air Force 1 Low White Sneakers'),
      ).toBe('Nike');
    });

    it('should NOT correct "Nike" for Nike Dunk (not SB)', () => {
      expect(correctBrandByTitle('Nike', 'Nike Dunk Low Panda Sneakers')).toBe(
        'Nike',
      );
    });
  });

  // ========== Nike → Nike SB ==========
  describe('Nike → Nike SB correction', () => {
    it('should correct "Nike" to "Nike SB" when title contains "Nike SB"', () => {
      expect(
        correctBrandByTitle('Nike', 'Nike SB Dunk Low Pro Chicago Sneakers'),
      ).toBe('Nike SB');
    });

    it('should correct "Nike" to "Nike SB" when title contains "SB Dunk"', () => {
      expect(
        correctBrandByTitle('Nike', 'SB Dunk Low Travis Scott Sneakers'),
      ).toBe('Nike SB');
    });

    it('should correct "Nike" to "Nike SB" when title contains "Dunk SB"', () => {
      expect(correctBrandByTitle('Nike', 'Dunk SB Low Premium Sneakers')).toBe(
        'Nike SB',
      );
    });
  });

  // ========== Nike → Nike ACG ==========
  describe('Nike → Nike ACG correction', () => {
    it('should correct "Nike" to "Nike ACG" when title contains "Nike ACG"', () => {
      expect(
        correctBrandByTitle('Nike', 'Nike ACG Mountain Fly Low Trail Shoes'),
      ).toBe('Nike ACG');
    });
  });

  // ========== Adidas → Adidas Yeezy ==========
  describe('Adidas → Adidas Yeezy correction', () => {
    it('should correct "Adidas" to "Adidas Yeezy" when title contains "Yeezy"', () => {
      expect(
        correctBrandByTitle(
          'Adidas',
          'Adidas Yeezy Boost 350 V2 Zebra Sneakers',
        ),
      ).toBe('Adidas Yeezy');
    });

    it('should NOT correct "Adidas" when no Yeezy keyword', () => {
      expect(
        correctBrandByTitle('Adidas', 'Adidas Ultraboost 22 Running Shoes'),
      ).toBe('Adidas');
    });
  });

  // ========== Adidas → Adidas Y-3 ==========
  describe('Adidas → Adidas Y-3 correction', () => {
    it('should correct "Adidas" to "Adidas Y-3" when title contains "Y-3"', () => {
      expect(correctBrandByTitle('Adidas', 'Adidas Y-3 Kaiwa Sneakers')).toBe(
        'Adidas Y-3',
      );
    });
  });

  // ========== Adidas → Adidas Originals ==========
  describe('Adidas → Adidas Originals correction', () => {
    it('should correct "Adidas" to "Adidas Originals" when title contains "Originals"', () => {
      expect(
        correctBrandByTitle(
          'Adidas',
          'Adidas Originals Superstar Classic Sneakers',
        ),
      ).toBe('Adidas Originals');
    });
  });

  // ========== Converse → Converse x CDG ==========
  describe('Converse → Converse x CDG correction', () => {
    it('should correct "Converse" to "Converse x CDG" when title contains "CDG"', () => {
      expect(
        correctBrandByTitle(
          'Converse',
          'Converse x CDG Play Chuck 70 High Sneakers',
        ),
      ).toBe('Converse x CDG');
    });

    it('should correct when title contains "Comme des Garcons"', () => {
      expect(
        correctBrandByTitle(
          'Converse',
          'Converse x Comme des Garcons Play Heart Sneakers',
        ),
      ).toBe('Converse x CDG');
    });
  });

  // ========== Prada → Miu Miu ==========
  describe('Prada → Miu Miu correction', () => {
    it('should correct "Prada" to "Miu Miu" when title contains "Miu Miu"', () => {
      expect(
        correctBrandByTitle(
          'Prada',
          'Miu Miu Crystal Embellished Ballet Flats',
        ),
      ).toBe('Miu Miu');
    });
  });

  // ========== Marc Jacobs → Marc by Marc Jacobs ==========
  describe('Marc Jacobs → Marc by Marc Jacobs correction', () => {
    it('should correct "Marc Jacobs" to "Marc by Marc Jacobs" when title contains "Marc by Marc"', () => {
      expect(
        correctBrandByTitle(
          'Marc Jacobs',
          'Marc by Marc Jacobs Classic Q Hillier Hobo Bag',
        ),
      ).toBe('Marc by Marc Jacobs');
    });

    it('should NOT correct "Marc Jacobs" when no sub-brand keyword', () => {
      expect(
        correctBrandByTitle('Marc Jacobs', 'Marc Jacobs Snapshot Camera Bag'),
      ).toBe('Marc Jacobs');
    });
  });

  // ========== No correction cases ==========
  describe('no correction needed', () => {
    it('should NOT correct if brand is already the sub-brand', () => {
      expect(
        correctBrandByTitle(
          'Air Jordan',
          'Air Jordan 1 Retro High OG Sneakers',
        ),
      ).toBe('Air Jordan');
    });

    it('should NOT correct unrelated brands', () => {
      expect(correctBrandByTitle('Gucci', 'Gucci Ace Leather Sneakers')).toBe(
        'Gucci',
      );
    });

    it('should NOT correct Nike for irrelevant title keyword in different brand context', () => {
      // "Jordan" in title but brand is "Adidas" → no correction
      expect(
        correctBrandByTitle(
          'Adidas',
          'Adidas x Michael Jordan Collaboration Shoes',
        ),
      ).toBe('Adidas');
    });
  });

  // ========== Edge cases ==========
  describe('edge cases', () => {
    it('should return original brand when aiBrand is empty', () => {
      expect(correctBrandByTitle('', 'Some Title')).toBe('');
    });

    it('should return original brand when title is empty', () => {
      expect(correctBrandByTitle('Nike', '')).toBe('Nike');
    });

    it('should return original brand when both are empty', () => {
      expect(correctBrandByTitle('', '')).toBe('');
    });

    it('should handle whitespace in brand name', () => {
      expect(correctBrandByTitle('  Nike  ', 'Air Jordan 1 Low Sneakers')).toBe(
        'Air Jordan',
      );
    });
  });

  // ========== Rule table coverage ==========
  describe('rule table integrity', () => {
    it('should have rules for all expected parent brands', () => {
      const parentBrands = [
        ...new Set(BRAND_CORRECTION_RULES.map((r) => r.parentBrand)),
      ];
      expect(parentBrands).toEqual(
        expect.arrayContaining([
          'nike',
          'adidas',
          'converse',
          'dior',
          'prada',
          'puma',
          'marc jacobs',
          'ralph lauren',
        ]),
      );
    });

    it('all rules should have non-empty titleKeywords', () => {
      for (const rule of BRAND_CORRECTION_RULES) {
        expect(rule.titleKeywords.length).toBeGreaterThan(0);
        for (const kw of rule.titleKeywords) {
          expect(kw.length).toBeGreaterThan(0);
        }
      }
    });

    it('all rules should have non-empty correctBrand', () => {
      for (const rule of BRAND_CORRECTION_RULES) {
        expect(rule.correctBrand.length).toBeGreaterThan(0);
      }
    });
  });
});
