import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ProductStatusService } from './product-status.service';
import { Product } from './entities/product.entity';
import { CategoriesService } from '../categories/categories.service';
import {
  ProductStatus,
  ProductStatusAction,
  getNextStatus,
  canPerformAction,
  getAvailableActions,
} from './product-status';

describe('ProductStatusService', () => {
  let service: ProductStatusService;
  let productRepo: jest.Mocked<Repository<Product>>;
  let categoriesService: { ensureCanonicalLeafCategory: jest.Mock };

  const mockProduct = (status: ProductStatus): Partial<Product> => ({
    id: 'test-product-id',
    title: 'Test Product',
    description: 'A valid AI generated product description.',
    primaryCategoryId: 'cat-1',
    priceMin: 10,
    priceMax: 20,
    mainImage: 'https://cdn.example.com/product.jpg',
    status,
    slug: 'test-product',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductStatusService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: CategoriesService,
          useValue: {
            ensureCanonicalLeafCategory: jest.fn().mockResolvedValue({
              id: 'cat-1',
              slug: 'hoodie',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ProductStatusService>(ProductStatusService);
    productRepo = module.get(getRepositoryToken(Product));
    categoriesService = module.get(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('状态流转规则 (getNextStatus)', () => {
    it('草稿 -> 提交审核 -> 待审核', () => {
      expect(
        getNextStatus(
          ProductStatus.DRAFT,
          ProductStatusAction.SUBMIT_FOR_REVIEW,
        ),
      ).toBe(ProductStatus.PENDING_REVIEW);
    });

    it('草稿 -> 直接发布 -> 已上架 (管理员)', () => {
      expect(
        getNextStatus(ProductStatus.DRAFT, ProductStatusAction.PUBLISH),
      ).toBe(ProductStatus.ACTIVE);
    });

    it('待审核 -> 审核通过 -> 已上架', () => {
      expect(
        getNextStatus(
          ProductStatus.PENDING_REVIEW,
          ProductStatusAction.APPROVE,
        ),
      ).toBe(ProductStatus.ACTIVE);
    });

    it('待审核 -> 审核拒绝 -> 草稿', () => {
      expect(
        getNextStatus(ProductStatus.PENDING_REVIEW, ProductStatusAction.REJECT),
      ).toBe(ProductStatus.DRAFT);
    });

    it('已上架 -> 下架 -> 已下架', () => {
      expect(
        getNextStatus(ProductStatus.ACTIVE, ProductStatusAction.UNPUBLISH),
      ).toBe(ProductStatus.INACTIVE);
    });

    it('已上架 -> 标记缺货 -> 缺货', () => {
      expect(
        getNextStatus(
          ProductStatus.ACTIVE,
          ProductStatusAction.MARK_OUT_OF_STOCK,
        ),
      ).toBe(ProductStatus.OUT_OF_STOCK);
    });

    it('缺货 -> 补货 -> 已上架', () => {
      expect(
        getNextStatus(ProductStatus.OUT_OF_STOCK, ProductStatusAction.RESTOCK),
      ).toBe(ProductStatus.ACTIVE);
    });

    it('已下架 -> 重新上架 -> 待审核', () => {
      expect(
        getNextStatus(ProductStatus.INACTIVE, ProductStatusAction.REPUBLISH),
      ).toBe(ProductStatus.PENDING_REVIEW);
    });

    it('无效的状态流转返回 null', () => {
      // 草稿不能直接下架
      expect(
        getNextStatus(ProductStatus.DRAFT, ProductStatusAction.UNPUBLISH),
      ).toBeNull();
      // 待审核不能下架
      expect(
        getNextStatus(
          ProductStatus.PENDING_REVIEW,
          ProductStatusAction.UNPUBLISH,
        ),
      ).toBeNull();
      // 已上架不能提交审核
      expect(
        getNextStatus(
          ProductStatus.ACTIVE,
          ProductStatusAction.SUBMIT_FOR_REVIEW,
        ),
      ).toBeNull();
    });
  });

  describe('canPerformAction', () => {
    it('返回 true 当动作有效时', () => {
      expect(
        canPerformAction(
          ProductStatus.DRAFT,
          ProductStatusAction.SUBMIT_FOR_REVIEW,
        ),
      ).toBe(true);
    });

    it('返回 false 当动作无效时', () => {
      expect(
        canPerformAction(ProductStatus.DRAFT, ProductStatusAction.UNPUBLISH),
      ).toBe(false);
    });
  });

  describe('getAvailableActions', () => {
    it('草稿状态可执行: 提交审核, 直接发布', () => {
      const actions = getAvailableActions(ProductStatus.DRAFT);
      expect(actions).toContain(ProductStatusAction.SUBMIT_FOR_REVIEW);
      expect(actions).toContain(ProductStatusAction.PUBLISH);
      expect(actions).toHaveLength(2);
    });

    it('待审核状态可执行: 审核通过, 审核拒绝', () => {
      const actions = getAvailableActions(ProductStatus.PENDING_REVIEW);
      expect(actions).toContain(ProductStatusAction.APPROVE);
      expect(actions).toContain(ProductStatusAction.REJECT);
      expect(actions).toHaveLength(2);
    });

    it('已上架状态可执行: 下架, 标记缺货', () => {
      const actions = getAvailableActions(ProductStatus.ACTIVE);
      expect(actions).toContain(ProductStatusAction.UNPUBLISH);
      expect(actions).toContain(ProductStatusAction.MARK_OUT_OF_STOCK);
      expect(actions).toHaveLength(2);
    });

    it('缺货状态可执行: 补货, 下架', () => {
      const actions = getAvailableActions(ProductStatus.OUT_OF_STOCK);
      expect(actions).toContain(ProductStatusAction.RESTOCK);
      expect(actions).toContain(ProductStatusAction.UNPUBLISH);
      expect(actions).toHaveLength(2);
    });

    it('未知状态返回空数组', () => {
      const actions = getAvailableActions('unknown_status');
      expect(actions).toEqual([]);
    });
  });

  describe('performStatusAction', () => {
    it('成功执行状态流转', async () => {
      const product = mockProduct(ProductStatus.DRAFT);
      productRepo.findOne.mockResolvedValue(product as Product);
      productRepo.save.mockResolvedValue({
        ...product,
        status: ProductStatus.PENDING_REVIEW,
      } as Product);

      const result = await service.performStatusAction(
        'test-product-id',
        ProductStatusAction.SUBMIT_FOR_REVIEW,
      );

      expect(result.status).toBe(ProductStatus.PENDING_REVIEW);
      expect(productRepo.save).toHaveBeenCalled();
      expect(
        categoriesService.ensureCanonicalLeafCategory,
      ).not.toHaveBeenCalled();
    });

    it('商品不存在时抛出 NotFoundException', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(
        service.performStatusAction(
          'non-existent-id',
          ProductStatusAction.APPROVE,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('无效状态流转时抛出 BadRequestException', async () => {
      const product = mockProduct(ProductStatus.DRAFT);
      productRepo.findOne.mockResolvedValue(product as Product);

      await expect(
        service.performStatusAction(
          'test-product-id',
          ProductStatusAction.UNPUBLISH,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('质量门槛失败时不允许审核上架', async () => {
      const product = {
        ...mockProduct(ProductStatus.PENDING_REVIEW),
        priceMin: 0,
      };
      productRepo.findOne.mockResolvedValue(product as Product);

      await expect(service.approveProduct('test-product-id')).rejects.toThrow(
        '商品未通过发布质量门槛',
      );
      expect(productRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('快捷方法', () => {
    beforeEach(() => {
      productRepo.save.mockImplementation((p) => Promise.resolve(p as Product));
    });

    it('submitForReview 提交审核', async () => {
      const product = mockProduct(ProductStatus.DRAFT);
      productRepo.findOne.mockResolvedValue(product as Product);

      await service.submitForReview('test-product-id');

      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.PENDING_REVIEW }),
      );
    });

    it('approveProduct 审核通过', async () => {
      const product = mockProduct(ProductStatus.PENDING_REVIEW);
      (product as any).primaryCategoryId = 'cat-1';
      productRepo.findOne.mockResolvedValue(product as Product);

      await service.approveProduct('test-product-id');

      expect(
        categoriesService.ensureCanonicalLeafCategory,
      ).toHaveBeenCalledWith('cat-1');
      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.ACTIVE }),
      );
    });

    it('人工审核允许父分类直接上架', async () => {
      const product = mockProduct(ProductStatus.PENDING_REVIEW);
      (product as any).primaryCategoryId = 'cat-parent';
      productRepo.findOne.mockResolvedValue(product as Product);

      await service.performStatusAction(
        'test-product-id',
        ProductStatusAction.APPROVE,
        { allowParentCategory: true },
      );

      expect(
        categoriesService.ensureCanonicalLeafCategory,
      ).not.toHaveBeenCalled();
      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.ACTIVE }),
      );
    });

    it('rejectProduct 审核拒绝', async () => {
      const product = mockProduct(ProductStatus.PENDING_REVIEW);
      productRepo.findOne.mockResolvedValue(product as Product);

      await service.rejectProduct('test-product-id');

      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.DRAFT }),
      );
    });

    it('unpublishProduct 下架', async () => {
      const product = mockProduct(ProductStatus.ACTIVE);
      productRepo.findOne.mockResolvedValue(product as Product);

      await service.unpublishProduct('test-product-id');

      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.INACTIVE }),
      );
    });

    it('markOutOfStock 标记缺货', async () => {
      const product = mockProduct(ProductStatus.ACTIVE);
      productRepo.findOne.mockResolvedValue(product as Product);

      await service.markOutOfStock('test-product-id');

      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.OUT_OF_STOCK }),
      );
    });

    it('restockProduct 补货', async () => {
      const product = mockProduct(ProductStatus.OUT_OF_STOCK);
      (product as any).primaryCategoryId = 'cat-1';
      productRepo.findOne.mockResolvedValue(product as Product);

      await service.restockProduct('test-product-id');

      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.ACTIVE }),
      );
    });

    it('should reject publishing non-leaf category product', async () => {
      const product = mockProduct(ProductStatus.PENDING_REVIEW);
      (product as any).primaryCategoryId = 'cat-parent';
      productRepo.findOne.mockResolvedValue(product as Product);
      categoriesService.ensureCanonicalLeafCategory.mockRejectedValue(
        new ConflictException('主分类必须是最深层子分类'),
      );

      await expect(service.approveProduct('test-product-id')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('batchUpdateStatus', () => {
    it('批量更新成功', async () => {
      const products = [
        mockProduct(ProductStatus.PENDING_REVIEW),
        mockProduct(ProductStatus.PENDING_REVIEW),
      ];

      productRepo.findOne
        .mockResolvedValueOnce({ ...products[0], id: 'id-1' } as Product)
        .mockResolvedValueOnce({ ...products[1], id: 'id-2' } as Product);
      productRepo.save.mockImplementation((p) => Promise.resolve(p as Product));

      const result = await service.batchUpdateStatus(
        ['id-1', 'id-2'],
        ProductStatusAction.APPROVE,
      );

      expect(result.success).toEqual(['id-1', 'id-2']);
      expect(result.failed).toEqual([]);
    });

    it('allowParentCategory=true 时批量审核允许父分类', async () => {
      productRepo.findOne
        .mockResolvedValueOnce({
          ...mockProduct(ProductStatus.PENDING_REVIEW),
          id: 'id-1',
          primaryCategoryId: 'cat-parent',
        } as Product)
        .mockResolvedValueOnce({
          ...mockProduct(ProductStatus.PENDING_REVIEW),
          id: 'id-2',
          primaryCategoryId: 'cat-parent',
        } as Product);
      productRepo.save.mockImplementation((p) => Promise.resolve(p as Product));

      const result = await service.batchUpdateStatus(
        ['id-1', 'id-2'],
        ProductStatusAction.APPROVE,
        { allowParentCategory: true },
      );

      expect(result.success).toEqual(['id-1', 'id-2']);
      expect(result.failed).toEqual([]);
      expect(
        categoriesService.ensureCanonicalLeafCategory,
      ).not.toHaveBeenCalled();
    });

    it('部分更新失败时返回失败列表', async () => {
      productRepo.findOne
        .mockResolvedValueOnce(
          mockProduct(ProductStatus.PENDING_REVIEW) as Product,
        )
        .mockResolvedValueOnce(mockProduct(ProductStatus.DRAFT) as Product); // 草稿不能直接 APPROVE
      productRepo.save.mockImplementation((p) => Promise.resolve(p as Product));

      const result = await service.batchUpdateStatus(
        ['id-1', 'id-2'],
        ProductStatusAction.APPROVE,
      );

      expect(result.success).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].id).toBe('id-2');
    });
  });

  describe('getAvailableStatusActions', () => {
    it('返回带标签的动作列表', () => {
      const actions = service.getAvailableStatusActions(ProductStatus.DRAFT);

      expect(actions).toEqual([
        { action: ProductStatusAction.SUBMIT_FOR_REVIEW, label: '提交审核' },
        { action: ProductStatusAction.PUBLISH, label: '直接发布' },
      ]);
    });
  });
});
