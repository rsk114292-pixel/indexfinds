import { BadRequestException } from '@nestjs/common';
import { TrafficDefenseService } from './traffic-defense.service';
import {
  TrafficBlockScope,
  TrafficBlockStatus,
  TrafficBlockTargetType,
} from './entities/traffic-block.entity';

function createUpdateBuilder() {
  return {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  };
}

function createSelectBuilder(result: unknown) {
  return {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
    getOne: jest.fn().mockResolvedValue(result),
    getRawMany: jest.fn().mockResolvedValue(result),
  };
}

describe('TrafficDefenseService', () => {
  it('returns high-risk network candidates with existing block state', async () => {
    const visitSessionRepository = {
      query: jest.fn().mockResolvedValue([
        {
          network: '120.241.209.0/24',
          sampleIp: '120.241.209.130',
          topCountry: 'CN',
          countries: 1,
          sessions: 99,
          ips: 61,
          devices: 95,
          directSessions: 99,
          productLandings: 86,
          firstSeen: '2026-06-02 12:46:50+00',
          lastSeen: '2026-06-02 13:01:01+00',
          topLandingPage: '/de/products/example',
        },
      ]),
    };
    const existingBlock = {
      target: '120.241.209.0/24',
      status: TrafficBlockStatus.PENDING_SYNC,
    };
    const trafficBlockRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(createUpdateBuilder())
        .mockReturnValueOnce(createSelectBuilder([existingBlock])),
    };

    const service = new TrafficDefenseService(
      visitSessionRepository as any,
      trafficBlockRepository as any,
    );

    const candidates = await service.getCandidates({ minutes: 15, limit: 10 });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      target: '120.241.209.0/24',
      targetType: TrafficBlockTargetType.IPV4_CIDR,
      scope: TrafficBlockScope.PRODUCT_PATHS,
      sessions: 99,
      ips: 61,
      devices: 95,
      topCountry: 'CN',
      countries: 1,
      risk: 'high_proxy_pool',
      existingBlock,
    });
    expect(candidates[0].directPct).toBe(1);
  });

  it('creates pending-sync product-path blocks with a TTL', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-02T13:00:00.000Z'));

    try {
      const trafficBlockRepository = {
        createQueryBuilder: jest
          .fn()
          .mockReturnValueOnce(createUpdateBuilder())
          .mockReturnValueOnce(createSelectBuilder(null)),
        create: jest.fn((value) => value),
        save: jest.fn((value) => Promise.resolve({ id: 'block-1', ...value })),
      };
      const service = new TrafficDefenseService(
        {} as any,
        trafficBlockRepository as any,
      );

      const block = await service.createBlock(
        {
          target: '120.241.209.0/24',
          ttlHours: 6,
          reason: 'high_proxy_pool',
        },
        'admin-1',
      );

      expect(block).toMatchObject({
        id: 'block-1',
        target: '120.241.209.0/24',
        targetType: TrafficBlockTargetType.IPV4_CIDR,
        scope: TrafficBlockScope.PRODUCT_PATHS,
        status: TrafficBlockStatus.PENDING_SYNC,
        createdBy: 'admin-1',
      });
      expect(block.expiresAt).toEqual(new Date('2026-06-02T19:00:00.000Z'));
    } finally {
      jest.useRealTimers();
    }
  });

  it('returns single-IP candidates when one address rotates many devices', async () => {
    const visitSessionRepository = {
      query: jest.fn().mockResolvedValue([
        {
          network: '120.241.209.130',
          sampleIp: '120.241.209.130',
          topCountry: 'CN',
          countries: 1,
          sessions: 36,
          ips: 1,
          devices: 35,
          directSessions: 36,
          productLandings: 35,
          firstSeen: '2026-06-02 12:46:50+00',
          lastSeen: '2026-06-02 13:01:01+00',
          topLandingPage: '/de/products/example',
        },
      ]),
    };
    const trafficBlockRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(createUpdateBuilder())
        .mockReturnValueOnce(createSelectBuilder([])),
    };

    const service = new TrafficDefenseService(
      visitSessionRepository as any,
      trafficBlockRepository as any,
    );

    const candidates = await service.getCandidates({ minutes: 15, limit: 10 });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      target: '120.241.209.130',
      targetType: TrafficBlockTargetType.IPV4,
      risk: 'direct_product_rotation',
      ips: 1,
      devices: 35,
      topCountry: 'CN',
    });
  });

  it('creates one-hour automatic temporary blocks without an admin user', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-02T13:00:00.000Z'));

    try {
      const trafficBlockRepository = {
        createQueryBuilder: jest
          .fn()
          .mockReturnValueOnce(createUpdateBuilder())
          .mockReturnValueOnce(createSelectBuilder(null)),
        create: jest.fn((value) => value),
        save: jest.fn((value) =>
          Promise.resolve({ id: 'auto-block-1', ...value }),
        ),
      };
      const service = new TrafficDefenseService(
        {} as any,
        trafficBlockRepository as any,
      );

      const block = await service.createAutomaticTemporaryBlock({
        target: '120.241.209.0/24',
        reason: 'direct_product_network_rotation',
        metricsSnapshot: { devices: 25 },
      });

      expect(block).toMatchObject({
        id: 'auto-block-1',
        target: '120.241.209.0/24',
        status: TrafficBlockStatus.PENDING_SYNC,
        reason: 'auto:direct_product_network_rotation',
        createdBy: null,
        metricsSnapshot: { devices: 25 },
      });
      expect(block?.expiresAt).toEqual(new Date('2026-06-02T14:00:00.000Z'));
    } finally {
      jest.useRealTimers();
    }
  });

  it('treats pending-sync product-path blocks as API-layer blocked targets', async () => {
    const trafficBlockRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(createUpdateBuilder())
        .mockReturnValueOnce(
          createSelectBuilder([{ target: '120.241.209.0/24' }]),
        ),
    };
    const service = new TrafficDefenseService(
      {} as any,
      trafficBlockRepository as any,
    );

    await expect(
      service.shouldBlockProductPathVisit(
        '120.241.209.130',
        '/de/products/example',
      ),
    ).resolves.toBe(true);
    await expect(
      service.shouldBlockProductPathVisit('120.241.209.130', '/de/search'),
    ).resolves.toBe(false);
    expect(trafficBlockRepository.createQueryBuilder).toHaveBeenCalledTimes(2);
  });

  it('rejects non-/24 CIDR targets', async () => {
    const service = new TrafficDefenseService(
      {} as any,
      {
        createQueryBuilder: jest.fn().mockReturnValue(createUpdateBuilder()),
      } as any,
    );

    await expect(
      service.createBlock(
        {
          target: '120.241.209.0/16',
          ttlHours: 6,
        },
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
