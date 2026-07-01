import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReferralService } from './referral.service';
import { ReferralCode } from './entities/referral-code.entity';
import { ReferralClick } from './entities/referral-click.entity';
import {
  ReferralAttribution,
  AttributionEventType,
  AttributionStatus,
} from './entities/referral-attribution.entity';
import { ReferralExperimentEvent } from './entities/referral-experiment-event.entity';
import { User } from '../users/entities/user.entity';
import { ReferralRiskService } from './referral-risk.service';
import { PointsService } from '../points/points.service';
import { AnalyticsDedupService } from '../shared/services/analytics-dedup.service';
import { ReferralExperimentService } from './referral-experiment.service';
import { ReferralAnalyticsService } from './referral-analytics.service';
import { ReferralCodeService } from './referral-code.service';
import { ReferralAttributionService } from './referral-attribution.service';
import { ReferralConversionService } from './referral-conversion.service';

describe('ReferralService', () => {
  let service: ReferralService;
  let codeRepo: any;
  let clickRepo: any;
  let attrRepo: any;
  let experimentEventRepo: any;
  let userRepo: any;
  let riskService: any;
  let pointsService: any;
  let analyticsDedupService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    codeRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      query: jest.fn(),
      create: jest.fn((data) => ({ id: 'code-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      count: jest.fn(),
      increment: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };

    clickRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => ({ id: 'click-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    attrRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => ({ id: 'attr-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      })),
    };

    experimentEventRepo = {
      create: jest.fn((data) => ({ id: 'evt-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      })),
    };

    userRepo = {
      findOne: jest.fn(),
    };

    riskService = {
      checkClickRisk: jest.fn().mockResolvedValue({
        isValid: true,
        riskScore: 0,
      }),
      checkAttributionRisk: jest.fn().mockResolvedValue({
        isValid: true,
        riskScore: 0,
      }),
      markAttributionStatus: jest.fn().mockResolvedValue(undefined),
    };

    pointsService = {
      addPoints: jest.fn().mockResolvedValue(null),
      calculateReferralReward: jest.fn().mockReturnValue(20),
      checkAndAwardMilestoneBonus: jest.fn().mockResolvedValue(undefined),
      getTotalEarningsByActions: jest.fn().mockResolvedValue(0),
    };

    analyticsDedupService = {
      claim: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        ReferralExperimentService,
        ReferralAnalyticsService,
        ReferralCodeService,
        ReferralAttributionService,
        ReferralConversionService,
        { provide: getRepositoryToken(ReferralCode), useValue: codeRepo },
        { provide: getRepositoryToken(ReferralClick), useValue: clickRepo },
        {
          provide: getRepositoryToken(ReferralAttribution),
          useValue: attrRepo,
        },
        {
          provide: getRepositoryToken(ReferralExperimentEvent),
          useValue: experimentEventRepo,
        },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: ReferralRiskService, useValue: riskService },
        { provide: PointsService, useValue: pointsService },
        {
          provide: AnalyticsDedupService,
          useValue: analyticsDedupService,
        },
      ],
    }).compile();

    service = module.get<ReferralService>(ReferralService);
  });

  describe('experiment delegation', () => {
    it('should return a stable assignment for the same user', () => {
      const first = service.getExperimentAssignment('user-1');
      const second = service.getExperimentAssignment('user-1');

      expect(first).toEqual(second);
      expect(first.experimentKey).toBe('referral_rewards_v1');
      expect(['control', 'rewards_push']).toContain(first.variantId);
    });

    it('should persist experiment events with normalized metadata', async () => {
      await service.trackExperimentEvent('user-1', {
        eventType: 'copy_link',
        placement: 'modal',
        channelId: 'telegram',
      });

      expect(experimentEventRepo.create).toHaveBeenCalledWith({
        experimentKey: 'referral_rewards_v1',
        userId: 'user-1',
        variantId: expect.any(String),
        eventType: 'copy_link',
        metadata: {
          placement: 'modal',
          channelId: 'telegram',
        },
      });
      expect(experimentEventRepo.save).toHaveBeenCalled();
    });
  });

  // ========== getOrCreateUserCode ==========

  describe('getOrCreateUserCode', () => {
    it('should return existing code if user already has one', async () => {
      const existing = {
        id: 'c1',
        code: 'ABC123',
        ownerId: 'user-1',
        isActive: true,
      };
      codeRepo.findOne.mockResolvedValue(existing);

      const result = await service.getOrCreateUserCode('user-1');

      expect(result).toEqual(existing);
      expect(codeRepo.save).not.toHaveBeenCalled();
    });

    it('should reactivate an existing inactive code', async () => {
      const existing = {
        id: 'c1',
        code: 'ABC123',
        ownerId: 'user-1',
        isActive: false,
      };
      codeRepo.findOne.mockResolvedValue(existing);
      codeRepo.save.mockImplementation((entity) => entity);

      const result = await service.getOrCreateUserCode('user-1');

      expect(codeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'c1', isActive: true }),
      );
      expect(result).toEqual(
        expect.objectContaining({ id: 'c1', isActive: true }),
      );
    });

    it('should generate and save a new code if none exists', async () => {
      // First call: user lookup returns null; second: code uniqueness check
      codeRepo.findOne
        .mockResolvedValueOnce(null) // no existing code for user
        .mockResolvedValueOnce(null); // generated code is unique

      const result = await service.getOrCreateUserCode('user-1');

      expect(codeRepo.save).toHaveBeenCalledTimes(1);
      expect(result.ownerId).toBe('user-1');
      expect(result.ownerType).toBe('user');
      expect(result.code).toHaveLength(6);
    });

    it('should retry if generated code already exists', async () => {
      codeRepo.findOne
        .mockResolvedValueOnce(null) // no existing code for user
        .mockResolvedValueOnce({ id: 'dup' }) // first code is duplicate
        .mockResolvedValueOnce(null); // second code is unique

      const result = await service.getOrCreateUserCode('user-1');

      expect(codeRepo.save).toHaveBeenCalledTimes(1);
      expect(result.code).toHaveLength(6);
    });
  });

  // ========== findByCode ==========

  describe('findByCode', () => {
    it('should find active code (case-insensitive)', async () => {
      const code = { id: 'c1', code: 'ABC123', isActive: true };
      codeRepo.findOne.mockResolvedValue(code);

      const result = await service.findByCode('abc123');

      expect(codeRepo.findOne).toHaveBeenCalledWith({
        where: { code: 'ABC123', isActive: true },
      });
      expect(result).toEqual(code);
    });

    it('should return null for non-existent code', async () => {
      codeRepo.findOne.mockResolvedValue(null);

      const result = await service.findByCode('ZZZZZZ');

      expect(result).toBeNull();
    });
  });

  // ========== recordClick ==========

  describe('recordClick', () => {
    it('should record click without maintaining legacy totalClicks counter', async () => {
      const refCode = { id: 'c1', code: 'ABC123' };
      codeRepo.findOne.mockResolvedValue(refCode);

      const result = await service.recordClick({
        code: 'ABC123',
        sessionId: 'sess-1',
        landingPage: '/products',
        ip: '1.2.3.4',
      });

      expect(clickRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referralCodeId: 'c1',
          sessionId: 'sess-1',
          landingPage: '/products',
          ip: '1.2.3.4',
        }),
      );
      expect(clickRepo.save).toHaveBeenCalled();
      expect(codeRepo.increment).not.toHaveBeenCalled();
      expect(analyticsDedupService.claim).toHaveBeenCalledWith({
        scope: 'referral_click',
        windowMs: 30 * 60 * 1000,
        parts: ['sess-1', 'c1', '/products'],
      });
      expect(result).toBeTruthy();
    });

    it('should return null for invalid code', async () => {
      codeRepo.findOne.mockResolvedValue(null);

      const result = await service.recordClick({
        code: 'INVALID',
        sessionId: 'sess-1',
      });

      expect(result).toBeNull();
      expect(clickRepo.save).not.toHaveBeenCalled();
    });

    it('should reject click when risk check fails', async () => {
      const refCode = { id: 'c1', code: 'ABC123' };
      codeRepo.findOne.mockResolvedValue(refCode);
      riskService.checkClickRisk.mockResolvedValue({
        isValid: false,
        reason: 'IP rate limit exceeded',
        riskScore: 50,
      });

      const result = await service.recordClick({
        code: 'ABC123',
        sessionId: 'sess-1',
        ip: '1.2.3.4',
      });

      expect(result).toBeNull();
      expect(clickRepo.save).not.toHaveBeenCalled();
      expect(codeRepo.increment).not.toHaveBeenCalled();
    });

    it('should reuse recent click when dedup window blocks duplicate event', async () => {
      const refCode = { id: 'c1', code: 'ABC123' };
      const recentClick = { id: 'existing-click', referralCodeId: 'c1' };
      codeRepo.findOne.mockResolvedValue(refCode);
      analyticsDedupService.claim.mockResolvedValue(false);
      clickRepo.findOne.mockResolvedValue(recentClick);

      const result = await service.recordClick({
        code: 'ABC123',
        sessionId: 'sess-1',
        landingPage: '/products',
      });

      expect(clickRepo.save).not.toHaveBeenCalled();
      expect(codeRepo.increment).not.toHaveBeenCalled();
      expect(result).toEqual(recentClick);
    });

    it('should pass click data to risk check', async () => {
      const refCode = { id: 'c1', code: 'ABC123' };
      codeRepo.findOne.mockResolvedValue(refCode);

      await service.recordClick({
        code: 'ABC123',
        sessionId: 'sess-1',
        ip: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(riskService.checkClickRisk).toHaveBeenCalledWith({
        ip: '10.0.0.1',
        sessionId: 'sess-1',
        userAgent: 'Mozilla/5.0',
        referralCodeId: 'c1',
        referer: undefined,
      });
    });
  });

  // ========== getUserStats ==========

  describe('getUserStats', () => {
    it('should return stats for user with code', async () => {
      codeRepo.findOne.mockResolvedValue({
        id: 'code-1',
        code: 'ABC123',
        totalClicks: 42,
        totalConversions: 5,
      });
      codeRepo.query.mockResolvedValueOnce([
        {
          referralCodeId: 'code-1',
          rawClicks: 42,
          trustedClicks: 12,
          uniqueSessions: 10,
          uniqueIps: 9,
          suspiciousClicks: 1,
          emptyRefererClicks: 5,
        },
      ]);

      const result = await service.getUserStats('user-1');

      expect(result).toEqual({
        code: 'ABC123',
        clicks: 12,
        trustedClicks: 12,
        rawClicks: 42,
        conversions: 5,
      });
    });

    it('should return zero stats if user has no code', async () => {
      codeRepo.findOne.mockResolvedValue(null);

      const result = await service.getUserStats('user-1');

      expect(result).toEqual({
        code: null,
        clicks: 0,
        trustedClicks: 0,
        rawClicks: 0,
        conversions: 0,
      });
    });
  });

  describe('getReferralFunnelOverview', () => {
    it('should scope progress metrics to the registration referral code', async () => {
      const registrationsQb = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            id: 'reg-1',
            userId: 'user-1',
            referralCodeId: 'code-1',
            status: AttributionStatus.PENDING,
            createdAt: new Date(),
            emailVerified: true,
          },
          {
            id: 'reg-2',
            userId: 'user-1',
            referralCodeId: 'code-2',
            status: AttributionStatus.PENDING,
            createdAt: new Date(),
            emailVerified: true,
          },
        ]),
      };
      const productViewsQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { userId: 'user-1', referralCodeId: 'code-1', count: '3' },
          { userId: 'user-1', referralCodeId: 'code-2', count: '1' },
        ]),
      };
      const actionsQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([
            { userId: 'user-1', referralCodeId: 'code-1', count: '1' },
          ]),
      };
      const trustedClicksQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '9' }),
      };

      attrRepo.createQueryBuilder
        .mockReturnValueOnce(registrationsQb)
        .mockReturnValueOnce(productViewsQb)
        .mockReturnValueOnce(actionsQb);
      clickRepo.createQueryBuilder.mockReturnValueOnce(trustedClicksQb);

      const result = await service.getReferralFunnelOverview(
        new Date('2026-04-01T00:00:00.000Z'),
        new Date('2026-04-03T00:00:00.000Z'),
      );

      expect(result).toEqual({
        steps: {
          clicks: 9,
          registrations: 2,
          activatedConversions: 1,
          emailVerified: 2,
          productViewsReady: 1,
          actionReady: 1,
          validConversions: 0,
        },
        trafficQuality: {
          trustedClicks: 9,
          registrationsInWindow: 2,
          sameWindowRegistrationRate: 2 / 9,
          metricType: 'date_window_snapshot',
        },
        conversionCohort: {
          registrations: 2,
          emailVerified: 2,
          productViewsReady: 1,
          actionReady: 1,
          activatedConversions: 1,
          validConversions: 0,
          activationRate: 0.5,
          settlementRate: 0,
          metricType: 'registration_cohort',
        },
        blockers: {
          emailVerification: 0,
          productViews: 1,
          favoriteOrPurchase: 0,
          riskReview: 1,
        },
        layers: {
          registration: {
            eligible: 9,
            converted: 2,
            conversionRate: 2 / 9,
            blockers: {
              notRegistered: 7,
            },
          },
          activation: {
            eligible: 2,
            converted: 1,
            conversionRate: 0.5,
            blockers: {
              emailVerification: 0,
              productViews: 1,
            },
          },
          rewardSettlement: {
            eligible: 1,
            converted: 0,
            conversionRate: 0,
            blockers: {
              favoriteOrPurchase: 0,
              riskReview: 1,
            },
          },
        },
      });
    });
  });

  // ========== findRecentClick ==========

  describe('findRecentClick', () => {
    it('should return most recent click for session+code', async () => {
      const refCode = { id: 'c1', code: 'ABC123' };
      const click = { id: 'click-1', sessionId: 'sess-1' };
      codeRepo.findOne.mockResolvedValue(refCode);
      clickRepo.findOne.mockResolvedValue(click);

      const result = await service.findRecentClick('sess-1', 'ABC123');

      expect(clickRepo.findOne).toHaveBeenCalledWith({
        where: { sessionId: 'sess-1', referralCodeId: 'c1' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(click);
    });

    it('should return null if code not found', async () => {
      codeRepo.findOne.mockResolvedValue(null);

      const result = await service.findRecentClick('sess-1', 'INVALID');

      expect(result).toBeNull();
    });
  });

  // ========== createAttribution ==========

  describe('createAttribution', () => {
    it('should create a new attribution record as PENDING', async () => {
      clickRepo.findOne.mockResolvedValue({
        id: 'click-1',
        referralCodeId: 'c1',
      });
      attrRepo.findOne.mockResolvedValue(null); // no duplicate

      const result = await service.createAttribution({
        referralClickId: 'click-1',
        eventType: AttributionEventType.REGISTRATION,
        userId: 'user-2',
      });

      expect(attrRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referralCodeId: 'c1',
          referralClickId: 'click-1',
          eventType: AttributionEventType.REGISTRATION,
          userId: 'user-2',
          status: AttributionStatus.PENDING,
        }),
      );
      expect(attrRepo.save).toHaveBeenCalled();
      expect(result).toBeTruthy();
      // Should NOT increment totalConversions immediately
      expect(codeRepo.increment).not.toHaveBeenCalled();
    });

    it('should return existing if duplicate attribution exists', async () => {
      clickRepo.findOne.mockResolvedValue({
        id: 'click-1',
        referralCodeId: 'c1',
      });
      const existing = { id: 'attr-existing' };
      attrRepo.findOne.mockResolvedValue(existing);

      const result = await service.createAttribution({
        referralClickId: 'click-1',
        eventType: AttributionEventType.REGISTRATION,
        userId: 'user-2',
      });

      expect(result).toEqual(existing);
      expect(attrRepo.save).not.toHaveBeenCalled();
    });

    it('should return null if click not found', async () => {
      clickRepo.findOne.mockResolvedValue(null);

      const result = await service.createAttribution({
        referralClickId: 'nonexistent',
        eventType: AttributionEventType.PURCHASE_CLICK,
      });

      expect(result).toBeNull();
    });
  });

  // ========== getReferralOverview ==========

  describe('getReferralOverview', () => {
    it('should aggregate overview stats', async () => {
      codeRepo.count.mockResolvedValue(100);
      clickRepo.count.mockResolvedValue(500);
      clickRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ trustedClicks: '350' }),
      });
      attrRepo.count.mockResolvedValue(25);

      const result = await service.getReferralOverview();

      expect(result).toEqual({
        totalCodes: 100,
        totalClicks: 350,
        rawClicks: 500,
        totalConversions: 25,
      });
      expect(attrRepo.count).toHaveBeenCalledWith({
        where: { status: AttributionStatus.VALID },
      });
    });
  });

  // ========== getTopReferrers ==========

  describe('getTopReferrers', () => {
    it('should return enriched top referrers with trusted clicks and raw reference', async () => {
      codeRepo.query
        .mockResolvedValueOnce([
          {
            id: 'code-1',
            code: 'A1',
            ownerId: 'u1',
            clicks: 80,
            rawClicks: 100,
            conversions: 10,
          },
        ])
        .mockResolvedValueOnce([
          {
            referralCodeId: 'code-1',
            rawClicks: 100,
            trustedClicks: 80,
            uniqueSessions: 80,
            uniqueIps: 70,
            suspiciousClicks: 3,
            emptyRefererClicks: 95,
          },
        ])
        .mockResolvedValueOnce([
          {
            referralCodeId: 'code-1',
            rawLandingVisits: 12,
            landingVisits: 12,
            strictLandingVisits: 10,
            carryoverLandingVisits: 2,
            firstPartyVisits: 11,
            gaCaptures: 4,
            consentAccepted: 5,
            consentRejected: 1,
            consentPending: 5,
            strictMatchedClicks: 10,
          },
        ])
        .mockResolvedValueOnce([
          {
            referralCodeId: 'code-1',
            registrations: 2,
            verifiedRegistrations: 0,
          },
        ]);

      const result = await service.getTopReferrers(5);

      expect(result).toEqual([
        expect.objectContaining({
          code: 'A1',
          ownerId: 'u1',
          clicks: 80,
          rawClicks: 100,
          conversions: 10,
          uniqueSessions: 80,
          uniqueBrowserIds: 80,
          uniqueIps: 70,
          rawLandingVisits: 12,
          landingVisits: 12,
          strictLandingVisits: 10,
          carryoverLandingVisits: 2,
          firstPartyVisits: 11,
          gaCaptures: 4,
          consentAccepted: 5,
          consentRejected: 1,
          consentPending: 5,
          consentDecisionRate: expect.closeTo(6 / 11, 5),
          gaCaptureRate: expect.closeTo(4 / 11, 5),
          registrations: 2,
          verifiedRegistrations: 0,
          suspiciousClicks: 3,
          riskLevel: 'high',
        }),
      ]);
    });

    it('should query date-filtered leaderboard when range is provided', async () => {
      codeRepo.query
        .mockResolvedValueOnce([
          {
            id: 'code-1',
            code: 'A1',
            ownerId: 'u1',
            clicks: 8,
            rawClicks: 11,
            conversions: 2,
          },
        ])
        .mockResolvedValueOnce([
          {
            referralCodeId: 'code-1',
            rawClicks: 11,
            trustedClicks: 8,
            uniqueSessions: 6,
            uniqueIps: 6,
            suspiciousClicks: 0,
            emptyRefererClicks: 8,
          },
        ])
        .mockResolvedValueOnce([
          {
            referralCodeId: 'code-1',
            rawLandingVisits: 5,
            landingVisits: 4,
            strictLandingVisits: 3,
            carryoverLandingVisits: 1,
            firstPartyVisits: 4,
            gaCaptures: 1,
            consentAccepted: 2,
            consentRejected: 1,
            consentPending: 1,
            strictMatchedClicks: 3,
          },
        ])
        .mockResolvedValueOnce([
          {
            referralCodeId: 'code-1',
            registrations: 1,
            verifiedRegistrations: 1,
          },
        ]);

      const start = new Date('2026-03-01T00:00:00.000Z');
      const end = new Date('2026-03-31T00:00:00.000Z');
      const result = await service.getTopReferrers(10, start, end);

      expect(codeRepo.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'ORDER BY conversions DESC, clicks DESC, rc.code ASC',
        ),
        [start, end, 10, AttributionStatus.VALID],
      );
      expect(result).toEqual([
        expect.objectContaining({
          code: 'A1',
          ownerId: 'u1',
          clicks: 8,
          rawClicks: 11,
          conversions: 2,
          uniqueSessions: 6,
          uniqueBrowserIds: 6,
          rawLandingVisits: 5,
          landingVisits: 4,
          strictLandingVisits: 3,
          carryoverLandingVisits: 1,
          firstPartyVisits: 4,
          gaCaptures: 1,
          consentAccepted: 2,
          consentRejected: 1,
          consentPending: 1,
          consentDecisionRate: 0.75,
          gaCaptureRate: 0.25,
          clickToLandingRate: 3 / 8,
          landingToRegistrationRate: 1 / 3,
          registrations: 1,
          verifiedRegistrations: 1,
          riskLevel: 'medium',
        }),
      ]);
    });

    it('uses strict landings for click-to-landing rate and keeps carryover separate', async () => {
      codeRepo.query
        .mockResolvedValueOnce([
          {
            id: 'code-1',
            code: 'A1',
            ownerId: 'u1',
            clicks: 20,
            rawClicks: 20,
            conversions: 0,
          },
        ])
        .mockResolvedValueOnce([
          {
            referralCodeId: 'code-1',
            rawClicks: 20,
            trustedClicks: 20,
            uniqueSessions: 18,
            uniqueIps: 19,
            suspiciousClicks: 0,
            emptyRefererClicks: 0,
          },
        ])
        .mockResolvedValueOnce([
          {
            referralCodeId: 'code-1',
            rawLandingVisits: 14,
            landingVisits: 14,
            strictLandingVisits: 9,
            carryoverLandingVisits: 5,
            firstPartyVisits: 14,
            gaCaptures: 7,
            consentAccepted: 8,
            consentRejected: 2,
            consentPending: 4,
            strictMatchedClicks: 9,
          },
        ])
        .mockResolvedValueOnce([
          {
            referralCodeId: 'code-1',
            registrations: 3,
            verifiedRegistrations: 1,
          },
        ]);

      const [result] = await service.getTopReferrers(10);

      expect(result).toEqual(
        expect.objectContaining({
          landingVisits: 14,
          strictLandingVisits: 9,
          carryoverLandingVisits: 5,
          clickToLandingRate: 0.45,
          landingToRegistrationRate: 3 / 9,
        }),
      );
    });
  });

  // ========== getClicksByDate ==========

  describe('getClicksByDate', () => {
    it('should return grouped click counts by date', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ date: '2026-01-01', count: '12' }]),
      };
      clickRepo.createQueryBuilder.mockReturnValue(mockQb);

      const start = new Date('2026-01-01');
      const end = new Date('2026-01-31');
      const result = await service.getClicksByDate(start, end);

      expect(clickRepo.createQueryBuilder).toHaveBeenCalledWith('rc');
      expect(result).toHaveLength(1);
    });
  });

  // ========== parseAttributionCookie ==========

  describe('parseAttributionCookie', () => {
    it('should parse valid URLSearchParams cookie', () => {
      const exp = Date.now() + 10 * 24 * 60 * 60 * 1000; // 10 days future
      const cookie = `ref_click_id=click-123&referral_code=ABC123&exp=${exp}`;

      const result = service.parseAttributionCookie(cookie);

      expect(result).toEqual({
        code: 'ABC123',
        clickId: 'click-123',
        timestamp: exp,
      });
    });

    it('should return null for expired cookie', () => {
      const expired = Date.now() - 1000; // 1 second ago
      const cookie = `ref_click_id=click-1&referral_code=ABC123&exp=${expired}`;

      const result = service.parseAttributionCookie(cookie);

      expect(result).toBeNull();
    });

    it('should return null for malformed cookie', () => {
      expect(service.parseAttributionCookie('')).toBeNull();
      expect(service.parseAttributionCookie('invalid')).toBeNull();
      expect(service.parseAttributionCookie('ref_click_id=abc')).toBeNull(); // missing required fields
    });
  });

  // ========== triggerAttributionFromCookie ==========

  describe('triggerAttributionFromCookie', () => {
    it('should create attribution from valid cookie', async () => {
      const exp = Date.now() + 10 * 24 * 60 * 60 * 1000;
      const cookie = `ref_click_id=click-1&referral_code=ABC123&exp=${exp}`;
      clickRepo.findOne.mockResolvedValue({
        id: 'click-1',
        referralCodeId: 'c1',
      });
      attrRepo.findOne.mockResolvedValue(null);

      const result = await service.triggerAttributionFromCookie(
        cookie,
        AttributionEventType.REGISTRATION,
        'user-2',
      );

      expect(result).toBeTruthy();
      expect(attrRepo.save).toHaveBeenCalled();
    });

    it('should return null for expired cookie', async () => {
      const expired = Date.now() - 1000;
      const cookie = `ref_click_id=click-1&referral_code=ABC123&exp=${expired}`;

      const result = await service.triggerAttributionFromCookie(
        cookie,
        AttributionEventType.REGISTRATION,
      );

      expect(result).toBeNull();
      expect(attrRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('attachAnonymousAttributionsToUserFromCookie', () => {
    it('should attach anonymous referral events to the registered user', async () => {
      const exp = Date.now() + 10 * 24 * 60 * 60 * 1000;
      const cookie = `ref_click_id=click-1&referral_code=ABC123&exp=${exp}`;
      const mockQbUpdate = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      attrRepo.createQueryBuilder.mockReturnValueOnce(mockQbUpdate);
      attrRepo.count.mockResolvedValueOnce(1);

      const result = await service.attachAnonymousAttributionsToUserFromCookie(
        cookie,
        'user-2',
      );

      expect(mockQbUpdate.set).toHaveBeenCalledWith({ userId: 'user-2' });
      expect(mockQbUpdate.execute).toHaveBeenCalled();
      expect(result).toEqual({
        attachedCount: 3,
        highIntentActionCount: 1,
      });
    });

    it('should return 0 for expired cookies', async () => {
      const expired = Date.now() - 1000;
      const cookie = `ref_click_id=click-1&referral_code=ABC123&exp=${expired}`;

      const result = await service.attachAnonymousAttributionsToUserFromCookie(
        cookie,
        'user-2',
      );

      expect(result).toEqual({
        attachedCount: 0,
        highIntentActionCount: 0,
      });
      expect(attrRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentUserActivationProgress', () => {
    it('should return not_referred when the user has no referral registration', async () => {
      attrRepo.findOne.mockResolvedValue(null);

      const result = await service.getCurrentUserActivationProgress('user-1');

      expect(result).toEqual({
        isReferred: false,
        status: 'not_referred',
        progress: {
          registered: false,
          emailVerified: false,
          productViews: 0,
          requiredProductViews: 3,
          hasAction: false,
          completedSteps: 0,
          totalSteps: 4,
        },
        blockers: {
          emailVerification: false,
          remainingProductViews: 3,
          favoriteOrPurchase: false,
        },
      });
    });

    it('should return real activation progress for referred users', async () => {
      attrRepo.findOne.mockResolvedValue({
        id: 'attr-reg',
        userId: 'user-1',
        eventType: AttributionEventType.REGISTRATION,
        status: AttributionStatus.PENDING,
        referralCodeId: 'code-1',
      });
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        emailVerified: true,
      });

      const viewQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '2' }),
      };
      const actionQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };
      attrRepo.createQueryBuilder
        .mockReturnValueOnce(viewQb)
        .mockReturnValueOnce(actionQb);

      const result = await service.getCurrentUserActivationProgress('user-1');

      expect(result).toEqual({
        isReferred: true,
        status: 'in_progress',
        progress: {
          registered: true,
          emailVerified: true,
          productViews: 2,
          requiredProductViews: 3,
          hasAction: true,
          completedSteps: 3,
          totalSteps: 4,
        },
        blockers: {
          emailVerification: false,
          remainingProductViews: 1,
          favoriteOrPurchase: false,
        },
      });
    });
  });

  // ========== checkAndFinalizeConversion ==========

  describe('checkAndFinalizeConversion', () => {
    it('should finalize conversion when all conditions are met', async () => {
      const userId = 'user-123';

      // Mock PENDING REGISTRATION attribution
      const regAttribution = {
        id: 'attr-reg',
        userId,
        eventType: AttributionEventType.REGISTRATION,
        status: AttributionStatus.PENDING,
        referralCodeId: 'code-1',
        referralClickId: 'click-1',
      };
      attrRepo.findOne.mockResolvedValue(regAttribution);

      // Mock user with verified email
      userRepo.findOne.mockResolvedValue({
        id: userId,
        emailVerified: true,
        createdAt: new Date(),
      });

      // Mock query builder calls in order:
      // 1) distinctProductViews (select → where → andWhere → getRawOne)
      const mockQbViews = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '3' }),
      };
      // 2) hasAction (where → andWhere → getCount)
      const mockQbAction = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };
      // 3) atomic UPDATE (update → set → where → execute)
      const mockQbUpdate = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      attrRepo.createQueryBuilder
        .mockReturnValueOnce(mockQbViews)
        .mockReturnValueOnce(mockQbAction)
        .mockReturnValueOnce(mockQbUpdate);

      const result = await service.checkAndFinalizeConversion(userId);

      expect(result).toBe(true);
      expect(riskService.checkAttributionRisk).toHaveBeenCalled();
      expect(mockQbUpdate.execute).toHaveBeenCalled();
      expect(codeRepo.increment).toHaveBeenCalledWith(
        { id: 'code-1' },
        'totalConversions',
        1,
      );
    });

    it('should return false if no PENDING REGISTRATION attribution', async () => {
      attrRepo.findOne.mockResolvedValue(null);

      const result = await service.checkAndFinalizeConversion('user-123');

      expect(result).toBe(false);
      expect(codeRepo.increment).not.toHaveBeenCalled();
    });

    it('should return false if email not verified', async () => {
      attrRepo.findOne.mockResolvedValue({
        id: 'attr-reg',
        userId: 'user-123',
        eventType: AttributionEventType.REGISTRATION,
        status: AttributionStatus.PENDING,
      });

      userRepo.findOne.mockResolvedValue({
        id: 'user-123',
        emailVerified: false,
        createdAt: new Date(),
      });

      const result = await service.checkAndFinalizeConversion('user-123');

      expect(result).toBe(false);
      expect(codeRepo.increment).not.toHaveBeenCalled();
    });

    it('should not require a post-registration waiting period', async () => {
      attrRepo.findOne.mockResolvedValue({
        id: 'attr-reg',
        userId: 'user-123',
        eventType: AttributionEventType.REGISTRATION,
        status: AttributionStatus.PENDING,
        referralCodeId: 'code-1',
        referralClickId: 'click-1',
      });

      userRepo.findOne.mockResolvedValue({
        id: 'user-123',
        emailVerified: true,
        createdAt: new Date(Date.now() - 1 * 60 * 1000),
      });

      const mockQbViews = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '3' }),
      };
      const mockQbAction = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };
      const mockQbUpdate = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      attrRepo.createQueryBuilder
        .mockReturnValueOnce(mockQbViews)
        .mockReturnValueOnce(mockQbAction)
        .mockReturnValueOnce(mockQbUpdate);

      const result = await service.checkAndFinalizeConversion('user-123');

      expect(result).toBe(true);
      expect(codeRepo.increment).toHaveBeenCalledWith(
        { id: 'code-1' },
        'totalConversions',
        1,
      );
    });

    it('should return false if no FAVORITE or PURCHASE_CLICK action', async () => {
      attrRepo.findOne.mockResolvedValue({
        id: 'attr-reg',
        userId: 'user-123',
        eventType: AttributionEventType.REGISTRATION,
        status: AttributionStatus.PENDING,
        referralCodeId: 'code-1',
      });

      userRepo.findOne.mockResolvedValue({
        id: 'user-123',
        emailVerified: true,
        createdAt: new Date(),
      });

      // 1) distinctProductViews passes (>= 3)
      const mockQbViews = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '3' }),
      };
      // 2) hasAction returns 0 → no actions
      const mockQbAction = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      attrRepo.createQueryBuilder
        .mockReturnValueOnce(mockQbViews)
        .mockReturnValueOnce(mockQbAction);

      const result = await service.checkAndFinalizeConversion('user-123');

      expect(result).toBe(false);
      expect(codeRepo.increment).not.toHaveBeenCalled();
    });

    it('should reject conversion if risk check fails', async () => {
      attrRepo.findOne.mockResolvedValue({
        id: 'attr-reg',
        userId: 'user-123',
        eventType: AttributionEventType.REGISTRATION,
        status: AttributionStatus.PENDING,
        referralCodeId: 'code-1',
        referralClickId: 'click-1',
      });

      userRepo.findOne.mockResolvedValue({
        id: 'user-123',
        emailVerified: true,
        createdAt: new Date(),
      });

      // 1) distinctProductViews passes
      const mockQbViews = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '3' }),
      };
      // 2) hasAction passes
      const mockQbAction = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };
      // 3) atomic UPDATE for rejection
      const mockQbUpdate = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      attrRepo.createQueryBuilder
        .mockReturnValueOnce(mockQbViews)
        .mockReturnValueOnce(mockQbAction)
        .mockReturnValueOnce(mockQbUpdate);

      // Risk check fails
      riskService.checkAttributionRisk.mockResolvedValue({
        isValid: false,
        reason: 'Self-referral detected',
        riskScore: 100,
      });

      const result = await service.checkAndFinalizeConversion('user-123');

      expect(result).toBe(false);
      expect(mockQbUpdate.set).toHaveBeenCalledWith({
        status: AttributionStatus.REJECTED,
        rejectReason: 'Self-referral detected',
      });
      expect(codeRepo.increment).not.toHaveBeenCalled();
    });
  });
});

