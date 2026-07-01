import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsAlertsService } from './analytics-alerts.service';
import { ReferralService } from '../referral/referral.service';
import { Product } from '../products/entities/product.entity';
import { ProductInteractionEvent } from '../products/entities/product-interaction-event.entity';

describe('AnalyticsAlertsService', () => {
  let service: AnalyticsAlertsService;
  let cacheManager: { get: jest.Mock; set: jest.Mock };
  let referralService: { getReferralAlerts: jest.Mock };
  let productRepository: object;
  let productInteractionEventRepository: { query: jest.Mock };

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
    };
    referralService = {
      getReferralAlerts: jest.fn().mockResolvedValue([
        {
          type: 'referral',
          severity: 'high',
          code: 'ABC123',
          ownerId: 'user-1',
          title: '推荐码 ABC123 出现异常流量',
          description: '可信点击 20，原始点击 80。',
          metrics: {
            trustedClicks: 20,
            rawClicks: 80,
            landingVisits: 2,
            registrations: 0,
            suspiciousClicks: 5,
            clickToLandingRate: 0.1,
          },
          reasons: ['raw/trusted 差值 75%'],
        },
      ]),
    };
    productRepository = {};
    productInteractionEventRepository = {
      query: jest.fn().mockResolvedValue([
        {
          id: 'product-1',
          title: 'Spike Product',
          slug: 'spike-product',
          popularityScore: '0.81',
          views24h: '120',
          clicks24h: '35',
          viewsPrev7d: '70',
          clicksPrev7d: '14',
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsAlertsService,
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: ReferralService, useValue: referralService },
        { provide: getRepositoryToken(Product), useValue: productRepository },
        {
          provide: getRepositoryToken(ProductInteractionEvent),
          useValue: productInteractionEventRepository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsAlertsService>(AnalyticsAlertsService);
  });

  it('builds and caches a merged alert snapshot', async () => {
    const result = await service.refreshAlerts();

    expect(referralService.getReferralAlerts).toHaveBeenCalled();
    expect(productInteractionEventRepository.query).toHaveBeenCalled();
    expect(result.summary.total).toBe(2);
    expect(result.summary.high).toBe(2);
    expect(result.summary.referral).toBe(1);
    expect(result.summary.product).toBe(1);
    expect(cacheManager.set).toHaveBeenCalled();
    expect(result.alerts[0]).toEqual(
      expect.objectContaining({
        type: 'referral',
        severity: 'high',
      }),
    );
  });

  it('returns cached snapshot when available', async () => {
    cacheManager.get.mockResolvedValue({
      generatedAt: '2026-03-30T00:00:00.000Z',
      summary: { total: 1, high: 1, medium: 0, referral: 1, product: 0 },
      alerts: [{ id: 'cached-alert' }],
    });

    const result = await service.getAlerts();

    expect(referralService.getReferralAlerts).not.toHaveBeenCalled();
    expect(result).toEqual({
      generatedAt: '2026-03-30T00:00:00.000Z',
      summary: { total: 1, high: 1, medium: 0, referral: 1, product: 0 },
      alerts: [{ id: 'cached-alert' }],
    });
  });

  it('uses a range-specific cache key when a date window is provided', async () => {
    const start = new Date('2026-03-01T00:00:00.000Z');
    const end = new Date('2026-03-31T23:59:59.999Z');

    await service.getAlerts(start, end);

    expect(cacheManager.get).toHaveBeenCalledWith(
      `analytics:alerts:v1:${start.toISOString()}:${end.toISOString()}`,
    );
    expect(referralService.getReferralAlerts).toHaveBeenCalledWith(
      start,
      end,
      8,
    );
  });
});
