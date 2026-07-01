import { AdminTrafficController } from './admin-traffic.controller';

describe('AdminTrafficController', () => {
  let controller: AdminTrafficController;
  let visitSessionService: {
    getOverview: jest.Mock;
  };
  let trafficDefenseService: {
    getCandidates: jest.Mock;
    getBlocks: jest.Mock;
    createBlock: jest.Mock;
    ignoreCandidate: jest.Mock;
    expireBlock: jest.Mock;
  };

  beforeEach(() => {
    visitSessionService = {
      getOverview: jest.fn().mockResolvedValue({}),
    };
    trafficDefenseService = {
      getCandidates: jest.fn().mockResolvedValue([]),
      getBlocks: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createBlock: jest.fn().mockResolvedValue({}),
      ignoreCandidate: jest.fn().mockResolvedValue({}),
      expireBlock: jest.fn().mockResolvedValue({}),
    };

    controller = new AdminTrafficController(
      visitSessionService as any,
      trafficDefenseService as any,
    );
  });

  it('defaults traffic analytics to today when no date range is provided', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-20T10:30:00.000Z'));

    try {
      await controller.getOverview();

      const [start, end, scope] = visitSessionService.getOverview.mock.calls[0];
      expect(start).toBeInstanceOf(Date);
      expect(end).toBeInstanceOf(Date);
      expect(scope).toEqual({ scope: 'customer' });
      expect(start.toDateString()).toBe(end.toDateString());
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('passes raw scope to traffic service', async () => {
    await controller.getOverview(
      '2026-05-20T00:00:00.000Z',
      '2026-05-20T23:59:59.999Z',
      'raw',
    );

    expect(visitSessionService.getOverview).toHaveBeenCalledWith(
      new Date('2026-05-20T00:00:00.000Z'),
      new Date('2026-05-20T23:59:59.999Z'),
      { scope: 'raw' },
    );
  });

  it('creates traffic defense blocks with the authenticated admin id', async () => {
    const dto = {
      target: '120.241.209.0/24',
      ttlHours: 6,
      reason: 'high_proxy_pool',
    };

    await controller.createDefenseBlock(
      { user: { id: 'admin-1' } } as any,
      dto as any,
    );

    expect(trafficDefenseService.createBlock).toHaveBeenCalledWith(
      dto,
      'admin-1',
    );
  });

  it('passes candidate query to traffic defense service', async () => {
    await controller.getDefenseCandidates({ minutes: 15, limit: 10 });

    expect(trafficDefenseService.getCandidates).toHaveBeenCalledWith({
      minutes: 15,
      limit: 10,
    });
  });
});
