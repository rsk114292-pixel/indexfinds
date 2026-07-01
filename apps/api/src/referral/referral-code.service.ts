import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ReferralCode,
  REFERRAL_CODE_CHARSET,
} from './entities/referral-code.entity';
import { ReferralAnalyticsService } from './referral-analytics.service';

@Injectable()
export class ReferralCodeService {
  constructor(
    @InjectRepository(ReferralCode)
    private readonly codeRepo: Repository<ReferralCode>,
    private readonly referralAnalyticsService: ReferralAnalyticsService,
  ) {}

  private generateCode(): string {
    let code = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(
        Math.random() * REFERRAL_CODE_CHARSET.length,
      );
      code += REFERRAL_CODE_CHARSET[randomIndex];
    }
    return code;
  }

  async getOrCreateUserCode(userId: string): Promise<ReferralCode> {
    let code = await this.codeRepo.findOne({
      where: { ownerId: userId, ownerType: 'user' },
    });

    if (code && !code.isActive) {
      code.isActive = true;
      code = await this.codeRepo.save(code);
    }

    if (!code) {
      let newCode: string;
      let exists = true;
      while (exists) {
        newCode = this.generateCode();
        const found = await this.codeRepo.findOne({
          where: { code: newCode },
        });
        exists = !!found;
      }

      code = this.codeRepo.create({
        code: newCode!,
        ownerType: 'user',
        ownerId: userId,
      });
      await this.codeRepo.save(code);
    }

    return code;
  }

  async findByCode(code: string): Promise<ReferralCode | null> {
    return this.codeRepo.findOne({
      where: { code: code.toUpperCase(), isActive: true },
    });
  }

  async getUserStats(userId: string) {
    const code = await this.codeRepo.findOne({
      where: { ownerId: userId, ownerType: 'user' },
    });

    if (!code) {
      return {
        code: null,
        clicks: 0,
        trustedClicks: 0,
        rawClicks: 0,
        conversions: 0,
      };
    }

    const clickMetrics =
      await this.referralAnalyticsService.getCodeClickMetrics(code.id);

    return {
      code: code.code,
      clicks: clickMetrics.trustedClicks,
      trustedClicks: clickMetrics.trustedClicks,
      rawClicks: clickMetrics.rawClicks,
      conversions: code.totalConversions,
    };
  }
}
