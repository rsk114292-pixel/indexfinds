import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitSession } from './entities/visit-session.entity';
import {
  TrafficBlock,
  TrafficBlockScope,
  TrafficBlockStatus,
  TrafficBlockTargetType,
} from './entities/traffic-block.entity';
import {
  CreateTrafficBlockDto,
  IgnoreTrafficCandidateDto,
  QueryTrafficBlocksDto,
  QueryTrafficDefenseCandidatesDto,
} from './dto/traffic-defense.dto';

type NetworkSummaryRow = {
  network: string;
  sampleIp: string | null;
  topCountry: string | null;
  countries: string | number;
  sessions: string | number;
  ips: string | number;
  devices: string | number;
  directSessions: string | number;
  productLandings: string | number;
  firstSeen: string;
  lastSeen: string;
  topLandingPage: string | null;
};

type BlockTargetCache = {
  expiresAt: number;
  targets: Set<string>;
};

export type TrafficDefenseCandidate = {
  target: string;
  targetType: TrafficBlockTargetType;
  scope: TrafficBlockScope;
  sessions: number;
  ips: number;
  devices: number;
  directSessions: number;
  productLandings: number;
  directPct: number;
  productLandingPct: number;
  risk: 'high_proxy_pool' | 'direct_product_rotation' | 'watch';
  sampleIp: string | null;
  topCountry: string | null;
  countries: number;
  firstSeen: string;
  lastSeen: string;
  topLandingPage: string | null;
  existingBlock: TrafficBlock | null;
};

@Injectable()
export class TrafficDefenseService {
  private readonly logger = new Logger(TrafficDefenseService.name);
  private blockTargetCache: BlockTargetCache | null = null;
  private readonly blockTargetCacheTtlMs = 10_000;

  constructor(
    @InjectRepository(VisitSession)
    private readonly visitSessionRepository: Repository<VisitSession>,
    @InjectRepository(TrafficBlock)
    private readonly trafficBlockRepository: Repository<TrafficBlock>,
  ) {}

  async getCandidates(
    query: QueryTrafficDefenseCandidatesDto,
  ): Promise<TrafficDefenseCandidate[]> {
    await this.expireElapsedBlocks();

    const minutes = Math.min(Math.max(query.minutes ?? 15, 1), 60);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - minutes * 60 * 1000);

