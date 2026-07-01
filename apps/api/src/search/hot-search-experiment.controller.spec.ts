import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { HotSearchExperimentController } from './hot-search-experiment.controller';
import { HotSearchExperimentService } from './hot-search-experiment.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';

describe('HotSearchExperimentController', () => {
  let controller: HotSearchExperimentController;
  let reflector: Reflector;

  const mockService = {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'exp-1' }),
    create: jest.fn().mockResolvedValue({ id: 'exp-1' }),
    update: jest.fn().mockResolvedValue({ id: 'exp-1' }),
    start: jest.fn().mockResolvedValue({ id: 'exp-1', status: 'running' }),
    pause: jest.fn().mockResolvedValue({ id: 'exp-1', status: 'paused' }),
    complete: jest.fn().mockResolvedValue({ id: 'exp-1', status: 'completed' }),
    getResults: jest.fn().mockResolvedValue({ results: [] }),
    trackEvent: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HotSearchExperimentController],
      providers: [
        { provide: HotSearchExperimentService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<HotSearchExperimentController>(
      HotSearchExperimentController,
    );
    reflector = new Reflector();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============ Guard 元数据验证 ============

  describe('admin endpoints should have AdminGuard', () => {
    const adminMethods = [
      'findAll',
      'findOne',
      'create',
      'update',
      'start',
      'pause',
      'complete',
      'getResults',
    ] as const;

    it.each(adminMethods)('%s should have AdminGuard', (method) => {
      const guards = reflector.get(
        GUARDS_METADATA,
        HotSearchExperimentController.prototype[method],
      );
      expect(guards).toBeDefined();
      expect(guards).toContain(AdminGuard);
    });

    it.each(adminMethods)('%s should NOT be @Public()', (method) => {
      const isPublic = reflector.get(
        IS_PUBLIC_KEY,
        HotSearchExperimentController.prototype[method],
      );
      expect(isPublic).toBeFalsy();
    });
  });

  describe('track endpoint should be public without AdminGuard', () => {
    it('trackEvent should be @Public()', () => {
      const isPublic = reflector.get(
        IS_PUBLIC_KEY,
        HotSearchExperimentController.prototype.trackEvent,
      );
      expect(isPublic).toBe(true);
    });

    it('trackEvent should NOT have AdminGuard', () => {
      const guards = reflector.get(
        GUARDS_METADATA,
        HotSearchExperimentController.prototype.trackEvent,
      );
      const hasAdmin = guards && guards.includes(AdminGuard);
      expect(hasAdmin).toBeFalsy();
    });
  });

  describe('class level should NOT have AdminGuard', () => {
    it('controller class should not have AdminGuard on class level', () => {
      const guards = reflector.get(
        GUARDS_METADATA,
        HotSearchExperimentController,
      );
      const hasAdmin = guards && guards.includes(AdminGuard);
      expect(hasAdmin).toBeFalsy();
    });
  });

  // ============ 基本功能测试 ============

  describe('trackEvent', () => {
    it('should call service.trackEvent and return ok', async () => {
      const dto = {
        experimentId: 'exp-1',
        variantId: 'control',
        eventType: 'impression',
        sessionId: 'sess-1',
      } as any;
      const req = {
        cookies: { mf_vid: 'vid_test' },
        headers: { 'user-agent': 'jest', 'x-forwarded-for': '127.0.0.1' },
        ip: '127.0.0.1',
      } as any;

      const result = await controller.trackEvent(dto, req);

      expect(mockService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          experimentId: 'exp-1',
          variantId: 'control',
          eventType: 'impression',
          keyword: undefined,
          context: {
            trustedVisitorId: 'vid_test',
            visitId: undefined,
            ipAddress: '127.0.0.1',
            userAgent: 'jest',
            userId: undefined,
          },
        }),
      );
      expect(result).toEqual({ ok: true });
    });
  });
});
