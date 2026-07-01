import { SearchTrackingController } from './search-tracking.controller';

describe('SearchTrackingController', () => {
  let controller: SearchTrackingController;
  let analyticsService: {
    recordImpressions: jest.Mock;
    recordClick: jest.Mock;
    markConversion: jest.Mock;
  };

  beforeEach(() => {
    analyticsService = {
      recordImpressions: jest.fn().mockResolvedValue(undefined),
      recordClick: jest.fn().mockResolvedValue('click-1'),
      markConversion: jest.fn().mockResolvedValue(undefined),
    };

    controller = new SearchTrackingController(analyticsService as any);
  });

  it('forwards search click identity fields to the analytics service', async () => {
    const dto = {
      searchLogId: '550e8400-e29b-41d4-a716-446655440000',
      query: 'sneaker',
      productId: '550e8400-e29b-41d4-a716-446655440001',
      position: 2,
      page: 3,
      sessionId: 'sess_123',
      deviceId: 'sess_123',
      visitId: 'visit_123',
    };

    const request = {
      headers: {
        'x-forwarded-for': '203.0.113.9',
        'user-agent': 'Mozilla/5.0',
      },
      cookies: {
        mf_vid: 'vid_test',
      },
      ip: '127.0.0.1',
    } as any;

    const result = await controller.recordClick(dto as any, request, undefined);

    expect(analyticsService.recordClick).toHaveBeenCalledWith(
      {
        searchLogId: dto.searchLogId,
        query: dto.query,
        productId: dto.productId,
        position: dto.position,
        page: dto.page,
        userId: undefined,
        sessionId: dto.sessionId,
        deviceId: dto.deviceId,
        visitId: dto.visitId,
      },
      {
        userId: undefined,
        trustedVisitorId: 'vid_test',
        visitId: undefined,
        ipAddress: '203.0.113.9',
        userAgent: 'Mozilla/5.0',
      },
    );
    expect(result).toEqual({ clickId: 'click-1' });
  });
});
