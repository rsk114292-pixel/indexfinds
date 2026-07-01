import { FavoritesService } from './favorites.service';

describe('FavoritesService - favoriteCount', () => {
  let service: FavoritesService;
  let favoritesRepo: {
    count: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let productsRepo: {
    findOne: jest.Mock;
    increment: jest.Mock;
    decrement: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let referralService: {
    triggerAttributionFromCookie: jest.Mock;
    checkAndFinalizeConversion: jest.Mock;
  };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(() => {
    const mockQb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    };

    favoritesRepo = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(),
      create: jest.fn().mockReturnValue({ id: 'fav-1' }),
      save: jest.fn().mockResolvedValue({ id: 'fav-1', createdAt: new Date() }),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    productsRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'prod-1', title: 'Test' }),
      increment: jest.fn().mockResolvedValue(undefined),
      decrement: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    };
    referralService = {
      triggerAttributionFromCookie: jest.fn(),
      checkAndFinalizeConversion: jest.fn(),
    };
    eventEmitter = { emit: jest.fn() };

    service = new FavoritesService(
      favoritesRepo as any,
      productsRepo as any,
      referralService as any,
      eventEmitter as any,
    );
  });

  describe('addFavorite', () => {
    it('收藏成功后递增 favoriteCount', async () => {
      favoritesRepo.findOne.mockResolvedValue(null); // 未收藏

      await service.addFavorite('user-1', 'prod-1');

      expect(productsRepo.increment).toHaveBeenCalledWith(
        { id: 'prod-1' },
        'favoriteCount',
        1,
      );
    });
  });

  describe('removeFavorite', () => {
    it('取消收藏后递减 favoriteCount', async () => {
      favoritesRepo.findOne.mockResolvedValue({
        id: 'fav-1',
        user: { id: 'user-1' },
        product: { id: 'prod-1' },
      } as any);

      await service.removeFavorite('user-1', 'prod-1');

      expect(productsRepo.decrement).toHaveBeenCalledWith(
        { id: 'prod-1' },
        'favoriteCount',
        1,
      );
    });

    it('递减后执行下限保护（不低于 0）', async () => {
      favoritesRepo.findOne.mockResolvedValue({
        id: 'fav-1',
        user: { id: 'user-1' },
        product: { id: 'prod-1' },
      } as any);

      await service.removeFavorite('user-1', 'prod-1');

      expect(productsRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });
});
