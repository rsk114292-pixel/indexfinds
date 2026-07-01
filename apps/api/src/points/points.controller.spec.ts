import { PointsController } from './points.controller';
import { PointTransactionType } from './entities/point-transaction.entity';
import { DAILY_REWARDS, POINT_REWARDS } from './points.constants';

describe('PointsController', () => {
  const pointsService = {
    addPoints: jest.fn(),
    getShareRewardStatus: jest.fn(),
  };
  const redis = {
    set: jest.fn(),
  };

  let controller: PointsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PointsController(pointsService as any, redis as any);
  });

  it('awards points for an eligible share channel', async () => {
    redis.set.mockResolvedValue('OK');
    pointsService.addPoints.mockResolvedValue({ id: 'tx-1' });

    const result = await controller.trackShare(
      { user: { id: 'user-1' } },
      { channel: 'whatsapp', productId: 'product-1' },
    );

    expect(redis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^points:share:channel:user-1:whatsapp:/),
      '1',
      'EX',
      86400,
      'NX',
    );
    expect(pointsService.addPoints).toHaveBeenNthCalledWith(1, {
      userId: 'user-1',
      type: PointTransactionType.EARN,
      action: 'first_share',
      amount: POINT_REWARDS.FIRST_SHARE,
      referenceType: 'user',
      referenceId: 'user-1',
      description: 'First share bonus',
      metadata: { channel: 'whatsapp', productId: 'product-1' },
    });
    expect(pointsService.addPoints).toHaveBeenNthCalledWith(2, {
      userId: 'user-1',
      type: PointTransactionType.EARN,
      action: 'share_product',
      amount: DAILY_REWARDS.SHARE_PRODUCT,
      referenceType: 'share',
      referenceId: expect.stringMatching(/^share_\d{4}-\d{2}-\d{2}_whatsapp$/),
      description: 'Product share reward',
      metadata: { channel: 'whatsapp', productId: 'product-1' },
    });
    expect(result).toEqual({
      success: true,
      pointsEarned: DAILY_REWARDS.SHARE_PRODUCT,
    });
  });

  it('blocks duplicate rewards from the same channel on the same day', async () => {
    redis.set.mockResolvedValue(null);

    const result = await controller.trackShare(
      { user: { id: 'user-1' } },
      { channel: 'telegram' },
    );

    expect(pointsService.addPoints).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      reason: 'channel_already_rewarded',
    });
  });

  it('rejects non-rewardable share channels', async () => {
    const copyResult = await controller.trackShare(
      { user: { id: 'user-1' } },
      { channel: 'copy_link' },
    );
    const nativeResult = await controller.trackShare(
      { user: { id: 'user-1' } },
      { channel: 'native_share' },
    );

    expect(redis.set).not.toHaveBeenCalled();
    expect(pointsService.addPoints).not.toHaveBeenCalled();
    expect(copyResult).toEqual({
      success: false,
      reason: 'channel_not_eligible',
    });
    expect(nativeResult).toEqual({
      success: false,
      reason: 'channel_not_eligible',
    });
  });

  it('allows another eligible channel to earn on the same day', async () => {
    redis.set.mockResolvedValue('OK');
    pointsService.addPoints.mockResolvedValue({ id: 'tx-2' });

    const first = await controller.trackShare(
      { user: { id: 'user-1' } },
      { channel: 'reddit' },
    );
    const second = await controller.trackShare(
      { user: { id: 'user-1' } },
      { channel: 'email' },
    );

    expect(first).toEqual({
      success: true,
      pointsEarned: DAILY_REWARDS.SHARE_PRODUCT,
    });
    expect(second).toEqual({
      success: true,
      pointsEarned: DAILY_REWARDS.SHARE_PRODUCT,
    });
    expect(pointsService.addPoints).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        referenceId: expect.stringMatching(/^share_\d{4}-\d{2}-\d{2}_reddit$/),
        metadata: { channel: 'reddit', productId: null },
      }),
    );
    expect(pointsService.addPoints).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        referenceId: expect.stringMatching(/^share_\d{4}-\d{2}-\d{2}_email$/),
        metadata: { channel: 'email', productId: null },
      }),
    );
  });

  it('returns today share reward status', async () => {
    pointsService.getShareRewardStatus.mockResolvedValue({
      claimedChannels: ['whatsapp', 'telegram'],
      dailyCount: 2,
      dailyLimit: 8,
    });

    const result = await controller.getShareStatus({ user: { id: 'user-1' } });

    expect(pointsService.getShareRewardStatus).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({
      claimedChannels: ['whatsapp', 'telegram'],
      dailyCount: 2,
      dailyLimit: 8,
    });
  });
});
