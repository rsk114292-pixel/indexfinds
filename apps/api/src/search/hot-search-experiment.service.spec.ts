import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HotSearchExperimentService } from './hot-search-experiment.service';
import {
  HotSearchExperiment,
  ExperimentStatus,
  ExperimentVariant,
} from './entities/hot-search-experiment.entity';
import { HotSearchExperimentEvent } from './entities/hot-search-experiment-event.entity';
import { AnalyticsDedupService } from '../shared/services/analytics-dedup.service';

describe('HotSearchExperimentService', () => {
  let service: HotSearchExperimentService;
  const mockAnalyticsDedupService = {
    claim: jest.fn().mockResolvedValue(true),
  };

  const mockVariants: ExperimentVariant[] = [
    { id: 'control', name: '对照组', weight: 50 },
    { id: 'variant_a', name: '实验组A', weight: 50 },
  ];

  const mockExperiment: Partial<HotSearchExperiment> = {
    id: 'exp-1',
    name: '测试实验',
    status: ExperimentStatus.DRAFT,
    variants: mockVariants,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockExperimentRepo = {
    find: jest.fn().mockResolvedValue([mockExperiment]),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) => Promise.resolve({ id: 'exp-1', ...entity })),
  };

  const mockEventQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  const mockEventRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) => Promise.resolve({ id: 'evt-1', ...entity })),
    createQueryBuilder: jest.fn(() => ({ ...mockEventQb })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HotSearchExperimentService,
        {
          provide: getRepositoryToken(HotSearchExperiment),
          useValue: mockExperimentRepo,
        },
        {
          provide: getRepositoryToken(HotSearchExperimentEvent),
          useValue: mockEventRepo,
        },
        {
          provide: AnalyticsDedupService,
          useValue: mockAnalyticsDedupService,
        },
      ],
    }).compile();

    service = module.get<HotSearchExperimentService>(
      HotSearchExperimentService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an experiment in draft status', async () => {
      mockExperimentRepo.create.mockReturnValue({
        name: '新实验',
        variants: mockVariants,
      });
      mockExperimentRepo.save.mockResolvedValue({
        id: 'new-exp',
        name: '新实验',
        status: ExperimentStatus.DRAFT,
        variants: mockVariants,
      });

      const result = await service.create({
        name: '新实验',
        variants: mockVariants,
      });

      expect(result.name).toBe('新实验');
      expect(mockExperimentRepo.create).toHaveBeenCalled();
    });

    it('should reject less than 2 variants', async () => {
      await expect(
        service.create({
          name: '无效实验',
          variants: [{ id: 'only', name: '只有一个', weight: 100 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate variant IDs', async () => {
      await expect(
        service.create({
          name: '重复ID',
          variants: [
            { id: 'same', name: 'A', weight: 50 },
            { id: 'same', name: 'B', weight: 50 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('start', () => {
    it('should start a draft experiment', async () => {
      mockExperimentRepo.findOne.mockResolvedValue({
        ...mockExperiment,
        status: ExperimentStatus.DRAFT,
      });
      mockExperimentRepo.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.start('exp-1');
      expect(result.status).toBe(ExperimentStatus.RUNNING);
    });

    it('should reject starting a completed experiment', async () => {
      mockExperimentRepo.findOne.mockResolvedValue({
        ...mockExperiment,
        status: ExperimentStatus.COMPLETED,
      });

      await expect(service.start('exp-1')).rejects.toThrow(BadRequestException);
    });

    it('should reject starting with less than 2 variants', async () => {
      mockExperimentRepo.findOne.mockResolvedValue({
        ...mockExperiment,
        status: ExperimentStatus.DRAFT,
        variants: [{ id: 'only', name: '只有一个', weight: 100 }],
      });

      await expect(service.start('exp-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('pause', () => {
    it('should pause a running experiment', async () => {
      mockExperimentRepo.findOne.mockResolvedValue({
        ...mockExperiment,
        status: ExperimentStatus.RUNNING,
      });
      mockExperimentRepo.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.pause('exp-1');
      expect(result.status).toBe(ExperimentStatus.PAUSED);
    });

    it('should reject pausing a draft experiment', async () => {
      mockExperimentRepo.findOne.mockResolvedValue({
        ...mockExperiment,
        status: ExperimentStatus.DRAFT,
      });

      await expect(service.pause('exp-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('complete', () => {
    it('should complete a running experiment', async () => {
      mockExperimentRepo.findOne.mockResolvedValue({
        ...mockExperiment,
        status: ExperimentStatus.RUNNING,
      });
      mockExperimentRepo.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.complete('exp-1');
      expect(result.status).toBe(ExperimentStatus.COMPLETED);
    });
  });

  describe('assignVariant', () => {
    it('should deterministically assign the same variant for the same sessionId', () => {
      const experiment = {
        ...mockExperiment,
        status: ExperimentStatus.RUNNING,
        variants: mockVariants,
      } as HotSearchExperiment;

      const v1 = service.assignVariant(experiment, 'sess_abc123');
      const v2 = service.assignVariant(experiment, 'sess_abc123');

      expect(v1).toBeDefined();
      expect(v1!.id).toBe(v2!.id);
    });

    it('should distribute across variants for different sessionIds', () => {
      const experiment = {
        ...mockExperiment,
        status: ExperimentStatus.RUNNING,
        variants: mockVariants,
      } as HotSearchExperiment;

      const assignments = new Set<string>();
      // Test with many sessions to verify distribution
      for (let i = 0; i < 100; i++) {
        const variant = service.assignVariant(
          experiment,
          `sess_${i}_${Math.random()}`,
        );
        if (variant) assignments.add(variant.id);
      }

      // With 50/50 weight, both variants should appear
      expect(assignments.size).toBe(2);
    });

    it('should return null for non-running experiment', () => {
      const experiment = {
        ...mockExperiment,
        status: ExperimentStatus.DRAFT,
        variants: mockVariants,
      } as HotSearchExperiment;

      const result = service.assignVariant(experiment, 'sess_123');
      expect(result).toBeNull();
    });
  });

  describe('trackEvent', () => {
    it('should save an experiment event', async () => {
      mockEventRepo.create.mockReturnValue({
        experimentId: 'exp-1',
        variantId: 'control',
        eventType: 'impression',
      });

      await service.trackEvent({
        experimentId: 'exp-1',
        variantId: 'control',
        eventType: 'impression' as any,
        context: {
          trustedVisitorId: 'vid_123',
          ipAddress: '203.0.113.1',
          userAgent: 'Mozilla/5.0',
        },
      });

      expect(mockAnalyticsDedupService.claim).toHaveBeenCalled();
      expect(mockEventRepo.create).toHaveBeenCalled();
      expect(mockEventRepo.save).toHaveBeenCalled();
    });
  });

  describe('getResults', () => {
    it('should aggregate results by variant', async () => {
      mockExperimentRepo.findOne.mockResolvedValue({
        ...mockExperiment,
        status: ExperimentStatus.RUNNING,
        variants: mockVariants,
      });

      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { variantId: 'control', eventType: 'impression', count: '1000' },
          { variantId: 'control', eventType: 'click', count: '100' },
          { variantId: 'variant_a', eventType: 'impression', count: '1000' },
          { variantId: 'variant_a', eventType: 'click', count: '150' },
        ]),
      };
      mockEventRepo.createQueryBuilder.mockReturnValue(qb);

      const { results } = await service.getResults('exp-1');

      expect(results).toHaveLength(2);

      const control = results.find((r) => r.variantId === 'control');
      expect(control).toBeDefined();
      expect(control!.impressions).toBe(1000);
      expect(control!.clicks).toBe(100);
      expect(control!.ctr).toBe(10);

      const variantA = results.find((r) => r.variantId === 'variant_a');
      expect(variantA).toBeDefined();
      expect(variantA!.impressions).toBe(1000);
      expect(variantA!.clicks).toBe(150);
      expect(variantA!.ctr).toBe(15);
    });

    it('should return 0 CTR when no impressions', async () => {
      mockExperimentRepo.findOne.mockResolvedValue({
        ...mockExperiment,
        variants: mockVariants,
      });

      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockEventRepo.createQueryBuilder.mockReturnValue(qb);

      const { results } = await service.getResults('exp-1');
      expect(results.every((r) => r.ctr === 0)).toBe(true);
    });

    it('should throw NotFoundException for missing experiment', async () => {
      mockExperimentRepo.findOne.mockResolvedValue(null);
      await expect(service.getResults('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
