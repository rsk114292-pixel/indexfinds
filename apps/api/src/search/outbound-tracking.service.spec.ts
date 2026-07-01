import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OutboundTrackingService } from './outbound-tracking.service';
import { OutboundClick } from './entities/outbound-click.entity';
import { SearchClick } from './entities/search-click.entity';
import { ProductQueryFacadeService } from '../products/product-query-facade.service';
import { AnalyticsDedupService } from '../shared/services/analytics-dedup.service';
import { VisitSessionService } from '../visit-tracking/visit-session.service';

describe('OutboundTrackingService', () => {
  let service: OutboundTrackingService;
  let outboundClickRepository: {
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder?: jest.Mock;
  };
  let analyticsDedupService: {
    claim: jest.Mock;
  };
  let visitSessionService: {
    resolveActiveVisitIdentity: jest.Mock;
    touchVisitActivity: jest.Mock;
  };
  let eventEmitter: {
    emit: jest.Mock;
  };

  beforeEach(async () => {
    outboundClickRepository = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => ({
        id: 'outbound-1',
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        ...entity,
      })),
    };
    analyticsDedupService = {
      claim: jest.fn().mockResolvedValue(true),
    };
    visitSessionService = {
      resolveActiveVisitIdentity: jest.fn(),
      touchVisitActivity: jest.fn().mockResolvedValue(undefined),
    };
    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboundTrackingService,
        {
          provide: getRepositoryToken(OutboundClick),
          useValue: outboundClickRepository,
        },
        {
          provide: getRepositoryToken(SearchClick),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: ProductQueryFacadeService,
          useValue: {},
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
        {
          provide: AnalyticsDedupService,
          useValue: analyticsDedupService,
        },
        {
          provide: VisitSessionService,
          useValue: visitSessionService,
        },
      ],
    }).compile();

    service = module.get<OutboundTrackingService>(OutboundTrackingService);
  });

  it('writes outbound clicks with server-resolved visit identity', async () => {
    visitSessionService.resolveActiveVisitIdentity.mockResolvedValue({
      id: 'visit-session-1',
      sessionId: 'sess_server',
      deviceId: 'vid_server',
      visitId: 'visit_server',
    });

    await service.recordOutboundClick(
      {
        productId: '11111111-1111-4111-8111-111111111111',
        platformType: 'weidian',
        sessionId: 'sess_client',
        deviceId: 'sess_client',
        visitId: 'visit_client',
        pagePath: '/en/products/test',
      },
      {
        trustedVisitorId: 'vid_server',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      },
    );

    expect(outboundClickRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'sess_server',
        deviceId: 'vid_server',
        visitId: 'visit_server',
      }),
    );
    expect(visitSessionService.touchVisitActivity).toHaveBeenCalledWith(
      'visit-session-1',
      new Date('2026-04-01T00:00:00.000Z'),
    );
  });

  it('falls back to request identifiers when no active visit session exists', async () => {
    visitSessionService.resolveActiveVisitIdentity.mockResolvedValue(null);

    await service.recordOutboundClick(
      {
        productId: '11111111-1111-4111-8111-111111111111',
        platformType: 'weidian',
        sessionId: 'sess_client',
        deviceId: 'sess_client',
        visitId: 'visit_client',
      },
      {
        trustedVisitorId: 'vid_server',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      },
    );

    expect(outboundClickRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'sess_client',
        deviceId: 'vid_server',
        visitId: undefined,
      }),
    );
    expect(visitSessionService.touchVisitActivity).not.toHaveBeenCalled();
  });

  it('excludes internal and admin outbound clicks from admin analytics by default', async () => {
    const andWhere = jest.fn().mockReturnThis();
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere,
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        rawCount: '0',
        dedupedCount: '0',
        productIntentCount: '0',
        platformSelectionCount: '0',
      }),
    };
    outboundClickRepository.createQueryBuilder = jest
      .fn()
      .mockReturnValue(queryBuilder);

    await service.getClickOverview(
      new Date('2026-05-20T00:00:00.000Z'),
      new Date('2026-05-20T23:59:59.999Z'),
    );

    expect(andWhere).toHaveBeenCalledWith(
      expect.stringContaining("internal_user.role IN ('admin', 'super_admin')"),
    );
    expect(andWhere).toHaveBeenCalledWith(
      expect.stringContaining('FROM visit_sessions internal_visit'),
    );
    expect(andWhere).toHaveBeenCalledWith(
      expect.stringContaining("internal_visit.channel_type = 'internal'"),
    );
    expect(andWhere).toHaveBeenCalledWith(
      expect.stringContaining("visit_user.role IN ('admin', 'super_admin')"),
    );
  });

  it('keeps admin outbound clicks when raw analytics scope is requested', async () => {
    const andWhere = jest.fn().mockReturnThis();
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere,
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        rawCount: '0',
        dedupedCount: '0',
        productIntentCount: '0',
        platformSelectionCount: '0',
      }),
      getRawMany: jest.fn().mockResolvedValue([]),
      getMany: jest.fn().mockResolvedValue([]),
      having: jest.fn().mockReturnThis(),
    };
    outboundClickRepository.createQueryBuilder = jest
      .fn()
      .mockReturnValue(queryBuilder);

    await (service as any).getClickCountSummary(
      new Date('2026-05-20T00:00:00.000Z'),
      new Date('2026-05-20T23:59:59.999Z'),
      { includeInternal: true },
    );

    expect(andWhere).not.toHaveBeenCalledWith(
      expect.stringContaining("internal_user.role IN ('admin', 'super_admin')"),
    );
  });
});
