import { ReferralRiskService } from './referral-risk.service';

describe('ReferralRiskService', () => {
  let service: ReferralRiskService;
  let clickRepo: { count: jest.Mock; findOne: jest.Mock };
  let attrRepo: { count: jest.Mock; update: jest.Mock };

  beforeEach(() => {
    clickRepo = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn().mockResolvedValue(null),
    };
    attrRepo = {
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue(undefined),
    };

    service = new ReferralRiskService(clickRepo as any, attrRepo as any);
  });

  it('rejects bot-like user agents immediately', async () => {
    const result = await service.checkClickRisk({
      sessionId: 'sess-1',
      userAgent: 'python-requests/2.32.3',
      referralCodeId: 'code-1',
    });

    expect(result).toEqual({
      isValid: false,
      reason: 'Suspicious UA',
      riskScore: 100,
    });
  });

  it('keeps normal browser traffic valid when rate limits are clear', async () => {
    const result = await service.checkClickRisk({
      sessionId: 'sess-1',
      ip: '1.2.3.4',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15',
      referralCodeId: 'code-1',
    });

    expect(result).toEqual({
      isValid: true,
      reason: undefined,
      riskScore: 0,
    });
  });

  it('rejects repeated ip/ua/code patterns even before global ip threshold', async () => {
    clickRepo.count
      .mockResolvedValueOnce(1) // global ip
      .mockResolvedValueOnce(4) // ip + code
      .mockResolvedValueOnce(3) // ip + ua + code
      .mockResolvedValueOnce(1) // session
      .mockResolvedValueOnce(10) // code hourly
      .mockResolvedValueOnce(0); // empty referer burst

    const result = await service.checkClickRisk({
      sessionId: 'sess-2',
      ip: '2.2.2.2',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15',
      referralCodeId: 'code-1',
      referer: 'https://instagram.com/story',
    });

    expect(result).toEqual({
      isValid: false,
      reason: 'IP/code rate limit exceeded; IP/UA/code repeat pattern detected',
      riskScore: 95,
    });
  });

  it('elevates empty referer bursts and referral code spikes', async () => {
    clickRepo.count
      .mockResolvedValueOnce(1) // global ip
      .mockResolvedValueOnce(1) // ip + code
      .mockResolvedValueOnce(1) // ip + ua + code
      .mockResolvedValueOnce(0) // session
      .mockResolvedValueOnce(150) // code hourly
      .mockResolvedValueOnce(40); // empty referer burst

    const result = await service.checkClickRisk({
      sessionId: 'sess-3',
      ip: '3.3.3.3',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      referralCodeId: 'code-9',
      referer: '',
    });

    expect(result).toEqual({
      isValid: true,
      reason:
        'Referral code hourly spike detected; Empty referer burst detected',
      riskScore: 40,
    });
  });

  it('rejects internal referers immediately', async () => {
    const result = await service.checkClickRisk({
      sessionId: 'sess-internal',
      ip: '4.4.4.4',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_4) AppleWebKit/605.1.15',
      referralCodeId: 'code-internal',
      referer: 'https://lolobuyspreadsheets.com/account/referral',
    });

    expect(result).toEqual({
      isValid: false,
      reason: 'Internal referer detected',
      riskScore: 100,
    });
  });

  it('adds risk for malformed referers', async () => {
    clickRepo.count
      .mockResolvedValueOnce(0) // global ip
      .mockResolvedValueOnce(0) // ip + code
      .mockResolvedValueOnce(0) // ip + ua + code
      .mockResolvedValueOnce(0) // session
      .mockResolvedValueOnce(0); // code hourly

    const result = await service.checkClickRisk({
      sessionId: 'sess-malformed',
      ip: '5.5.5.5',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      referralCodeId: 'code-bad-ref',
      referer: 'not-a-valid-url',
    });

    expect(result).toEqual({
      isValid: true,
      reason: 'Malformed referer',
      riskScore: 20,
    });
  });
});
