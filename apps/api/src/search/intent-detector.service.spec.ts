import { Test, TestingModule } from '@nestjs/testing';
import { IntentDetectorService } from './intent-detector.service';

describe('IntentDetectorService', () => {
  let service: IntentDetectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntentDetectorService],
    }).compile();

    service = module.get<IntentDetectorService>(IntentDetectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectIntent', () => {
    describe('price intent', () => {
      it('should detect budget intent', () => {
        const queries = [
          'cheap nike shoes',
          'affordable dress',
          'budget sneakers',
        ];
        for (const query of queries) {
          const intent = service.detectIntent(query);
          expect(intent.priceIntent).toBe('budget');
        }
      });

      it('should detect luxury intent', () => {
        const queries = ['luxury handbag', 'premium jacket', 'designer shoes'];
        for (const query of queries) {
          const intent = service.detectIntent(query);
          expect(intent.priceIntent).toBe('luxury');
        }
      });
    });

    describe('time intent', () => {
      it('should detect new arrivals intent', () => {
        const queries = [
          'new arrivals dress',
          'latest sneakers',
          'newest collection',
        ];
        for (const query of queries) {
          const intent = service.detectIntent(query);
          expect(intent.timeIntent).toBe('new');
        }
      });

      it('should detect sale intent', () => {
        const queries = ['sale jackets', 'clearance shoes', 'discount bags'];
        for (const query of queries) {
          const intent = service.detectIntent(query);
          expect(intent.timeIntent).toBe('sale');
        }
      });

      it('should detect trending intent', () => {
        const intent = service.detectIntent('trending dresses');
        expect(intent.timeIntent).toBe('trending');
      });
    });

    describe('purpose intent', () => {
      it('should detect gift intent', () => {
        const queries = ['gift for mom', 'birthday present', 'christmas gifts'];
        for (const query of queries) {
          const intent = service.detectIntent(query);
          expect(intent.purposeIntent).toBe('gift');
        }
      });
    });

    describe('combined intents', () => {
      it('should detect multiple intents', () => {
        const intent = service.detectIntent('cheap new shoes gift');
        expect(intent.priceIntent).toBe('budget');
        expect(intent.timeIntent).toBe('new');
        expect(intent.purposeIntent).toBe('gift');
      });
    });

    it('should return empty intent for empty query', () => {
      const intent = service.detectIntent('');
      expect(service.hasIntent(intent)).toBe(false);
    });

    it('should return empty intent for query without intent keywords', () => {
      const intent = service.detectIntent('nike shoes red');
      expect(service.hasIntent(intent)).toBe(false);
    });
  });

  describe('hasIntent', () => {
    it('should return true when price intent exists', () => {
      expect(service.hasIntent({ priceIntent: 'budget' })).toBe(true);
    });

    it('should return true when time intent exists', () => {
      expect(service.hasIntent({ timeIntent: 'new' })).toBe(true);
    });

    it('should return false for empty intent', () => {
      expect(service.hasIntent({})).toBe(false);
    });
  });

  describe('getAllIntentKeywords', () => {
    it('should return all intent keywords', () => {
      const keywords = service.getAllIntentKeywords();
      // Check some price keywords
      expect(keywords.has('cheap')).toBe(true);
      expect(keywords.has('luxury')).toBe(true);
      // Check some time keywords
      expect(keywords.has('new')).toBe(true);
      expect(keywords.has('popular')).toBe(true);
      expect(keywords.has('trending')).toBe(true);
      // Check some purpose keywords
      expect(keywords.has('gift')).toBe(true);
    });
  });
});
