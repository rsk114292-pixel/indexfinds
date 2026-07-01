import { Test, TestingModule } from '@nestjs/testing';
import { SearchSchedulerService } from './search-scheduler.service';
import { SearchAnalyticsService } from './search-analytics.service';

describe('SearchSchedulerService', () => {
  let service: SearchSchedulerService;
  let analyticsService: jest.Mocked<Partial<SearchAnalyticsService>>;

  beforeEach(async () => {
    analyticsService = {
      resetDaily: jest.fn().mockResolvedValue(undefined),
      resetWeekly: jest.fn().mockResolvedValue(undefined),
      cleanupOldLogs: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchSchedulerService,
        {
          provide: SearchAnalyticsService,
          useValue: analyticsService,
        },
      ],
    }).compile();

    service = module.get<SearchSchedulerService>(SearchSchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleDailyReset', () => {
    it('should call analyticsService.resetDaily()', async () => {
      await service.handleDailyReset();
      expect(analyticsService.resetDaily).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleWeeklyReset', () => {
    it('should call analyticsService.resetWeekly()', async () => {
      await service.handleWeeklyReset();
      expect(analyticsService.resetWeekly).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleLogCleanup', () => {
    it('should call analyticsService.cleanupOldLogs()', async () => {
      await service.handleLogCleanup();
      expect(analyticsService.cleanupOldLogs).toHaveBeenCalledTimes(1);
    });
  });
});
