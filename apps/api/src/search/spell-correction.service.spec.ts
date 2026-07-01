import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import {
  SpellCorrectionService,
  SpellCorrectionResult,
} from './spell-correction.service';

describe('SpellCorrectionService', () => {
  let service: SpellCorrectionService;
  let mockDataSource: { query: jest.Mock };

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpellCorrectionService,
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<SpellCorrectionService>(SpellCorrectionService);
  });

  describe('correctWord', () => {
    it('should return null for empty input', async () => {
      expect(await service.correctWord('')).toBeNull();
    });

    it('should return null for words shorter than MIN_WORD_LENGTH (3)', async () => {
      expect(await service.correctWord('ab')).toBeNull();
      expect(await service.correctWord('a')).toBeNull();
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('should return correction when a similar word is found', async () => {
      mockDataSource.query.mockResolvedValue([
        { word: 'nike', source: 'brand', score: 0.85 },
      ]);

      const result = await service.correctWord('nkie');

      expect(result).toEqual({
        corrected: 'nike',
        similarity: 0.85,
        source: 'brand',
      });
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('vocabulary'),
        ['nkie', 0.25],
      );
    });

    it('should return null when no similar word is found', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.correctWord('xyzzzz');
      expect(result).toBeNull();
    });

    it('should return null when best match score is below threshold', async () => {
      mockDataSource.query.mockResolvedValue([
        { word: 'something', source: 'product', score: 0.1 },
      ]);

      const result = await service.correctWord('xyzzzz');
      expect(result).toBeNull();
    });

    it('should return null and log warning on database error', async () => {
      mockDataSource.query.mockRejectedValue(new Error('DB connection lost'));

      const result = await service.correctWord('nkie');
      expect(result).toBeNull();
    });

    it('should lowercase the input word before querying', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.correctWord('NKIE');

      expect(mockDataSource.query).toHaveBeenCalledWith(expect.any(String), [
        'nkie',
        0.25,
      ]);
    });
  });

  describe('correctQuery', () => {
    it('should return unchanged result for empty query', async () => {
      const result = await service.correctQuery('');

      expect(result).toEqual<SpellCorrectionResult>({
        original: '',
        corrected: '',
        wasChanged: false,
        corrections: [],
      });
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('should return unchanged result for single-char words only', async () => {
      const result = await service.correctQuery('a b');

      expect(result.wasChanged).toBe(false);
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('should use correctWord for single-word query and apply correction', async () => {
      // correctWord is called internally with single word
      mockDataSource.query.mockResolvedValue([
        { word: 'gucci', source: 'brand', score: 0.75 },
      ]);

      const result = await service.correctQuery('guccci');

      expect(result.wasChanged).toBe(true);
      expect(result.corrected).toBe('gucci');
      expect(result.corrections).toHaveLength(1);
      expect(result.corrections[0]).toEqual({
        original: 'guccci',
        corrected: 'gucci',
        similarity: 0.75,
      });
    });

    it('should return unchanged for single-word query with low similarity (<=0.3)', async () => {
      mockDataSource.query.mockResolvedValue([
        { word: 'something', source: 'product', score: 0.28 },
      ]);

      const result = await service.correctQuery('test');

      expect(result.wasChanged).toBe(false);
      expect(result.corrected).toBe('test');
    });

    it('should return unchanged for single-word query with no correction found', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.correctQuery('nike');

      expect(result.wasChanged).toBe(false);
      expect(result.corrected).toBe('nike');
    });

    it('should use batch query for multi-word queries', async () => {
      mockDataSource.query.mockResolvedValue([
        { original: 'nkie', corrected: 'nike', score: '0.85' },
        { original: 'sheos', corrected: 'shoes', score: '0.80' },
      ]);

      const result = await service.correctQuery('nkie sheos');

      expect(result.wasChanged).toBe(true);
      expect(result.corrected).toBe('nike shoes');
      expect(result.corrections).toHaveLength(2);
      // Verify batch query uses array parameter
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('CROSS JOIN LATERAL'),
        [['nkie', 'sheos'], 0.25],
      );
    });

    it('should preserve uncorrected words in multi-word query', async () => {
      mockDataSource.query.mockResolvedValue([
        { original: 'sheos', corrected: 'shoes', score: '0.80' },
      ]);

      const result = await service.correctQuery('nike sheos');

      expect(result.wasChanged).toBe(true);
      expect(result.corrected).toBe('nike shoes');
      expect(result.corrections).toHaveLength(1);
    });

    it('should return unchanged for multi-word query when no batch corrections found', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.correctQuery('nike shoes');

      expect(result.wasChanged).toBe(false);
    });

    it('should return unchanged on batch query DB error', async () => {
      mockDataSource.query.mockRejectedValue(new Error('DB timeout'));

      const result = await service.correctQuery('nkie sheos');

      expect(result.wasChanged).toBe(false);
      expect(result.corrected).toBe('nkie sheos');
    });
  });

  describe('getSpellingSuggestions', () => {
    it('should return empty array for empty query', async () => {
      expect(await service.getSpellingSuggestions('')).toEqual([]);
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('should return empty array for single-char query', async () => {
      expect(await service.getSpellingSuggestions('a')).toEqual([]);
    });

    it('should return suggestions sorted by score', async () => {
      mockDataSource.query.mockResolvedValue([
        { suggestion: 'nike', source: 'brand', score: '0.9' },
        { suggestion: 'like', source: 'product', score: '0.5' },
      ]);

      const result = await service.getSpellingSuggestions('nke');

      expect(result).toEqual([
        { suggestion: 'nike', similarity: 0.9, source: 'brand' },
        { suggestion: 'like', similarity: 0.5, source: 'product' },
      ]);
    });

    it('should pass limit parameter to SQL', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.getSpellingSuggestions('test', 3);

      expect(mockDataSource.query).toHaveBeenCalledWith(expect.any(String), [
        'test',
        3,
      ]);
    });

    it('should default limit to 5', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.getSpellingSuggestions('test');

      expect(mockDataSource.query).toHaveBeenCalledWith(expect.any(String), [
        'test',
        5,
      ]);
    });

    it('should return empty array on database error', async () => {
      mockDataSource.query.mockRejectedValue(
        new Error('pg_trgm not available'),
      );

      const result = await service.getSpellingSuggestions('test');
      expect(result).toEqual([]);
    });
  });
});
