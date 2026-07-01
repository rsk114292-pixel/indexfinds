import { Test, TestingModule } from '@nestjs/testing';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import {
  REFERRAL_TRACKING_SIGNATURE_HEADER,
  REFERRAL_TRACKING_TIMESTAMP_HEADER,
  signReferralTrackingPayload,
} from '../shared/utils/referral-tracking-signature';

describe('ReferralController', () => {
  let controller: ReferralController;
  let referralService: any;

  beforeEach(async () => {
    referralService = {
      getOrCreateUserCode: jest.fn(),
      getCodeClickMetrics: jest.fn(),
      getUserStats: jest.fn(),
      getCurrentUserActivationProgress: jest.fn(),
      trackProductViewFromCookie: jest.fn(),
      checkAndFinalizeConversion: jest.fn(),
      recordClick: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralController],
      providers: [{ provide: ReferralService, useValue: referralService }],
    }).compile();

    controller = module.get<ReferralController>(ReferralController);
  });

  describe('trackClick', () => {
    const validBody = {
      code: 'ABC123',
      sessionId: 'sess_test',
      landingPage: '/r/ABC123',
      redirectTo: '/products/123',
      userAgent: 'Mozilla/5.0',
      ip: '1.2.3.4',
      referer: 'https://google.com',
    };

    it('should return failure when code is missing', async () => {
      const result = await controller.trackClick(
        {
          ...validBody,
          code: '',
        },
        { headers: {}, cookies: {} } as any,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('code is required');
      expect(referralService.recordClick).not.toHaveBeenCalled();
    });

    it('should return failure when referral code is invalid', async () => {
      referralService.recordClick.mockResolvedValue(null);

      const result = await controller.trackClick(validBody, {
        headers: {},
        cookies: { mf_vid: 'vid_test' },
      } as any);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid or inactive referral code');
    });

    it('should return success with cookie value on valid click', async () => {
      referralService.recordClick.mockResolvedValue({
        id: 'click-uuid-123',
        referralCodeId: 'code-uuid-456',
      });

      const result = await controller.trackClick(validBody, {
        headers: {},
        cookies: { mf_vid: 'vid_test' },
      } as any);

      expect(result.success).toBe(true);
      expect(result.cookieValue).toBeDefined();

      // Verify cookie value contains expected fields
      const params = new URLSearchParams(result.cookieValue);
      expect(params.get('ref_click_id')).toBe('click-uuid-123');
      expect(params.get('referral_code')).toBe('ABC123');
      expect(params.get('exp')).toBeTruthy();

      // Verify expiry is ~30 days from now
      const exp = parseInt(params.get('exp')!, 10);
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      expect(exp).toBeGreaterThan(Date.now() + thirtyDaysMs - 5000);
      expect(exp).toBeLessThan(Date.now() + thirtyDaysMs + 5000);
    });

    it('should pass all fields to recordClick', async () => {
      referralService.recordClick.mockResolvedValue({ id: 'click-1' });

      await controller.trackClick(validBody, {
        headers: { 'user-agent': 'ReqUA/1.0', referer: 'https://example.com' },
        ip: '10.0.0.2',
        cookies: { mf_vid: 'vid_test' },
      } as any);

      expect(referralService.recordClick).toHaveBeenCalledWith({
        code: 'ABC123',
        sessionId: 'vid_test',
        landingPage: '/r/ABC123',
        redirectTo: '/products/123',
        userAgent: 'ReqUA/1.0',
        ip: '10.0.0.2',
        referer: 'https://example.com',
      });
    });

    it('should uppercase the referral code in cookie value', async () => {
      referralService.recordClick.mockResolvedValue({ id: 'click-1' });

      const result = await controller.trackClick(
        {
          ...validBody,
          code: 'abc123',
        },
        { headers: {}, cookies: { mf_vid: 'vid_test' } } as any,
      );

      const params = new URLSearchParams(result.cookieValue);
      expect(params.get('referral_code')).toBe('ABC123');
    });

    it('should trust signed forwarded click context from web middleware', async () => {
      process.env.REVALIDATE_SECRET = 'test-referral-secret';
      referralService.recordClick.mockResolvedValue({ id: 'click-1' });
      const timestamp = Date.now().toString();
      const payload = {
        timestamp,
        code: validBody.code,
        sessionId: validBody.sessionId,
        landingPage: validBody.landingPage,
        redirectTo: validBody.redirectTo,
        userAgent: validBody.userAgent,
        ip: validBody.ip,
        referer: validBody.referer,
      };
      const signature = signReferralTrackingPayload(
        payload,
        process.env.REVALIDATE_SECRET,
      );

      await controller.trackClick(validBody, {
        headers: {
          [REFERRAL_TRACKING_TIMESTAMP_HEADER]: timestamp,
          [REFERRAL_TRACKING_SIGNATURE_HEADER]: signature,
          'user-agent': 'ProxyUA/1.0',
        },
        cookies: {},
      } as any);

      expect(referralService.recordClick).toHaveBeenLastCalledWith({
        code: 'ABC123',
        sessionId: 'sess_test',
        landingPage: '/r/ABC123',
        redirectTo: '/products/123',
        userAgent: 'Mozilla/5.0',
        ip: '1.2.3.4',
        referer: 'https://google.com',
      });
    });
  });

  describe('trackProductView', () => {
    it('should trigger conversion recheck for authenticated users after recording a view', async () => {
      referralService.trackProductViewFromCookie.mockResolvedValue({
        id: 'attr-view-1',
      });

      const result = await controller.trackProductView(
        { productId: 'product-1' },
        {
          headers: {},
          cookies: {
            mf_ref_attrib:
              'ref_click_id=click-1&referral_code=ABC123&exp=9999999999999',
          },
        } as any,
        { id: 'user-1' },
      );

      expect(referralService.trackProductViewFromCookie).toHaveBeenCalled();
      expect(referralService.checkAndFinalizeConversion).toHaveBeenCalledWith(
        'user-1',
      );
      expect(result).toEqual({ success: true, attributionId: 'attr-view-1' });
    });

    it('should not trigger conversion recheck for anonymous users', async () => {
      referralService.trackProductViewFromCookie.mockResolvedValue({
        id: 'attr-view-2',
      });

      await controller.trackProductView({ productId: 'product-1' }, {
        headers: {},
        cookies: {
          mf_ref_attrib:
            'ref_click_id=click-1&referral_code=ABC123&exp=9999999999999',
        },
      } as any);

      expect(referralService.checkAndFinalizeConversion).not.toHaveBeenCalled();
    });
  });

  describe('getMyCode', () => {
    it('returns trusted and raw click metrics', async () => {
      referralService.getOrCreateUserCode.mockResolvedValue({
        id: 'code-1',
        code: 'ABC123',
        totalConversions: 3,
      });
      referralService.getCodeClickMetrics.mockResolvedValue({
        trustedClicks: 12,
        rawClicks: 30,
      });

      const result = await controller.getMyCode({ id: 'user-1' });

      expect(referralService.getCodeClickMetrics).toHaveBeenCalledWith(
        'code-1',
      );
      expect(result).toEqual({
        code: 'ABC123',
        shareUrl: '/r/ABC123',
        totalClicks: 12,
        trustedClicks: 12,
        rawClicks: 30,
        totalConversions: 3,
      });
    });
  });

  describe('getMyActivation', () => {
    it('returns the current user activation progress', async () => {
      referralService.getCurrentUserActivationProgress.mockResolvedValue({
        isReferred: true,
        status: 'in_progress',
      });

      const result = await controller.getMyActivation({ id: 'user-1' });

      expect(
        referralService.getCurrentUserActivationProgress,
      ).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({
        isReferred: true,
        status: 'in_progress',
      });
    });
  });
});
