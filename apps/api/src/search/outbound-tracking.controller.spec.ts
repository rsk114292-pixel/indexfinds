import { OutboundTrackingController } from './outbound-tracking.controller';
import { AttributionEventType } from '../referral/entities/referral-attribution.entity';
import { PointsEvents } from '../points/points.events';

describe('OutboundTrackingController', () => {
  let controller: OutboundTrackingController;
  let outboundTrackingService: { recordOutboundClick: jest.Mock };
  let referralService: {
    triggerAttributionFromCookie: jest.Mock;
    checkAndFinalizeConversion: jest.Mock;
  };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(() => {
    outboundTrackingService = {
      recordOutboundClick: jest.fn().mockResolvedValue('outbound-1'),
    };
    referralService = {
      triggerAttributionFromCookie: jest
        .fn()
        .mockResolvedValue({ id: 'attr-1' }),
      checkAndFinalizeConversion: jest.fn().mockResolvedValue(false),
    };
    eventEmitter = {
      emit: jest.fn(),
    };

    controller = new OutboundTrackingController(
      outboundTrackingService as any,
      referralService as any,
      eventEmitter as any,
    );
  });

  it('should record outbound click and trigger referral attribution when cookie exists', async () => {
    const result = await controller.recordOutboundClick(
      {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        platformType: 'kakobuy',
        sessionId: 'session-1',
      },
      {
        headers: {
          'x-forwarded-for': '203.0.113.9',
          'user-agent': 'Mozilla/5.0',
        },
        cookies: {
          mf_vid: 'vid_test',
          mf_ref_attrib:
            'referral_code=ABC123&ref_click_id=click-1&exp=9999999999999',
        },
      } as any,
      undefined,
    );

    expect(outboundTrackingService.recordOutboundClick).toHaveBeenCalledWith(
      {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        platformType: 'kakobuy',
        sessionId: 'session-1',
        userId: undefined,
      },
      {
        userId: undefined,
        trustedVisitorId: 'vid_test',
        visitId: undefined,
        ipAddress: '203.0.113.9',
        userAgent: 'Mozilla/5.0',
      },
    );
    expect(referralService.triggerAttributionFromCookie).toHaveBeenCalledWith(
      'referral_code=ABC123&ref_click_id=click-1&exp=9999999999999',
      AttributionEventType.PURCHASE_CLICK,
      undefined,
      {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        platform: 'kakobuy',
      },
    );
    expect(eventEmitter.emit).not.toHaveBeenCalledWith(
      PointsEvents.EARN_REQUEST,
      expect.anything(),
    );
    expect(result).toEqual({ success: true, outboundId: 'outbound-1' });
  });

  it('should skip referral attribution when cookie is missing', async () => {
    await controller.recordOutboundClick(
      {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        platformType: 'kakobuy',
        sessionId: 'session-1',
      },
      {
        headers: {},
        ip: '198.51.100.10',
        cookies: { mf_vid: 'vid_test' },
      } as any,
      undefined,
    );

    expect(referralService.triggerAttributionFromCookie).not.toHaveBeenCalled();
    expect(referralService.checkAndFinalizeConversion).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should prefer authenticated user id over dto.userId for referral attribution', async () => {
    await controller.recordOutboundClick(
      {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        platformType: 'kakobuy',
        sessionId: 'session-1',
        userId: '550e8400-e29b-41d4-a716-446655440001',
      },
      {
        headers: {
          'x-forwarded-for': '203.0.113.9',
          'user-agent': 'Mozilla/5.0',
        },
        cookies: {
          mf_vid: 'vid_test',
          mf_ref_attrib:
            'referral_code=ABC123&ref_click_id=click-1&exp=9999999999999',
        },
      } as any,
      { id: '550e8400-e29b-41d4-a716-446655440002' } as any,
    );

    expect(outboundTrackingService.recordOutboundClick).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '550e8400-e29b-41d4-a716-446655440002',
      }),
      expect.any(Object),
    );

    expect(referralService.triggerAttributionFromCookie).toHaveBeenCalledWith(
      'referral_code=ABC123&ref_click_id=click-1&exp=9999999999999',
      AttributionEventType.PURCHASE_CLICK,
      '550e8400-e29b-41d4-a716-446655440002',
      {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        platform: 'kakobuy',
      },
    );
    expect(referralService.checkAndFinalizeConversion).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440002',
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      PointsEvents.EARN_REQUEST,
      expect.objectContaining({
        userId: '550e8400-e29b-41d4-a716-446655440002',
        action: 'first_favorite',
        referenceType: 'user',
        referenceId: '550e8400-e29b-41d4-a716-446655440002',
        metadata: expect.objectContaining({
          source: 'purchase_click',
          productId: '550e8400-e29b-41d4-a716-446655440000',
          platform: 'kakobuy',
        }),
      }),
    );
  });
});