// ========== getSafeRedirect ==========

import { getSafeRedirect } from './referral.controller';

describe('getSafeRedirect', () => {
  it('should return "/" for undefined/empty input', () => {
    expect(getSafeRedirect(undefined)).toBe('/');
    expect(getSafeRedirect('')).toBe('/');
  });

  it('should allow normal relative paths', () => {
    expect(getSafeRedirect('/products/123')).toBe('/products/123');
    expect(getSafeRedirect('/search?q=test')).toBe('/search?q=test');
    expect(getSafeRedirect('/')).toBe('/');
  });

  it('should block absolute URLs (https://)', () => {
    expect(getSafeRedirect('https://evil.com')).toBe('/');
    expect(getSafeRedirect('http://evil.com/path')).toBe('/');
  });

  it('should block protocol-relative URLs (//)', () => {
    expect(getSafeRedirect('//evil.com')).toBe('/');
    expect(getSafeRedirect('//evil.com/path')).toBe('/');
  });

  it('should block backslash trick (/\\)', () => {
    expect(getSafeRedirect('/\\evil.com')).toBe('/');
  });

  it('should block javascript: protocol', () => {
    expect(getSafeRedirect('javascript:alert(1)')).toBe('/');
  });

  it('should block data: protocol', () => {
    expect(getSafeRedirect('data:text/html,<script>alert(1)</script>')).toBe(
      '/',
    );
  });
});
