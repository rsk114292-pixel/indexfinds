import { Repository } from 'typeorm';
import { SearchAnalyticsAdminService } from './search-analytics-admin.service';
import { SearchLog } from './entities/search-log.entity';
import { SearchImpression } from './entities/search-impression.entity';
import { SearchClick } from './entities/search-click.entity';

describe('SearchAnalyticsAdminService', () => {
  let service: SearchAnalyticsAdminService;
  let searchLogRepository: { query: jest.Mock };
  let impressionRepository: { query: jest.Mock };
  let clickRepository: { query: jest.Mock };

  beforeEach(() => {
    searchLogRepository = {
      query: jest.fn(),
    };
    impressionRepository = {
      query: jest.fn(),
    };
    clickRepository = {
      query: jest.fn(),
    };

    service = new SearchAnalyticsAdminService(
      searchLogRepository as unknown as Repository<SearchLog>,
      impressionRepository as unknown as Repository<SearchImpression>,
      clickRepository as unknown as Repository<SearchClick>,
      { analyzeTerm: jest.fn() } as any,
    );
  });

  it('uses actual camelCase columns for impression and click overview queries', async () => {
    searchLogRepository.query.mockResolvedValue([
      { rawSearches: '1', dedupedSearches: '1', zeroResultSearches: '0' },
    ]);
    impressionRepository.query.mockResolvedValue([
      { rawImpressions: '1', dedupedImpressions: '1' },
    ]);
    clickRepository.query.mockResolvedValue([
      {
        rawClicks: '1',
        dedupedClicks: '1',
        rawConversions: '0',
        dedupedConversions: '0',
      },
    ]);

    await service.getSearchAnalytics(
      new Date('2026-03-24'),
      new Date('2026-03-31'),
    );

    expect(impressionRepository.query).toHaveBeenCalledWith(
      expect.stringContaining('sl.id = i."searchLogId"'),
      expect.any(Array),
    );
    expect(impressionRepository.query).toHaveBeenCalledWith(
      expect.stringContaining('i."createdAt" BETWEEN $1 AND $2'),
      expect.any(Array),
    );
    expect(clickRepository.query).toHaveBeenCalledWith(
      expect.stringContaining('CAST(c."userId" AS text)'),
      expect.any(Array),
    );
    expect(clickRepository.query).toHaveBeenCalledWith(
      expect.stringContaining('c."createdAt" BETWEEN $1 AND $2'),
      expect.any(Array),
    );
  });

  it('uses actual camelCase columns for low ctr query joins', async () => {
    impressionRepository.query.mockResolvedValue([]);

    await service.getLowCTRQueriesByRange(
      new Date('2026-03-24'),
      new Date('2026-03-31'),
      10,
      5,
    );

    expect(impressionRepository.query).toHaveBeenCalledWith(
      expect.stringContaining('sl.id = i."searchLogId"'),
      expect.any(Array),
    );
    expect(impressionRepository.query).toHaveBeenCalledWith(
      expect.stringContaining('i."createdAt" BETWEEN $1 AND $2'),
      expect.any(Array),
    );
  });

  it('uses actual camelCase columns for click trend aggregation', async () => {
    searchLogRepository.query.mockResolvedValue([]);
    clickRepository.query.mockResolvedValue([]);

    await service.getSearchTrendsByRange(
      new Date('2026-03-24'),
      new Date('2026-03-31'),
      'day',
    );

    expect(clickRepository.query).toHaveBeenCalledWith(
      expect.stringContaining(
        'TO_CHAR(c."createdAt", \'YYYY-MM-DD\') AS period',
      ),
      expect.any(Array),
    );
    expect(clickRepository.query).toHaveBeenCalledWith(
      expect.stringContaining(
        'GROUP BY TO_CHAR(c."createdAt", \'YYYY-MM-DD\')',
      ),
      expect.any(Array),
    );
  });
});
