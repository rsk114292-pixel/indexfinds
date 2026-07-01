import { Test, TestingModule } from '@nestjs/testing';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { VisualSearchService } from '../search/visual-search.service';
import { BatchJobType } from './entities/batch-job.entity';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

describe('BatchController', () => {
  let controller: BatchController;
  let batchService: Record<string, jest.Mock>;
  let visualSearchService: Record<string, jest.Mock>;

  const mockReq = { user: { id: 'user-1' } } as AuthenticatedRequest;

  beforeEach(async () => {
    batchService = {
      createBatchJob: jest
        .fn()
        .mockResolvedValue({ id: 'job-1', totalItems: 2 }),
    };
    visualSearchService = {
      refreshServiceAvailability: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BatchController],
      providers: [
        { provide: BatchService, useValue: batchService },
        { provide: VisualSearchService, useValue: visualSearchService },
      ],
    }).compile();

    controller = module.get<BatchController>(BatchController);
  });

  describe('createJob', () => {
    it('去重服务可用时不返回 warnings', async () => {
      const result = await controller.createJob(
        { urls: ['https://weidian.com/item/1'], type: BatchJobType.IMPORT },
        mockReq,
      );

      expect(result).toEqual({ jobId: 'job-1', totalItems: 2 });
      expect(result).not.toHaveProperty('warnings');
      expect(visualSearchService.refreshServiceAvailability).toHaveBeenCalled();
    });

    it('去重服务不可用时返回 warnings', async () => {
      visualSearchService.refreshServiceAvailability.mockResolvedValue(false);

      const result = await controller.createJob(
        { urls: ['https://weidian.com/item/1'], type: BatchJobType.IMPORT },
        mockReq,
      );

      expect(result).toEqual({
        jobId: 'job-1',
        totalItems: 2,
        warnings: ['图片去重服务不可用，本批次将跳过视觉重复检测'],
      });
    });

    it('UPDATE 模式跳过去重检查', async () => {
      const result = await controller.createJob(
        { urls: ['https://weidian.com/item/1'], type: BatchJobType.UPDATE },
        mockReq,
      );

      expect(result).toEqual({ jobId: 'job-1', totalItems: 2 });
      expect(
        visualSearchService.refreshServiceAvailability,
      ).not.toHaveBeenCalled();
    });

    it('未指定 type 时默认 IMPORT 并检查去重', async () => {
      const result = await controller.createJob(
        { urls: ['https://weidian.com/item/1'] } as any,
        mockReq,
      );

      expect(batchService.createBatchJob).toHaveBeenCalledWith(
        ['https://weidian.com/item/1'],
        'user-1',
        BatchJobType.IMPORT,
      );
      expect(visualSearchService.refreshServiceAvailability).toHaveBeenCalled();
      expect(result).not.toHaveProperty('warnings');
    });
  });
});
