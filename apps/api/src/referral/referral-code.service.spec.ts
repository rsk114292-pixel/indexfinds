import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReferralCodeService } from './referral-code.service';
import { ReferralCode } from './entities/referral-code.entity';
import { ReferralAnalyticsService } from './referral-analytics.service';

describe('ReferralCodeService', () => {
  let service: ReferralCodeService;
  let codeRepo: any;

  beforeEach(async () => {
    codeRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((code) => code),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralCodeService,
        {
          provide: getRepositoryToken(ReferralCode),
          useValue: codeRepo,
        },
        {
          provide: ReferralAnalyticsService,
          useValue: {
            getCodeClickMetrics: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReferralCodeService>(ReferralCodeService);
  });

  it('reactivates an existing inactive referral code before returning it', async () => {
    codeRepo.findOne.mockResolvedValue({
      id: 'code-1',
      code: 'ABC123',
      ownerType: 'user',
      ownerId: 'user-1',
      isActive: false,
    });

    const result = await service.getOrCreateUserCode('user-1');

    expect(codeRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'code-1',
        isActive: true,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'code-1',
        code: 'ABC123',
        isActive: true,
      }),
    );
  });
});
