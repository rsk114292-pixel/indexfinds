import {
  markOutbound,
  recordImpressions,
  recordSearchClick,
} from './search-tracking';

describe('search-tracking', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ clickId: 'click-1' }),
    });
  });

  it('sends impressions through the configured API origin', async () => {
    await recordImpressions(
      '550e8400-e29b-41d4-a716-446655440000',
      [{ productId: '550e8400-e29b-41d4-a716-446655440001', position: 1 }],
      1,
    );

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:4101/search/tracking/impressions', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchLogId: '550e8400-e29b-41d4-a716-446655440000',
        impressions: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440001',
            position: 1,
          },
        ],
        page: 1,
      }),
    });
  });

  it('sends search clicks through the configured API origin', async () => {
    await recordSearchClick({
      searchLogId: '550e8400-e29b-41d4-a716-446655440000',
      query: 'nike',
      productId: '550e8400-e29b-41d4-a716-446655440001',
      position: 2,
      page: 1,
      sessionId: 'sess_test',
      deviceId: 'vid_test',
      visitId: 'visit_test',
    });

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:4101/search/tracking/click', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchLogId: '550e8400-e29b-41d4-a716-446655440000',
        query: 'nike',
        productId: '550e8400-e29b-41d4-a716-446655440001',
        position: 2,
        page: 1,
        sessionId: 'sess_test',
        deviceId: 'vid_test',
        visitId: 'visit_test',
      }),
    });
  });

  it('sends outbound marks through the configured API origin', async () => {
    await markOutbound('550e8400-e29b-41d4-a716-446655440000');

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:4101/search/tracking/conversion', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchClickId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    });
  });
});