    const rows: NetworkSummaryRow[] = await this.visitSessionRepository.query(
      `WITH scoped AS (
        SELECT
          COALESCE(NULLIF(vs.ip_address, ''), '(unknown)') AS ip_address,
          COALESCE(NULLIF(vs.device_id, ''), vs.session_id) AS device_key,
          COALESCE(vs.channel_type, 'direct') AS channel_type,
          COALESCE(NULLIF(UPPER(vs.country), ''), '(unknown)') AS country,
          COALESCE(vs.landing_page, '') AS landing_page,
          vs.created_at
        FROM visit_sessions vs
        WHERE vs.created_at BETWEEN $1 AND $2
          AND NOT EXISTS (
            SELECT 1
            FROM users internal_user
            WHERE internal_user.id = vs.user_id
              AND internal_user.role IN ('admin', 'super_admin')
          )
      ),
      networked AS (
        SELECT
          CASE
            WHEN ip_address ~ '^[0-9]{1,3}(\\.[0-9]{1,3}){3}$'
              THEN regexp_replace(ip_address, '\\.[0-9]{1,3}$', '.0/24')
            ELSE ip_address
          END AS network,
          ip_address,
          device_key,
          channel_type,
          country,
          landing_page,
          created_at
        FROM scoped
      ),
      candidate_events AS (
        SELECT
          network AS target,
          ip_address,
          device_key,
          channel_type,
          country,
          landing_page,
          created_at
        FROM networked
        WHERE network <> '(unknown)'
        UNION ALL
        SELECT
          ip_address AS target,
          ip_address,
          device_key,
          channel_type,
          country,
          landing_page,
          created_at
        FROM networked
        WHERE ip_address ~ '^[0-9]{1,3}(\\.[0-9]{1,3}){3}$'
      ),
      landing_rank AS (
        SELECT
          target,
          landing_page,
          ROW_NUMBER() OVER (
            PARTITION BY target
            ORDER BY COUNT(*) DESC, landing_page ASC
          ) AS rank
        FROM candidate_events
        GROUP BY target, landing_page
      ),
      country_rank AS (
        SELECT
          target,
          country,
          ROW_NUMBER() OVER (
            PARTITION BY target
            ORDER BY COUNT(*) DESC, country ASC
          ) AS rank
        FROM candidate_events
        GROUP BY target, country
      )
      SELECT
        n.target AS network,
        MIN(n.ip_address) FILTER (WHERE n.ip_address <> '(unknown)') AS "sampleIp",
        MAX(cr.country) FILTER (WHERE cr.rank = 1) AS "topCountry",
        COUNT(DISTINCT n.country) FILTER (WHERE n.country <> '(unknown)')::int AS countries,
        COUNT(*)::int AS sessions,
        COUNT(DISTINCT n.ip_address)::int AS ips,
        COUNT(DISTINCT n.device_key)::int AS devices,
        COUNT(*) FILTER (WHERE n.channel_type = 'direct')::int AS "directSessions",
        COUNT(*) FILTER (
          WHERE n.landing_page ~ '^/[a-z]{2}/products/[^/?#]+'
             OR n.landing_page ~ '^/products/[^/?#]+'
        )::int AS "productLandings",
        MIN(n.created_at)::text AS "firstSeen",
        MAX(n.created_at)::text AS "lastSeen",
        MAX(lr.landing_page) FILTER (WHERE lr.rank = 1) AS "topLandingPage"
      FROM candidate_events n
      LEFT JOIN landing_rank lr ON lr.target = n.target AND lr.rank = 1
      LEFT JOIN country_rank cr ON cr.target = n.target AND cr.rank = 1
      GROUP BY n.target
      HAVING COUNT(*) >= 30
        OR COUNT(DISTINCT n.ip_address) >= 8
        OR COUNT(DISTINCT n.device_key) >= 25
      ORDER BY sessions DESC, devices DESC, ips DESC
      LIMIT $3`,
      [startDate, endDate, limit],
    );

    const candidates = rows
      .map((row) => this.mapCandidate(row))
      .filter((candidate): candidate is TrafficDefenseCandidate => !!candidate);

    if (!candidates.length) {
      return [];
    }

    const blocks = await this.trafficBlockRepository
      .createQueryBuilder('block')
      .where('block.target IN (:...targets)', {
        targets: candidates.map((candidate) => candidate.target),
      })
      .andWhere('block.scope = :scope', {
        scope: TrafficBlockScope.PRODUCT_PATHS,
      })
      .andWhere('block.status IN (:...statuses)', {
        statuses: [
          TrafficBlockStatus.PENDING_SYNC,
          TrafficBlockStatus.ACTIVE,
          TrafficBlockStatus.IGNORED,
        ],
      })
      .andWhere('(block.expiresAt IS NULL OR block.expiresAt > :now)', {
        now: new Date(),
      })
      .orderBy('block.createdAt', 'DESC')
      .getMany();

    const blockByTarget = new Map<string, TrafficBlock>();
    for (const block of blocks) {
      if (!blockByTarget.has(block.target)) {
        blockByTarget.set(block.target, block);
      }
    }

