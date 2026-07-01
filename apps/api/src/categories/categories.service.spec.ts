import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';

jest.mock('../scripts/category-seed-utils', () => ({
  loadCategorySeedData: jest.fn().mockResolvedValue([
    {
      name: '服装',
      slug: 'clothing',
      children: [
        {
          name: '上衣',
          slug: 'tops',
          children: [
            { name: '卫衣', slug: 'hoodie' },
            { name: 'T恤', slug: 't-shirt' },
          ],
        },
        {
          name: '套装',
          slug: 'sets',
          children: [
            { name: '西装套装', slug: 'suit-set' },
            { name: '运动套装', slug: 'tracksuit' },
            { name: '休闲套装', slug: 'casual-set' },
          ],
        },
      ],
    },
  ]),
  collectSeedSlugs: jest.fn((nodes: any[]) => {
    const slugs: string[] = [];
    const visit = (items: any[]) => {
      for (const item of items) {
        slugs.push(item.slug);
        if (item.children?.length) visit(item.children);
      }
    };
    visit(nodes);
    return slugs;
  }),
}));

describe('CategoriesService', () => {
  let service: CategoriesService;
  let cacheStore: Map<string, string>;

  const mockCategory = {
    id: 'cat-1',
    name: '运动鞋',
    slug: 'sneakers',
    level: 2,
    isActive: true,
    children: [],
  } as unknown as Category;

  // mock TreeRepository
  const mockTreeRepository = {
    findOne: jest.fn(),
    findDescendants: jest.fn(),
    remove: jest.fn(),
    save: jest.fn(),
    findTrees: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    query: jest.fn(),
    findAncestors: jest.fn(),
    findDescendantsTree: jest.fn(),
    manager: {
      getRepository: jest.fn(),
    },
  };

  const mockProductRepository = {
    count: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockTreeRepository,
        },
        {
          provide: 'ProductRepository',
          useValue: mockProductRepository,
        },
        {
          provide: CACHE_MANAGER,
          useFactory: () => {
            cacheStore = new Map([
              ['keyv:/categories', 'cached-tree'],
              ['keyv:/categories/slug/sneakers', 'cached-slug'],
              ['keyv:admin_dashboard_stats', 'cached-admin'],
            ]);
            return {
              stores: [{ store: cacheStore }],
              get: jest.fn((key: string) =>
                Promise.resolve(cacheStore.get(key)),
              ),
              set: jest.fn((key: string, value: string) => {
                cacheStore.set(key, value);
                return Promise.resolve();
              }),
            };
          },
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('update - 循环引用检测', () => {
    // A (level 0) → B (level 1) → C (level 2)
    const catA = {
      id: 'a',
      name: '服装',
      slug: 'clothing',
      level: 0,
    } as Category;
    const catB = { id: 'b', name: '上衣', slug: 'tops', level: 1 } as Category;
    const catC = {
      id: 'c',
      name: 'T恤',
      slug: 't-shirts',
      level: 2,
    } as Category;

    it('将分类移到自己的后代下时抛出 ConflictException', async () => {
      // 把 A 移到 C 下面 → A→B→C→A 循环
      mockTreeRepository.findOne
        .mockResolvedValueOnce(catA) // findOne(id) 获取当前分类
        .mockResolvedValueOnce(catC); // findOne(parentId) 获取目标父分类
      // A 的后代包含 B 和 C
      mockTreeRepository.findDescendants.mockResolvedValue([catA, catB, catC]);

      await expect(service.update('a', { parentId: 'c' })).rejects.toThrow(
        ConflictException,
      );
      expect(mockTreeRepository.save).not.toHaveBeenCalled();
    });

    it('合法移动不抛出异常', async () => {
      // 把 C 移到 A 下面（跳过 B）→ 合法
      mockTreeRepository.findOne
        .mockResolvedValueOnce(catC) // findOne(id)
        .mockResolvedValueOnce(catA); // findOne(parentId)
      // C 没有后代（只有自己）
      mockTreeRepository.findDescendants.mockResolvedValue([catC]);
      mockTreeRepository.save.mockResolvedValue({ ...catC, level: 1 });

      await service.update('c', { parentId: 'a' });
      expect(mockTreeRepository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('无子分类无商品关联时直接硬删除', async () => {
      mockTreeRepository.findOne.mockResolvedValue(mockCategory);
      // findDescendants 返回只包含自身 → 无子分类
      mockTreeRepository.findDescendants.mockResolvedValue([mockCategory]);
      mockTreeRepository.query.mockResolvedValue([{ count: '0' }]);
      mockTreeRepository.remove.mockResolvedValue(mockCategory);

      await service.remove('cat-1');

      // 应该调用 remove（硬删除），而不是 save（软删除）
      expect(mockTreeRepository.remove).toHaveBeenCalledWith(mockCategory);
      expect(mockTreeRepository.save).not.toHaveBeenCalled();
    });

    it('有子分类时抛出 ConflictException', async () => {
      const child = { id: 'cat-2', name: '跑步鞋' } as Category;
      mockTreeRepository.findOne.mockResolvedValue(mockCategory);
      mockTreeRepository.findDescendants.mockResolvedValue([
        mockCategory,
        child,
      ]);

      await expect(service.remove('cat-1')).rejects.toThrow(ConflictException);
      expect(mockTreeRepository.remove).not.toHaveBeenCalled();
    });

    it('有商品关联时抛出 ConflictException', async () => {
      mockTreeRepository.findOne.mockResolvedValue(mockCategory);
      mockTreeRepository.findDescendants.mockResolvedValue([mockCategory]);
      // 有 3 个商品使用该分类
      mockTreeRepository.query.mockResolvedValue([{ count: '3' }]);

      await expect(service.remove('cat-1')).rejects.toThrow(ConflictException);
      expect(mockTreeRepository.remove).not.toHaveBeenCalled();
    });

    it('分类不存在时抛出 NotFoundException', async () => {
      mockTreeRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('删除后清除缓存', async () => {
      mockTreeRepository.findOne.mockResolvedValue(mockCategory);
      mockTreeRepository.findDescendants.mockResolvedValue([mockCategory]);
      mockTreeRepository.query.mockResolvedValue([{ count: '0' }]);
      mockTreeRepository.remove.mockResolvedValue(mockCategory);

      // 先触发缓存加载
      await service.findAll();

      await service.remove('cat-1');

      // 验证缓存被清除：再次 findAll 应该重新查询
      mockTreeRepository.find.mockResolvedValue([]);
      await service.findAll();
      expect(mockTreeRepository.find).toHaveBeenCalledTimes(2);
    });

    it('删除后同时清除 Redis 缓存', async () => {
      mockTreeRepository.findOne.mockResolvedValue(mockCategory);
      mockTreeRepository.findDescendants.mockResolvedValue([mockCategory]);
      mockTreeRepository.query.mockResolvedValue([{ count: '0' }]);
      mockTreeRepository.remove.mockResolvedValue(mockCategory);

      expect(cacheStore.has('keyv:/categories')).toBe(true);
      expect(cacheStore.has('keyv:/categories/slug/sneakers')).toBe(true);

      await service.remove('cat-1');

      // 等待异步 Redis 清除完成
      await new Promise((r) => setTimeout(r, 10));

      // Redis 缓存应被清除
      expect(cacheStore.has('keyv:/categories')).toBe(false);
      expect(cacheStore.has('keyv:/categories/slug/sneakers')).toBe(false);
      // 不相关缓存保留
      expect(cacheStore.has('keyv:admin_dashboard_stats')).toBe(true);
    });

    it('外部 cache version 变化后会刷新内存分类树缓存', async () => {
      const cachedCategory = {
        id: 'cat-clothing',
        name: '旧服装',
        nameEn: 'Clothing',
        slug: 'clothing',
        level: 0,
        aliases: [],
        translations: null,
        coverImage: null,
        parent: null,
        isActive: true,
        sortOrder: 0,
        children: [],
      } as unknown as Category;
      const freshCategory = {
        id: 'cat-clothing',
        name: '新服装',
        nameEn: 'Clothing',
        slug: 'clothing',
        level: 0,
        aliases: [],
        translations: null,
        coverImage: null,
        parent: null,
        isActive: true,
        sortOrder: 0,
        children: [],
      } as unknown as Category;

      mockTreeRepository.find
        .mockResolvedValueOnce([cachedCategory])
        .mockResolvedValueOnce([freshCategory]);

      const first = await service.findAll();
      expect(first[0]?.name).toBe('旧服装');

      cacheStore.set('categories:cache-buster', 'external-refresh');

      const second = await service.findAll();
      expect(second[0]?.name).toBe('新服装');
      expect(mockTreeRepository.find).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCategoryStats', () => {
    it('should only derive heroImage from products that actually have a main image', async () => {
      mockTreeRepository.query.mockResolvedValue([
        {
          id: 'cat-1',
          productCount: 12,
          heroImage: 'https://img.example.com/hero.jpg',
        },
      ]);

      const result = await service.getCategoryStats();

      expect(result.get('cat-1')).toEqual({
        productCount: 12,
        heroImage: 'https://img.example.com/hero.jpg',
      });

      expect(mockTreeRepository.query).toHaveBeenCalledTimes(1);
      const sql = mockTreeRepository.query.mock.calls[0][0];
      expect(sql).toContain('p."mainImage" IS NOT NULL');
      expect(sql).toContain('p."mainImage" != \'\'');
    });

    it('should load stats for active child categories too', async () => {
      mockTreeRepository.query.mockResolvedValue([
        {
          id: 'child-cat',
          productCount: 3,
          heroImage: 'https://img.example.com/child.jpg',
        },
      ]);

      const result = await service.getCategoryStats();

      expect(result.get('child-cat')).toEqual({
        productCount: 3,
        heroImage: 'https://img.example.com/child.jpg',
      });

      const sql = mockTreeRepository.query.mock.calls[0][0];
      expect(sql).toContain('WHERE c."isActive" = true');
      expect(sql).not.toContain('c.level = 0');
    });

    it('should share concurrent category stats loads and reuse the short cache', async () => {
      let resolveQuery: (rows: unknown[]) => void = () => undefined;
      mockTreeRepository.query.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveQuery = resolve;
        }),
      );

      const first = service.getCategoryStats();
      const second = service.getCategoryStats();

      expect(mockTreeRepository.query).toHaveBeenCalledTimes(1);

      resolveQuery([
        {
          id: 'cat-1',
          productCount: 12,
          heroImage: 'https://img.example.com/hero.jpg',
        },
      ]);

      const [firstResult, secondResult] = await Promise.all([first, second]);
      expect(firstResult.get('cat-1')?.productCount).toBe(12);
      expect(secondResult.get('cat-1')?.heroImage).toBe(
        'https://img.example.com/hero.jpg',
      );

      const cached = await service.getCategoryStats();
      expect(cached.get('cat-1')?.productCount).toBe(12);
      expect(mockTreeRepository.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('leaf category enforcement', () => {
    it('findActiveLeafCategories should only return leaf nodes', async () => {
      mockTreeRepository.find.mockResolvedValue([
        {
          id: 'root',
          name: 'Clothing',
          nameEn: 'Clothing',
          slug: 'clothing',
          level: 0,
          aliases: [],
          translations: null,
          coverImage: null,
          parent: null,
          isActive: true,
          children: [],
        },
        {
          id: 'child',
          name: 'Tops',
          nameEn: 'Tops',
          slug: 'tops',
          level: 1,
          aliases: [],
          translations: null,
          coverImage: null,
          parent: { id: 'root' },
          isActive: true,
          children: [],
        },
        {
          id: 'leaf',
          name: 'T-Shirts',
          nameEn: 'T-Shirts',
          slug: 't-shirt',
          level: 2,
          aliases: [],
          translations: null,
          coverImage: null,
          parent: { id: 'child' },
          isActive: true,
          children: [],
        },
      ]);

      const result = await service.findActiveLeafCategories();

      expect(result).toEqual([{ name: 'T-Shirts', slug: 't-shirt' }]);
    });

    it('findActivePromptCategories should retain hierarchy metadata', async () => {
      mockTreeRepository.find.mockResolvedValue([
        {
          id: 'root',
          name: 'Clothing',
          slug: 'clothing',
          level: 0,
          parent: null,
        },
        {
          id: 'child',
          name: 'Tops',
          slug: 'tops',
          level: 1,
          parent: { id: 'root' },
        },
        {
          id: 'leaf',
          name: 'T-Shirts',
          slug: 't-shirt',
          level: 2,
          parent: { id: 'child' },
        },
      ]);

      const result = await service.findActivePromptCategories();

      expect(result).toEqual([
        {
          id: 'root',
          name: 'Clothing',
          slug: 'clothing',
          level: 0,
          parent: null,
        },
        {
          id: 'child',
          name: 'Tops',
          slug: 'tops',
          level: 1,
          parent: { id: 'root' },
        },
        {
          id: 'leaf',
          name: 'T-Shirts',
          slug: 't-shirt',
          level: 2,
          parent: { id: 'child' },
        },
      ]);
    });

    it('findAll should rebuild tree from flat parent relations', async () => {
      mockTreeRepository.find.mockResolvedValue([
        {
          id: 'root',
          name: 'Clothing',
          slug: 'clothing',
          level: 0,
          sortOrder: 0,
          isActive: true,
          parent: null,
        },
        {
          id: 'child',
          name: 'Tops',
          slug: 'tops',
          level: 1,
          sortOrder: 0,
          isActive: true,
          parent: { id: 'root' },
        },
        {
          id: 'leaf',
          name: 'T-Shirts',
          slug: 't-shirt',
          level: 2,
          sortOrder: 0,
          isActive: true,
          parent: { id: 'child' },
        },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('clothing');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].slug).toBe('tops');
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].slug).toBe('t-shirt');
    });

    it('ensureLeafCategory should return category for leaf node', async () => {
      mockTreeRepository.findOne.mockResolvedValue({
        id: 'leaf',
        name: 'T-Shirts',
        slug: 't-shirts',
      });
      mockTreeRepository.query.mockResolvedValue([]);

      const result = await service.ensureLeafCategory('leaf');

      expect(result.slug).toBe('t-shirts');
    });

    it('ensureLeafCategory should reject non-leaf category', async () => {
      mockTreeRepository.findOne.mockResolvedValue({
        id: 'parent',
        name: 'Tops',
        slug: 'tops',
      });
      mockTreeRepository.query.mockResolvedValue([{ id: 'child' }]);

      await expect(service.ensureLeafCategory('parent')).rejects.toThrow(
        ConflictException,
      );
    });

    it('ensureCanonicalLeafCategory should reject legacy leaf category', async () => {
      mockTreeRepository.findOne.mockResolvedValue({
        id: 'legacy-leaf',
        name: 'Hoodies',
        slug: 'hoodies',
        isActive: true,
      });
      mockTreeRepository.query.mockResolvedValue([]);

      await expect(
        service.ensureCanonicalLeafCategory('legacy-leaf'),
      ).rejects.toThrow(ConflictException);
    });

    it('findCategoryIdByAiSlug should prefer canonical alias over legacy slug', async () => {
      mockTreeRepository.find.mockResolvedValue([
        {
          id: 'legacy-hoodies',
          name: 'Hoodies',
          slug: 'hoodies',
          aliases: [],
          isActive: true,
        },
        {
          id: 'canonical-hoodie',
          name: '卫衣',
          nameEn: 'Hoodie',
          slug: 'hoodie',
          aliases: ['hoodies'],
          isActive: true,
        },
      ]);

      const result = await service.findCategoryIdByAiSlug('hoodies');

      expect(result).toBe('canonical-hoodie');
    });

    it('findCategoryMatchByAiSlug should expose fuzzy match metadata', async () => {
      mockTreeRepository.find.mockResolvedValue([
        {
          id: 'cat-1',
          name: '卫衣',
          slug: 'hoodie',
          aliases: [],
          level: 2,
          isActive: true,
        },
      ]);

      const result =
        await service.findCategoryMatchByAiSlug('oversized-hoodie');

      expect(result).toEqual({
        categoryId: 'cat-1',
        categorySlug: 'hoodie',
        matchType: 'fuzzy',
        score: 9,
        runnerUpScore: null,
        resolvedByContext: false,
      });
    });

    it('findCanonicalLeafMatchForAiInput should resolve sets to casual-set by title context', async () => {
      mockTreeRepository.find.mockResolvedValue([
        {
          id: 'sets',
          name: '套装',
          nameEn: 'Sets',
          slug: 'sets',
          aliases: ['set'],
          level: 2,
          isActive: true,
        },
        {
          id: 'casual-set',
          name: '休闲套装',
          nameEn: 'Casual Set',
          slug: 'casual-set',
          aliases: ['日常套装', 'lounge set'],
          level: 3,
          isActive: true,
          parent: { id: 'sets' },
        },
        {
          id: 'tracksuit',
          name: '运动套装',
          nameEn: 'Tracksuit',
          slug: 'tracksuit',
          aliases: ['track suit'],
          level: 3,
          isActive: true,
          parent: { id: 'sets' },
        },
      ]);
      mockTreeRepository.findOne.mockResolvedValue({
        id: 'sets',
        name: '套装',
        slug: 'sets',
        isActive: true,
      });
      mockTreeRepository.query.mockResolvedValue([{ id: 'child-1' }]);
      mockTreeRepository.findDescendantsTree.mockResolvedValue({
        id: 'sets',
        name: '套装',
        slug: 'sets',
        isActive: true,
        children: [
          {
            id: 'tracksuit',
            name: '运动套装',
            nameEn: 'Tracksuit',
            slug: 'tracksuit',
            aliases: ['track suit'],
            level: 3,
            sortOrder: 2,
            isActive: true,
            children: [],
          },
          {
            id: 'casual-set',
            name: '休闲套装',
            nameEn: 'Casual Set',
            slug: 'casual-set',
            aliases: ['日常套装', 'lounge set'],
            level: 3,
            sortOrder: 3,
            isActive: true,
            children: [],
          },
        ],
      });

      const result = await service.findCanonicalLeafMatchForAiInput({
        slug: 'sets',
        contextText: 'Philipp Plein Logo Print Black Casual Set',
      });

      expect(result).toEqual({
        categoryId: 'casual-set',
        categorySlug: 'casual-set',
        matchType: 'exact_alias_or_name',
        score: 260,
        runnerUpScore: 0,
        resolvedByContext: true,
      });
    });

    it('findCanonicalLeafMatchForAiInput should resolve sets to tracksuit by title context', async () => {
      mockTreeRepository.find.mockResolvedValue([
        {
          id: 'sets',
          name: '套装',
          nameEn: 'Sets',
          slug: 'sets',
          aliases: ['set'],
          level: 2,
          isActive: true,
        },
        {
          id: 'casual-set',
          name: '休闲套装',
          nameEn: 'Casual Set',
          slug: 'casual-set',
          aliases: ['日常套装'],
          level: 3,
          isActive: true,
          parent: { id: 'sets' },
        },
        {
          id: 'tracksuit',
          name: '运动套装',
          nameEn: 'Tracksuit',
          slug: 'tracksuit',
          aliases: ['track suit', 'sport set'],
          level: 3,
          isActive: true,
          parent: { id: 'sets' },
        },
      ]);
      mockTreeRepository.findOne.mockResolvedValue({
        id: 'sets',
        name: '套装',
        slug: 'sets',
        isActive: true,
      });
      mockTreeRepository.query.mockResolvedValue([{ id: 'child-1' }]);
      mockTreeRepository.findDescendantsTree.mockResolvedValue({
        id: 'sets',
        name: '套装',
        slug: 'sets',
        isActive: true,
        children: [
          {
            id: 'tracksuit',
            name: '运动套装',
            nameEn: 'Tracksuit',
            slug: 'tracksuit',
            aliases: ['track suit', 'sport set'],
            level: 3,
            sortOrder: 2,
            isActive: true,
            children: [],
          },
          {
            id: 'casual-set',
            name: '休闲套装',
            nameEn: 'Casual Set',
            slug: 'casual-set',
            aliases: ['日常套装'],
            level: 3,
            sortOrder: 3,
            isActive: true,
            children: [],
          },
        ],
      });

      const result = await service.findCanonicalLeafMatchForAiInput({
        slug: 'sets',
        contextText: 'Palm Angels Track Suit Black',
      });

      expect(result).toEqual({
        categoryId: 'tracksuit',
        categorySlug: 'tracksuit',
        matchType: 'exact_alias_or_name',
        score: 260,
        runnerUpScore: 0,
        resolvedByContext: true,
      });
    });

    it('findCanonicalLeafMatchForAiInput should expose high-confidence fuzzy metadata for set titles', async () => {
      mockTreeRepository.find.mockResolvedValue([
        {
          id: 'sets',
          name: '套装',
          nameEn: 'Sets',
          slug: 'sets',
          aliases: ['set'],
          level: 2,
          isActive: true,
        },
        {
          id: 'casual-set',
          name: '休闲套装',
          nameEn: 'Casual Set',
          slug: 'casual-set',
          aliases: ['日常套装'],
          level: 3,
          isActive: true,
          parent: { id: 'sets' },
        },
        {
          id: 'tracksuit',
          name: '运动套装',
          nameEn: 'Tracksuit',
          slug: 'tracksuit',
          aliases: ['track suit'],
          level: 3,
          isActive: true,
          parent: { id: 'sets' },
        },
      ]);
      mockTreeRepository.findOne.mockResolvedValue({
        id: 'sets',
        name: '套装',
        slug: 'sets',
        isActive: true,
      });
      mockTreeRepository.query.mockResolvedValue([{ id: 'child-1' }]);
      mockTreeRepository.findDescendantsTree.mockResolvedValue({
        id: 'sets',
        name: '套装',
        slug: 'sets',
        isActive: true,
        children: [
          {
            id: 'tracksuit',
            name: '运动套装',
            nameEn: 'Tracksuit',
            slug: 'tracksuit',
            aliases: ['track suit'],
            level: 3,
            sortOrder: 2,
            isActive: true,
            children: [],
          },
          {
            id: 'casual-set',
            name: '休闲套装',
            nameEn: 'Casual Set',
            slug: 'casual-set',
            aliases: ['日常套装'],
            level: 3,
            sortOrder: 3,
            isActive: true,
            children: [],
          },
        ],
      });

      const result = await service.findCanonicalLeafMatchForAiInput({
        slug: 'sets',
        contextText: 'Gucci Polo and Shorts Set Black',
      });

      expect(result).toEqual({
        categoryId: 'casual-set',
        categorySlug: 'casual-set',
        matchType: 'fuzzy',
        score: 210,
        runnerUpScore: 0,
        resolvedByContext: true,
      });
    });
  });
});
