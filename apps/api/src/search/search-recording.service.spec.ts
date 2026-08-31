import { SearchRecordingService } from './search-recording.service';

describe('SearchRecordingService', () => {
  let service: SearchRecordingService;
  let searchLogRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let hotSearchRepository: object;
  let impressionRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let clickRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let dataSource: { query: jest.Mock };
  let analyticsDedupService: { claim: jest.Mock };

  beforeEach(() => {
    searchLogRepository = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    hotSearchRepository = {};
    impressionRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(),
    };
    clickRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    dataSource = {
      query: jest.fn().mockResolvedValue(undefined),
    };
    analyticsDedupService = {
      claim: jest.fn().mockResolvedValue(true),
    };

    service = new SearchRecordingService(
      searchLogRepository as any,
      hotSearchRepository as any,
      impressionRepository as any,
      clickRepository as any,
      dataSource as any,
      analyticsDedupService as any,
    );
  });

  describe('logSearch', () => {
    it('ignores the structured-data search placeholder', async () => {
      const result = await service.logSearch('search_term_string', 0);

      expect(result).toEqual({ searchLogId: '' });
      expect(searchLogRepository.save).not.toHaveBeenCalled();
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('skips writing a trusted search log when dedup is unavailable and no existing log exists', async () => {
      analyticsDedupService.claim.mockResolvedValue(false);
      searchLogRepository.findOne.mockResolvedValue(null);

      const result = await service.logSearch('nike tech', 12, {
        deviceId: 'vid_test',
        sessionId: 'vid_test',
      });

      expect(result).toEqual({ searchLogId: '' });
      expect(searchLogRepository.save).not.toHaveBeenCalled();
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('reuses the existing trusted search log inside the dedup window', async () => {
      analyticsDedupService.claim.mockResolvedValue(false);
      searchLogRepository.findOne.mockResolvedValue({ id: 'search-log-1' });

      const result = await service.logSearch('nike tech', 12, {
        deviceId: 'vid_test',
        sessionId: 'vid_test',
      });

      expect(result).toEqual({ searchLogId: 'search-log-1' });
      expect(searchLogRepository.save).not.toHaveBeenCalled();
    });

    it('backfills visitId onto a reused trusted search log when the new context has one', async () => {
      analyticsDedupService.claim.mockResolvedValue(false);
      searchLogRepository.findOne.mockResolvedValue({
        id: 'search-log-1',
        visitId: null,
      });

      const result = await service.logSearch('nike tech', 12, {
        deviceId: 'vid_test',
        sessionId: 'vid_test',
        visitId: 'visit_test',
      });

      expect(result).toEqual({ searchLogId: 'search-log-1' });
      expect(searchLogRepository.update).toHaveBeenCalledWith('search-log-1', {
        visitId: 'visit_test',
      });
    });
  });
});
