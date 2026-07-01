import { AdminAnalyticsController } from './admin-analytics.controller';
import { AnalyticsAlertsService } from './analytics-alerts.service';

describe('AdminAnalyticsController', () => {
  let controller: AdminAnalyticsController;
  let referralService: {
    getReferralOverview: jest.Mock;
    getClicksByDate: jest.Mock;
    getTopReferrers: jest.Mock;
    getReferralFunnelOverview: jest.Mock;
    getReferralExperimentMetrics: jest.Mock;
  };
  let outboundTrackingService: {
    getClickOverview: jest.Mock;
    getFullAnalytics: jest.Mock;
  };
  let analyticsAlertsService: {
    getAlerts: jest.Mock;
  };

  beforeEach(() => {
    referralService = {
      getReferralOverview: jest.fn(),
      getClicksByDate: jest.fn(),
      getTopReferrers: jest.fn(),
      getReferralFunnelOverview: jest.fn(),
      getReferralExperimentMetrics: jest.fn(),
    };
    outboundTrackingService = {
      getClickOverview: jest.fn(),
      getFullAnalytics: jest.fn().mockResolvedValue({ ok: true }),
    };
    analyticsAlertsService = {
      getAlerts: jest.fn().mockResolvedValue({
        generatedAt: '2026-03-30T00:00:00.000Z',
        summary: { total: 0, high: 0, medium: 0, referral: 0, product: 0 },
        alerts: [],
      }),
    };

    controller = new AdminAnalyticsController(
      referralService as any,
      outboundTrackingService as any,
      analyticsAlertsService as unknown as AnalyticsAlertsService,
    );
  });

  describe('getOverview', () => {
    it('should read click overview from outboundTrackingService', async () => {
      outboundTrackingService.getClickOverview.mockResolvedValue({
        total: 88,
        todayCount: 9,
      });
      referralService.getReferralOverview.mockResolvedValue({
        totalCodes: 5,
        totalClicks: 12,
        totalConversions: 3,
      });

      const result = await controller.getOverview();

      expect(outboundTrackingService.getClickOverview).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );
      expect(result).toEqual({
        clicks: { total: 88, todayCount: 9 },
        referrals: {
          totalCodes: 5,
          totalClicks: 12,
          totalConversions: 3,
        },
      });
    });
  });

  describe('getClickStats', () => {
    it('defaults click stats to today when no date range is provided', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-20T10:30:00.000Z'));

      try {
        await controller.getClickStats('', '', '', '', '', '', '');

        const [start, end] =
          outboundTrackingService.getFullAnalytics.mock.calls[0];
        expect(start).toBeInstanceOf(Date);
        expect(end).toBeInstanceOf(Date);
        expect(start.toDateString()).toBe(end.toDateString());
        expect(start.getHours()).toBe(0);
        expect(start.getMinutes()).toBe(0);
        expect(start.getSeconds()).toBe(0);
        expect(start.getMilliseconds()).toBe(0);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should pass parsed paging and filters to outboundTrackingService', async () => {
      await controller.getClickStats(
        '2026-03-01T00:00:00.000Z',
        '2026-03-08T00:00:00.000Z',
        '3',
        '40',
        'search',
        'kakobuy',
        'nike',
      );

      expect(outboundTrackingService.getFullAnalytics).toHaveBeenCalledWith(
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-08T00:00:00.000Z'),
        {
          page: 3,
          limit: 40,
          source: 'search',
          platform: 'kakobuy',
          productKeyword: 'nike',
          includeInternal: false,
        },
      );
    });

    it('should clamp page and limit to safe bounds', async () => {
      await controller.getClickStats(
        '2026-03-01T00:00:00.000Z',
        '2026-03-08T00:00:00.000Z',
        '-5',
        '9999',
        '',
        '',
        '',
      );

      expect(outboundTrackingService.getFullAnalytics).toHaveBeenCalledWith(
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-08T00:00:00.000Z'),
        {
          page: 1,
          limit: 200,
          source: undefined,
          platform: undefined,
          productKeyword: undefined,
          includeInternal: false,
        },
      );
    });

    it('passes raw scope through to outbound analytics', async () => {
      await controller.getClickStats(
        '2026-03-01T00:00:00.000Z',
        '2026-03-08T00:00:00.000Z',
        '',
        '',
        '',
        '',
        '',
        'raw',
      );

      expect(outboundTrackingService.getFullAnalytics).toHaveBeenCalledWith(
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-08T00:00:00.000Z'),
        expect.objectContaining({ includeInternal: true }),
      );
    });
  });

  describe('getReferralStats', () => {
    it('should return top referrers with funnel and experiment metrics', async () => {
      referralService.getClicksByDate.mockResolvedValue([
        { date: '2026-03-20', count: 8 },
      ]);
      referralService.getTopReferrers.mockResolvedValue([
        { code: 'ABC123', ownerId: 'u1', clicks: 12, conversions: 3 },
      ]);
      referralService.getReferralFunnelOverview.mockResolvedValue({
        steps: {
          clicks: 12,
          registrations: 5,
          activatedConversions: 3,
          emailVerified: 4,
          productViewsReady: 3,
          actionReady: 2,
          validConversions: 2,
        },
        blockers: {
          emailVerification: 1,
          productViews: 1,
          favoriteOrPurchase: 0,
          riskReview: 0,
        },
        layers: {
          registration: {
            eligible: 12,
            converted: 5,
            conversionRate: 5 / 12,
            blockers: {
              notRegistered: 7,
            },
          },
          activation: {
            eligible: 5,
            converted: 3,
            conversionRate: 0.6,
            blockers: {
              emailVerification: 1,
              productViews: 1,
            },
          },
          rewardSettlement: {
            eligible: 3,
            converted: 2,
            conversionRate: 2 / 3,
            blockers: {
              favoriteOrPurchase: 0,
              riskReview: 0,
            },
          },
        },
      });
      referralService.getReferralExperimentMetrics.mockResolvedValue({
        experimentKey: 'referral_rewards_v1',
        metrics: [],
      });

      const result = await controller.getReferralStats(
        '2026-03-01T00:00:00.000Z',
        '2026-03-31T00:00:00.000Z',
      );

      expect(referralService.getTopReferrers).toHaveBeenCalledWith(
        10,
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-31T00:00:00.000Z'),
      );

      expect(result).toEqual({
        byDate: [{ date: '2026-03-20', count: 8 }],
        topReferrers: [
          { code: 'ABC123', ownerId: 'u1', clicks: 12, conversions: 3 },
        ],
        funnel: {
          steps: {
            clicks: 12,
            registrations: 5,
            activatedConversions: 3,
            emailVerified: 4,
            productViewsReady: 3,
            actionReady: 2,
            validConversions: 2,
          },
          blockers: {
            emailVerification: 1,
            productViews: 1,
            favoriteOrPurchase: 0,
            riskReview: 0,
          },
          layers: {
            registration: {
              eligible: 12,
              converted: 5,
              conversionRate: 5 / 12,
              blockers: {
                notRegistered: 7,
              },
            },
            activation: {
              eligible: 5,
              converted: 3,
              conversionRate: 0.6,
              blockers: {
                emailVerification: 1,
                productViews: 1,
              },
            },
            rewardSettlement: {
              eligible: 3,
              converted: 2,
              conversionRate: 2 / 3,
              blockers: {
                favoriteOrPurchase: 0,
                riskReview: 0,
              },
            },
          },
        },
        experiment: {
          experimentKey: 'referral_rewards_v1',
          metrics: [],
        },
      });
    });
  });

  describe('getAlerts', () => {
    it('returns analytics alert snapshot', async () => {
      analyticsAlertsService.getAlerts.mockResolvedValue({
        generatedAt: '2026-03-30T00:00:00.000Z',
        summary: { total: 2, high: 1, medium: 1, referral: 1, product: 1 },
        alerts: [{ id: 'referral:ABC123' }],
      });

      const result = await controller.getAlerts();

      expect(analyticsAlertsService.getAlerts).toHaveBeenCalled();
      expect(result).toEqual({
        generatedAt: '2026-03-30T00:00:00.000Z',
        summary: { total: 2, high: 1, medium: 1, referral: 1, product: 1 },
        alerts: [{ id: 'referral:ABC123' }],
      });
    });

    it('passes parsed date range to analyticsAlertsService when provided', async () => {
      await controller.getAlerts(
        '2026-03-01T00:00:00.000Z',
        '2026-03-31T23:59:59.999Z',
      );

      expect(analyticsAlertsService.getAlerts).toHaveBeenCalledWith(
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-31T23:59:59.999Z'),
      );
    });
  });
});
