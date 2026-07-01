import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let reflector: Reflector;

  const mockCategoriesService = {
    create: jest.fn().mockResolvedValue({ id: 'cat-1', name: 'Shoes' }),
    findAll: jest.fn().mockResolvedValue([]),
    findAllFlat: jest.fn().mockResolvedValue([]),
    getCategoryStats: jest.fn().mockResolvedValue(new Map()),
    findBySlug: jest.fn().mockResolvedValue({ id: 'cat-1', slug: 'shoes' }),
    getAllSlugs: jest.fn().mockResolvedValue({ slugs: ['shoes'] }),
    findAncestors: jest.fn().mockResolvedValue([]),
    findDescendants: jest.fn().mockResolvedValue([]),
    findDescendantsTree: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'cat-1' }),
    update: jest.fn().mockResolvedValue({ id: 'cat-1', name: 'Updated' }),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: CategoriesService, useValue: mockCategoriesService },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    reflector = new Reflector();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============ Guard 元数据验证 ============

  describe('AdminGuard on write endpoints', () => {
    it('create should have AdminGuard', () => {
      const guards = reflector.get(
        GUARDS_METADATA,
        CategoriesController.prototype.create,
      );
      expect(guards).toBeDefined();
      expect(guards).toContain(AdminGuard);
    });

    it('update should have AdminGuard', () => {
      const guards = reflector.get(
        GUARDS_METADATA,
        CategoriesController.prototype.update,
      );
      expect(guards).toBeDefined();
      expect(guards).toContain(AdminGuard);
    });

    it('remove should have AdminGuard', () => {
      const guards = reflector.get(
        GUARDS_METADATA,
        CategoriesController.prototype.remove,
      );
      expect(guards).toBeDefined();
      expect(guards).toContain(AdminGuard);
    });
  });

  describe('Public read endpoints should NOT have AdminGuard', () => {
    const publicMethods = [
      'findAll',
      'findAllTree',
      'findBySlug',
      'getAllSlugs',
      'findAncestors',
      'findDescendants',
      'findDescendantsTree',
      'findOne',
    ] as const;

    it.each(publicMethods)('%s should be marked @Public()', (method) => {
      const isPublic = reflector.get(
        IS_PUBLIC_KEY,
        CategoriesController.prototype[method],
      );
      expect(isPublic).toBe(true);
    });

    it.each(publicMethods)('%s should NOT have AdminGuard', (method) => {
      const guards = reflector.get(
        GUARDS_METADATA,
        CategoriesController.prototype[method],
      );
      const hasAdmin = guards && guards.includes(AdminGuard);
      expect(hasAdmin).toBeFalsy();
    });
  });

  // ============ 基本功能测试 ============

  describe('create', () => {
    it('should call service.create', async () => {
      const dto = { name: 'Shoes', slug: 'shoes' } as any;
      const result = await controller.create(dto);
      expect(mockCategoriesService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 'cat-1', name: 'Shoes' });
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { name: 'Updated' } as any;
      const result = await controller.update('cat-1', dto);
      expect(mockCategoriesService.update).toHaveBeenCalledWith('cat-1', dto);
      expect(result).toEqual({ id: 'cat-1', name: 'Updated' });
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      await controller.remove('cat-1');
      expect(mockCategoriesService.remove).toHaveBeenCalledWith('cat-1');
    });
  });
});
