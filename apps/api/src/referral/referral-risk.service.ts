import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ReferralClick } from './entities/referral-click.entity';
import {
  ReferralAttribution,
  AttributionStatus,
} from './entities/referral-attribution.entity';
import { isLikelyBotUserAgent } from '../visit-tracking/utils/traffic-bot';
import { getDomainKind } from '../visit-tracking/utils/traffic-source';

export interface RiskCheckResult {
  isValid: boolean;
  reason?: string;
  riskScore: number;
}

@Injectable()
export class ReferralRiskService {
  // 风控配置
  private readonly config = {
    maxClicksPerIpPerHour: 10,
    maxClicksPerSessionPerHour: 5,
    maxClicksPerIpPerCodePerHour: 4,
    maxClicksPerIpUaPerCodePerHour: 3,
    maxClicksPerCodePerHour: 120,
    maxEmptyRefererClicksPerCodePerHour: 30,
    maxAttributionsPerUserPerDay: 10, // 提高限制：1注册 + 多次商品浏览 + 收藏/购买
  };

  constructor(
    @InjectRepository(ReferralClick)
    private clickRepo: Repository<ReferralClick>,
    @InjectRepository(ReferralAttribution)
    private attrRepo: Repository<ReferralAttribution>,
  ) {}

  private getRefererDomain(referer?: string): string | null {
    if (!referer) return null;

    try {
      return new URL(referer).hostname || null;
    } catch {
      return null;
    }
  }

  // 检查点击是否可疑
  async checkClickRisk(data: {
    ip?: string;
    sessionId: string;
    userAgent?: string;
    referralCodeId: string;
    referer?: string;
  }): Promise<RiskCheckResult> {
    let riskScore = 0;
    const reasons: string[] = [];
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // 检查User-Agent是否可疑
    if (data.userAgent) {
      const flaggedByBotFilter = isLikelyBotUserAgent(data.userAgent);
      if (flaggedByBotFilter) {
        riskScore += 100;
        reasons.push('Suspicious UA');
      }

      const ua = data.userAgent.toLowerCase();
      for (const suspicious of flaggedByBotFilter
        ? []
        : ['curl', 'wget', 'python']) {
        if (ua.includes(suspicious)) {
          riskScore += 100;
          reasons.push(`Suspicious UA: ${suspicious}`);
          break;
        }
      }
    }

    if (riskScore >= 100) {
      return {
        isValid: false,
        reason: reasons.join('; '),
        riskScore,
      };
    }

    if (data.referer) {
      const refererDomain = this.getRefererDomain(data.referer);
      if (!refererDomain) {
        riskScore += 20;
        reasons.push('Malformed referer');
      } else {
        const domainKind = getDomainKind(refererDomain);
        if (domainKind === 'internal') {
          riskScore += 100;
          reasons.push('Internal referer detected');
        }
      }
    }

    if (riskScore >= 100) {
      return {
        isValid: false,
        reason: reasons.join('; '),
        riskScore,
      };
    }

    // 检查IP频率限制
    if (data.ip) {
      const ipClicks = await this.clickRepo.count({
        where: { ip: data.ip, createdAt: MoreThan(hourAgo) },
      });
      if (ipClicks >= this.config.maxClicksPerIpPerHour) {
        riskScore += 50;
        reasons.push('IP rate limit exceeded');
      }

      const ipCodeClicks = await this.clickRepo.count({
        where: {
          ip: data.ip,
          referralCodeId: data.referralCodeId,
          createdAt: MoreThan(hourAgo),
        },
      });
      if (ipCodeClicks >= this.config.maxClicksPerIpPerCodePerHour) {
        riskScore += 35;
        reasons.push('IP/code rate limit exceeded');
      }

      if (data.userAgent) {
        const ipUaCodeClicks = await this.clickRepo.count({
          where: {
            ip: data.ip,
            userAgent: data.userAgent,
            referralCodeId: data.referralCodeId,
            createdAt: MoreThan(hourAgo),
          },
        });
        if (ipUaCodeClicks >= this.config.maxClicksPerIpUaPerCodePerHour) {
          riskScore += 60;
          reasons.push('IP/UA/code repeat pattern detected');
        }
      }
    }

    // 检查Session频率限制
    const sessionClicks = await this.clickRepo.count({
      where: { sessionId: data.sessionId, createdAt: MoreThan(hourAgo) },
    });
    if (sessionClicks >= this.config.maxClicksPerSessionPerHour) {
      riskScore += 40;
      reasons.push('Session rate limit exceeded');
    }

    const codeClicks = await this.clickRepo.count({
      where: {
        referralCodeId: data.referralCodeId,
        createdAt: MoreThan(hourAgo),
      },
    });
    if (codeClicks >= this.config.maxClicksPerCodePerHour) {
      riskScore += 20;
      reasons.push('Referral code hourly spike detected');
    }

    if (!data.referer) {
      const emptyRefererClicks = await this.clickRepo.count({
        where: {
          referralCodeId: data.referralCodeId,
          createdAt: MoreThan(hourAgo),
          referer: '',
        },
      });
      if (
        emptyRefererClicks >= this.config.maxEmptyRefererClicksPerCodePerHour
      ) {
        riskScore += 20;
        reasons.push('Empty referer burst detected');
      }
    }

    return {
      isValid: riskScore < 50,
      reason: reasons.length > 0 ? reasons.join('; ') : undefined,
      riskScore,
    };
  }

  // 检查归因是否可疑
  async checkAttributionRisk(data: {
    userId?: string;
    referralCodeId: string;
    referralClickId: string;
  }): Promise<RiskCheckResult> {
    let riskScore = 0;
    const reasons: string[] = [];

    // 如果有用户ID，检查该用户今日归因数量
    if (data.userId) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const userAttribCount = await this.attrRepo.count({
        where: {
          userId: data.userId,
          createdAt: MoreThan(todayStart),
        },
      });

      if (userAttribCount >= this.config.maxAttributionsPerUserPerDay) {
        riskScore += 60;
        reasons.push('User daily attribution limit exceeded');
      }
    }

    // 检查是否自推自点
    const click = await this.clickRepo.findOne({
      where: { id: data.referralClickId },
      relations: ['referralCode'],
    });

    if (click && data.userId) {
      // 需要检查推荐码所有者是否是当前用户
      // 这里简化处理，实际可能需要查询更多信息
      if (click.referralCode?.ownerId === data.userId) {
        riskScore += 100;
        reasons.push('Self-referral detected');
      }
    }

    return {
      isValid: riskScore < 50,
      reason: reasons.length > 0 ? reasons.join('; ') : undefined,
      riskScore,
    };
  }

  // 标记归因状态
  async markAttributionStatus(
    attributionId: string,
    status: AttributionStatus,
    riskReason?: string,
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status };
    if (riskReason) {
      updateData.eventData = { riskReason };
    }
    await this.attrRepo.update({ id: attributionId }, updateData);
  }
}