    return candidates.map((candidate) => ({
      ...candidate,
      existingBlock: blockByTarget.get(candidate.target) ?? null,
    }));
  }

  async getBlocks(query: QueryTrafficBlocksDto) {
    await this.expireElapsedBlocks();

    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const qb = this.trafficBlockRepository
      .createQueryBuilder('block')
      .orderBy('block.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      qb.andWhere('block.status = :status', { status: query.status });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async shouldBlockProductPathVisit(
    ip: string,
    landingPage?: string,
  ): Promise<boolean> {
    if (!this.isProductLandingPage(landingPage)) {
      return false;
    }

    const target = this.normalizeIncomingIpv4(ip);
    if (!target) {
      return false;
    }

    const blockTargets = await this.getCurrentProductPathBlockTargets();
    const networkTarget = this.getIpv4NetworkTarget(target);
    const matchedTarget =
      blockTargets.has(target) || blockTargets.has(networkTarget);

    if (matchedTarget) {
      this.logger.warn(
        `Dropping traffic defense blocked product visit from ${target}`,
      );
    }

    return matchedTarget;
  }

  async createBlock(
    dto: CreateTrafficBlockDto,
    adminUserId: string,
  ): Promise<TrafficBlock> {
    await this.expireElapsedBlocks();
    const targetType = this.resolveTargetType(dto.target);
    const target = this.normalizeTarget(dto.target, targetType);
    const scope = dto.scope ?? TrafficBlockScope.PRODUCT_PATHS;

    const existing = await this.findCurrentBlock(target, scope, [
      TrafficBlockStatus.PENDING_SYNC,
      TrafficBlockStatus.ACTIVE,
    ]);
    if (existing) {
      throw new ConflictException('该目标已有待同步或生效封禁记录');
    }

    const block = this.trafficBlockRepository.create({
      target,
      targetType,
      scope,
      status: TrafficBlockStatus.PENDING_SYNC,
      reason: dto.reason ?? null,
      metricsSnapshot: dto.metricsSnapshot ?? null,
      createdBy: adminUserId,
      expiresAt: this.buildExpiresAt(dto.ttlHours),
      appliedAt: null,
      revokedAt: null,
    });

    const saved = await this.trafficBlockRepository.save(block);
    this.clearBlockTargetCache();
    return saved;
  }

  async createAutomaticTemporaryBlock(params: {
    target: string;
    reason: string;
    metricsSnapshot?: Record<string, unknown>;
    ttlHours?: number;
  }): Promise<TrafficBlock | null> {
    await this.expireElapsedBlocks();

    let targetType: TrafficBlockTargetType;
    let target: string;
    try {
      targetType = this.resolveTargetType(params.target);
      target = this.normalizeTarget(params.target, targetType);
    } catch (error) {
      this.logger.warn(
        `Skip automatic traffic block for invalid target=${params.target}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }

    const existing = await this.findCurrentBlock(
      target,
      TrafficBlockScope.PRODUCT_PATHS,
      [
        TrafficBlockStatus.PENDING_SYNC,
        TrafficBlockStatus.ACTIVE,
        TrafficBlockStatus.IGNORED,
      ],
    );
    if (existing) {
      return existing.status === TrafficBlockStatus.IGNORED ? null : existing;
    }

    const block = this.trafficBlockRepository.create({
      target,
      targetType,
      scope: TrafficBlockScope.PRODUCT_PATHS,
      status: TrafficBlockStatus.PENDING_SYNC,
      reason: `auto:${params.reason}`,
      metricsSnapshot: params.metricsSnapshot ?? null,
      createdBy: null,
      expiresAt: this.buildExpiresAt(params.ttlHours ?? 1),
      appliedAt: null,
      revokedAt: null,
    });

    const saved = await this.trafficBlockRepository.save(block);
    this.clearBlockTargetCache();
    this.logger.warn(
      `Created automatic temporary traffic block target=${target} reason=${params.reason}`,
    );
    return saved;
  }

  async ignoreCandidate(
    dto: IgnoreTrafficCandidateDto,
    adminUserId: string,
  ): Promise<TrafficBlock> {
    await this.expireElapsedBlocks();
    const targetType = this.resolveTargetType(dto.target);
    const target = this.normalizeTarget(dto.target, targetType);
    const scope = dto.scope ?? TrafficBlockScope.PRODUCT_PATHS;

    const existing = await this.findCurrentBlock(target, scope, [
      TrafficBlockStatus.PENDING_SYNC,
      TrafficBlockStatus.ACTIVE,
      TrafficBlockStatus.IGNORED,
    ]);
    if (existing) {
      throw new ConflictException('该目标已有待处理记录');
    }

    const block = this.trafficBlockRepository.create({
      target,
      targetType,
      scope,
      status: TrafficBlockStatus.IGNORED,
      reason: dto.reason ?? null,
      metricsSnapshot: dto.metricsSnapshot ?? null,
      createdBy: adminUserId,
      expiresAt: this.buildExpiresAt(dto.ttlHours ?? 6),
      appliedAt: null,
      revokedAt: null,
    });

    const saved = await this.trafficBlockRepository.save(block);
    this.clearBlockTargetCache();
    return saved;
  }

  async expireBlock(id: string, adminUserId: string): Promise<TrafficBlock> {
    const block = await this.trafficBlockRepository.findOne({ where: { id } });
    if (!block) {
      throw new NotFoundException('封禁记录不存在');
    }
    if (block.status === TrafficBlockStatus.EXPIRED) {
      return block;
    }

    block.status = TrafficBlockStatus.EXPIRED;
    block.revokedAt = new Date();
    block.reason = block.reason
      ? `${block.reason}; revoked_by=${adminUserId}`
      : `revoked_by=${adminUserId}`;
    const saved = await this.trafficBlockRepository.save(block);
    this.clearBlockTargetCache();
    return saved;
  }

  private async getCurrentProductPathBlockTargets(): Promise<Set<string>> {
    const nowMs = Date.now();
    if (this.blockTargetCache && this.blockTargetCache.expiresAt > nowMs) {
      return this.blockTargetCache.targets;
    }

    await this.expireElapsedBlocks();
    const rows: Pick<TrafficBlock, 'target'>[] =
      await this.trafficBlockRepository
        .createQueryBuilder('block')
        .select('block.target', 'target')
        .where('block.scope = :scope', {
          scope: TrafficBlockScope.PRODUCT_PATHS,
        })
        .andWhere('block.status IN (:...statuses)', {
          statuses: [
            TrafficBlockStatus.PENDING_SYNC,
            TrafficBlockStatus.ACTIVE,
          ],
        })
        .andWhere('(block.expiresAt IS NULL OR block.expiresAt > :now)', {
          now: new Date(),
        })
        .getRawMany();

    const targets = new Set(rows.map((row) => row.target));
    this.blockTargetCache = {
      expiresAt: nowMs + this.blockTargetCacheTtlMs,
      targets,
    };
    return targets;
  }

  private clearBlockTargetCache(): void {
    this.blockTargetCache = null;
  }

  private mapCandidate(row: NetworkSummaryRow): TrafficDefenseCandidate | null {
    const sessions = this.toInt(row.sessions);
    const ips = this.toInt(row.ips);
    const devices = this.toInt(row.devices);
    const countries = this.toInt(row.countries);
    const directSessions = this.toInt(row.directSessions);
    const productLandings = this.toInt(row.productLandings);
    const risk = this.riskLabel({
      sessions,
      ips,
      devices,
      directSessions,
      productLandings,
    });

    if (!risk) {
      return null;
    }

    const targetType = row.network.endsWith('/24')
      ? TrafficBlockTargetType.IPV4_CIDR
      : TrafficBlockTargetType.IPV4;

    return {
      target: row.network,
      targetType,
      scope: TrafficBlockScope.PRODUCT_PATHS,
      sessions,
      ips,
      devices,
      directSessions,
      productLandings,
      directPct: sessions > 0 ? directSessions / sessions : 0,
      productLandingPct: sessions > 0 ? productLandings / sessions : 0,
      risk,
      sampleIp: row.sampleIp,
      topCountry: row.topCountry,
      countries,
      firstSeen: row.firstSeen,
      lastSeen: row.lastSeen,
      topLandingPage: row.topLandingPage,
      existingBlock: null,
    };
  }

  private riskLabel(row: {
    sessions: number;
    ips: number;
    devices: number;
    directSessions: number;
    productLandings: number;
  }): TrafficDefenseCandidate['risk'] | '' {
    const directProductHeavy =
      row.productLandings >= 30 &&
      row.directSessions >= Math.max(30, Math.floor(row.sessions * 0.7));
    const rotatingDevices = row.devices >= 30;
    const rotatingIps = row.ips >= 8;

    if (directProductHeavy && rotatingDevices && rotatingIps) {
      return 'high_proxy_pool';
    }

    if (directProductHeavy && rotatingDevices) {
      return 'direct_product_rotation';
    }

    if (rotatingDevices || rotatingIps) {
      return 'watch';
    }

    return '';
  }

  private async findCurrentBlock(
    target: string,
    scope: TrafficBlockScope,
    statuses: TrafficBlockStatus[],
  ): Promise<TrafficBlock | null> {
    return this.trafficBlockRepository
      .createQueryBuilder('block')
      .where('block.target = :target', { target })
      .andWhere('block.scope = :scope', { scope })
      .andWhere('block.status IN (:...statuses)', { statuses })
      .andWhere('(block.expiresAt IS NULL OR block.expiresAt > :now)', {
        now: new Date(),
      })
      .orderBy('block.createdAt', 'DESC')
      .getOne();
  }

  private async expireElapsedBlocks(): Promise<void> {
    const result = await this.trafficBlockRepository
      .createQueryBuilder()
      .update(TrafficBlock)
      .set({ status: TrafficBlockStatus.EXPIRED, revokedAt: new Date() })
      .where('status IN (:...statuses)', {
        statuses: [
          TrafficBlockStatus.PENDING_SYNC,
          TrafficBlockStatus.ACTIVE,
          TrafficBlockStatus.IGNORED,
        ],
      })
      .andWhere('expiresAt IS NOT NULL')
      .andWhere('expiresAt <= :now', { now: new Date() })
      .execute();

    if (result.affected) {
      this.clearBlockTargetCache();
    }
  }

  private buildExpiresAt(ttlHours: number): Date {
    return new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  }

  private toInt(value: string | number): number {
    return parseInt(String(value ?? 0), 10) || 0;
  }

  private resolveTargetType(target: string): TrafficBlockTargetType {
    const normalized = target.trim();
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) {
      this.assertIpv4Octets(normalized);
      return TrafficBlockTargetType.IPV4;
    }
    if (/^\d{1,3}(\.\d{1,3}){3}\/24$/.test(normalized)) {
      const ip = normalized.slice(0, -3);
      this.assertIpv4Octets(ip);
      if (!ip.endsWith('.0')) {
        throw new BadRequestException(
          '仅允许标准 IPv4 /24 网段，例如 1.2.3.0/24',
        );
      }
      return TrafficBlockTargetType.IPV4_CIDR;
    }
    throw new BadRequestException('仅允许 IPv4 或 IPv4 /24 目标');
  }

  private normalizeTarget(
    target: string,
    targetType: TrafficBlockTargetType,
  ): string {
    const normalized = target.trim();
    if (targetType === TrafficBlockTargetType.IPV4) {
      return normalized;
    }
    const [a, b, c] = normalized.replace('/24', '').split('.');
    return `${a}.${b}.${c}.0/24`;
  }

  private isProductLandingPage(landingPage?: string): boolean {
    return /^\/(?:[a-z]{2}\/)?products\/[^/?#]+/.test(landingPage || '');
  }

  private normalizeIncomingIpv4(ip: string): string | null {
    const normalized = ip.trim();
    const ipv4 = normalized.startsWith('::ffff:')
      ? normalized.slice('::ffff:'.length)
      : normalized;
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ipv4)) {
      return null;
    }

    const octets = ipv4.split('.').map((part) => Number(part));
    if (octets.some((part) => part < 0 || part > 255)) {
      return null;
    }

    return ipv4;
  }

  private getIpv4NetworkTarget(ip: string): string {
    return `${ip.split('.').slice(0, 3).join('.')}.0/24`;
  }

  private assertIpv4Octets(ip: string): void {
    const octets = ip.split('.').map((part) => Number(part));
    if (octets.length !== 4 || octets.some((part) => part < 0 || part > 255)) {
      throw new BadRequestException('IPv4 地址格式无效');
    }
  }
}
