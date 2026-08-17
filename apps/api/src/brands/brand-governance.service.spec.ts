import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BrandGovernanceService } from './brand-governance.service';
import { Brand } from './entities/brand.entity';
import { BrandAlias } from './entities/brand-alias.entity';
import { BrandCandidate } from './entities/brand-candidate.entity';
import { BrandCandidateItem } from './entities/brand-candidate-item.entity';
import { BrandRelation } from './entities/brand-relation.entity';
import { ProductBrandFact } from './entities/product-brand-fact.entity';
import { Product } from '../products/entities/product.entity';
import { ProductStatus } from '../products/product-status';
import { BrandMatchService } from './brand-match.service';

describe('BrandGovernanceService', () => {
  let service: BrandGovernanceService;
  let brandRepository: any;
  let brandAliasRepository: any;
  let brandCandidateRepository: any;
  let brandCandidateItemRepository: any;
  let brandRelationRepository: any;
  let productBrandFactRepository: any;
  let productRepository: any;
  let brandMatchService: any;

  beforeEach(async () => {
    brandRepository = {
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => ({
        id: entity.id || 'brand-created',
        ...entity,
      })),
    };
    brandAliasRepository = {
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => entity),
    };
    brandCandidateRepository = {
      findOne: jest.fn(),
      save: jest.fn((entity) => entity),
    };
    brandCandidateItemRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };
    brandRelationRepository = {
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => entity),
    };
    productBrandFactRepository = {
      create: jest.fn((dto) => dto),
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((entities) => entities),
    };
    productRepository = {
      find: jest.fn(),
      update: jest.fn(() => ({ affected: 1 })),
    };
    brandMatchService = {
      findByNameOrAlias: jest.fn(),
      generateSlug: jest.fn((name: string) =>
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      ),
      generateCanonicalKey: jest.fn((name: string) =>
        name.toLowerCase().replace(/[^a-z0-9]+/g, ''),
      ),
      generateAliases: jest.fn((name: string) => [name]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandGovernanceService,
        { provide: getRepositoryToken(Brand), useValue: brandRepository },
        {
          provide: getRepositoryToken(BrandAlias),
          useValue: brandAliasRepository,
        },
        {
          provide: getRepositoryToken(BrandCandidate),
          useValue: brandCandidateRepository,
        },
        {
          provide: getRepositoryToken(BrandCandidateItem),
          useValue: brandCandidateItemRepository,
        },
        {
          provide: getRepositoryToken(BrandRelation),
          useValue: brandRelationRepository,
        },
        {
          provide: getRepositoryToken(ProductBrandFact),
          useValue: productBrandFactRepository,
        },
        { provide: getRepositoryToken(Product), useValue: productRepository },
        { provide: BrandMatchService, useValue: brandMatchService },
      ],
    }).compile();

    service = module.get<BrandGovernanceService>(BrandGovernanceService);
  });

  describe('resolveCandidate', () => {
    it('should bind products and auto-activate only eligible pending_review items', async () => {
      brandCandidateRepository.findOne.mockResolvedValue({
        id: 'candidate-1',
        rawBrandName: 'LENCIGA',
        reviewStatus: 'pending',
        notes: null,
      });
      brandRepository.findOne.mockResolvedValue({
        id: 'brand-1',
        name: 'Balenciaga',
      });
      brandAliasRepository.findOne.mockResolvedValue(null);
      brandCandidateItemRepository.find.mockResolvedValue([
        { productId: 'product-1' },
        { productId: 'product-2' },
      ]);
      productRepository.find.mockResolvedValue([
        {
          id: 'product-1',
          status: ProductStatus.PENDING_REVIEW,
          title: 'Balenciaga Hoodie',
          description: 'A complete AI generated product description.',
          slug: 'balenciaga-hoodie',
          primaryCategoryId: 'cat-1',
          priceMin: 100,
          priceMax: 120,
          mainImage: 'https://example.com/main.jpg',
          images: ['https://example.com/main.jpg'],
        },
        {
          id: 'product-2',
          status: ProductStatus.DRAFT,
          title: 'Needs more work',
          slug: 'needs-more-work',
          primaryCategoryId: 'cat-1',
          mainImage: 'https://example.com/draft.jpg',
          images: ['https://example.com/draft.jpg'],
        },
      ]);
      productBrandFactRepository.find.mockResolvedValue([
        { id: 'fact-1', candidateId: 'candidate-1' },
      ]);

      const result = await service.resolveCandidate('candidate-1', {
        action: 'bind_existing',
        brandId: 'brand-1',
      });

      const findCall = productRepository.find.mock.calls[0][0];
      expect(findCall.select).toEqual([
        'id',
        'status',
        'title',
        'originalTitle',
        'description',
        'originalDescription',
        'slug',
        'primaryCategoryId',
        'mainImage',
        'images',
        'priceMin',
        'priceMax',
        'aiBrandName',
        'potentialMixedProduct',
      ]);
      expect(findCall.where.id).toEqual(expect.any(Object));
      expect(productRepository.update).toHaveBeenNthCalledWith(
        1,
        ['product-2'],
        { brandId: 'brand-1' },
      );
      expect(productRepository.update).toHaveBeenNthCalledWith(
        2,
        ['product-1'],
        { brandId: 'brand-1', status: ProductStatus.ACTIVE },
      );
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          brandId: 'brand-1',
          updatedProducts: 2,
          activatedProducts: 1,
        }),
      );
    });

    it('should keep pending_review products pending when core listing fields are missing', async () => {
      brandCandidateRepository.findOne.mockResolvedValue({
        id: 'candidate-2',
        rawBrandName: 'Unknown Label',
        reviewStatus: 'pending',
        notes: null,
      });
      brandRepository.findOne.mockResolvedValue({
        id: 'brand-2',
        name: 'Known Brand',
      });
      brandAliasRepository.findOne.mockResolvedValue(null);
      brandCandidateItemRepository.find.mockResolvedValue([
        { productId: 'p-1' },
      ]);
      productRepository.find.mockResolvedValue([
        {
          id: 'p-1',
          status: ProductStatus.PENDING_REVIEW,
          title: 'Known Brand Tee',
          slug: 'known-brand-tee',
          primaryCategoryId: 'cat-1',
          mainImage: null,
          images: [],
        },
      ]);
      productBrandFactRepository.find.mockResolvedValue([]);

      const result = await service.resolveCandidate('candidate-2', {
        action: 'bind_existing',
        brandId: 'brand-2',
      });

      expect(productRepository.update).toHaveBeenCalledTimes(1);
      expect(productRepository.update).toHaveBeenCalledWith(['p-1'], {
        brandId: 'brand-2',
      });
      expect(result).toEqual(
        expect.objectContaining({
          updatedProducts: 1,
          activatedProducts: 0,
        }),
      );
    });

    it('should create a child brand, add relation, and bind candidate products', async () => {
      brandCandidateRepository.findOne.mockResolvedValue({
        id: 'candidate-child',
        rawBrandName: 'Nike SB',
        normalizedBrandName: 'nike sb',
        reviewStatus: 'pending',
        notes: 'Stable skate line',
      });
      brandRepository.findOne
        .mockResolvedValueOnce({ id: 'parent-1', name: 'Nike' })
        .mockResolvedValueOnce(null);
      brandMatchService.findByNameOrAlias.mockResolvedValue(null);
      brandAliasRepository.findOne.mockResolvedValue(null);
      brandRelationRepository.findOne.mockResolvedValue(null);
      brandCandidateItemRepository.find.mockResolvedValue([
        { productId: 'product-1' },
      ]);
      productRepository.find.mockResolvedValue([
        {
          id: 'product-1',
          status: ProductStatus.PENDING_REVIEW,
          title: 'Nike SB Dunk',
          description: 'A complete AI generated product description.',
          slug: 'nike-sb-dunk',
          primaryCategoryId: 'cat-1',
          priceMin: 100,
          priceMax: 120,
          mainImage: 'https://example.com/nike-sb.jpg',
          images: ['https://example.com/nike-sb.jpg'],
        },
      ]);
      productBrandFactRepository.find.mockResolvedValue([
        { id: 'fact-1', candidateId: 'candidate-child' },
      ]);
      brandRepository.save.mockResolvedValue({
        id: 'child-brand-1',
        name: 'Nike SB',
        parentId: 'parent-1',
      });

      const result = await service.resolveCandidate('candidate-child', {
        action: 'create_child',
        brandName: 'Nike SB',
        parentBrandId: 'parent-1',
        relationType: 'brand_line',
      });

      expect(brandRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Nike SB',
          parentId: 'parent-1',
          brandType: 'child',
          displayMode: 'inherit_parent',
          status: 'active',
        }),
      );
      expect(brandRelationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parentBrandId: 'parent-1',
          childBrandId: 'child-brand-1',
          relationType: 'brand_line',
        }),
      );
      expect(productRepository.update).toHaveBeenCalledWith(['product-1'], {
        brandId: 'child-brand-1',
        status: ProductStatus.ACTIVE,
      });
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          brandId: 'child-brand-1',
          parentBrandId: 'parent-1',
          updatedProducts: 1,
          activatedProducts: 1,
        }),
      );
    });

    it('should create a canonical brand and bind candidate products', async () => {
      brandCandidateRepository.findOne.mockResolvedValue({
        id: 'candidate-canonical',
        rawBrandName: 'Saint Tears',
        normalizedBrandName: 'saint tears',
        reviewStatus: 'pending',
        notes: null,
      });
      brandRepository.findOne.mockResolvedValue(null);
      brandMatchService.findByNameOrAlias.mockResolvedValue(null);
      brandAliasRepository.findOne.mockResolvedValue(null);
      brandCandidateItemRepository.find.mockResolvedValue([
        { productId: 'product-2' },
      ]);
      productRepository.find.mockResolvedValue([
        {
          id: 'product-2',
          status: ProductStatus.DRAFT,
          title: 'Saint Tears Tee',
          slug: 'saint-tears-tee',
          primaryCategoryId: 'cat-2',
          mainImage: 'https://example.com/saint-tears.jpg',
          images: ['https://example.com/saint-tears.jpg'],
        },
      ]);
      productBrandFactRepository.find.mockResolvedValue([
        { id: 'fact-2', candidateId: 'candidate-canonical' },
      ]);
      brandRepository.save.mockResolvedValue({
        id: 'canonical-brand-1',
        name: 'Saint Tears',
      });

      const result = await service.resolveCandidate('candidate-canonical', {
        action: 'create_canonical',
        brandName: 'Saint Tears',
      });

      expect(brandRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Saint Tears',
          brandType: 'canonical',
          displayMode: 'independent',
          status: 'active',
        }),
      );
      expect(productRepository.update).toHaveBeenCalledWith(['product-2'], {
        brandId: 'canonical-brand-1',
      });
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          brandId: 'canonical-brand-1',
          updatedProducts: 1,
          activatedProducts: 0,
        }),
      );
    });
  });

  describe('listCandidates', () => {
    it('should use entity property paths for ordering when paginating joined results', async () => {
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([[{ id: 'candidate-1' }], 1]),
      };
      brandCandidateRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQb);

      const result = await service.listCandidates({
        page: 2,
        limit: 10,
        search: 'balen',
        status: 'pending',
      });

      expect(brandCandidateRepository.createQueryBuilder).toHaveBeenCalledWith(
        'candidate',
      );
      expect(mockQb.leftJoinAndSelect).toHaveBeenCalledWith(
        'candidate.suggestedBrand',
        'suggestedBrand',
      );
      expect(mockQb.andWhere).toHaveBeenNthCalledWith(
        1,
        '(LOWER(candidate."rawBrandName") LIKE :search OR LOWER(candidate."normalizedBrandName") LIKE :search)',
        { search: '%balen%' },
      );
      expect(mockQb.andWhere).toHaveBeenNthCalledWith(
        2,
        'candidate."reviewStatus" = :status',
        { status: 'pending' },
      );
      expect(mockQb.orderBy).toHaveBeenCalledWith('candidate.hitCount', 'DESC');
      expect(mockQb.addOrderBy).toHaveBeenCalledWith(
        'candidate.updatedAt',
        'DESC',
      );
      expect(mockQb.skip).toHaveBeenCalledWith(10);
      expect(mockQb.take).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        data: [{ id: 'candidate-1' }],
        meta: {
          total: 1,
          page: 2,
          limit: 10,
          totalPages: 1,
        },
      });
    });
  });

  describe('getCandidateDetail', () => {
    it('should return product evidence, top buckets, and risk signals for expert review', async () => {
      brandCandidateRepository.findOne.mockResolvedValue({
        id: 'candidate-risk',
        rawBrandName: 'Hellstar Records',
        normalizedBrandName: 'hellstar records',
        candidateKey: 'hellstarrecords',
        reviewStatus: 'pending',
        confidence: 0.62,
        hitCount: 2,
        sampleProductCount: 2,
        suggestedBrandId: 'brand-1',
        suggestedBrand: {
          id: 'brand-1',
          name: 'Hellstar',
          slug: 'hellstar',
        },
      });

      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            createdAt: new Date('2026-04-17T10:00:00.000Z'),
            matchConfidence: 0.61,
            product: {
              id: 'product-1',
              title: 'Hellstar Records x Hellstar Tee',
              slug: 'hellstar-records-tee',
              status: ProductStatus.PENDING_REVIEW,
              mainImage: 'https://example.com/1.jpg',
              priceMin: 199,
              priceMax: 199,
              currency: 'CNY',
              aiBrandName: 'Hellstar Records',
              brandConfidence: 0.66,
              weidianShopName: 'Street Archive',
              sourceUrl: 'https://weidian.com/item.html?itemID=1',
              primaryCategory: {
                id: 'cat-1',
                name: 'T-Shirts',
                slug: 't-shirts',
              },
              brand: null,
            },
          },
          {
            createdAt: new Date('2026-04-17T09:00:00.000Z'),
            matchConfidence: 0.58,
            product: {
              id: 'product-2',
              title: 'Hellstar Records Flame Hoodie',
              slug: 'hellstar-records-hoodie',
              status: ProductStatus.DRAFT,
              mainImage: 'https://example.com/2.jpg',
              priceMin: 299,
              priceMax: 329,
              currency: 'CNY',
              aiBrandName: 'Hellstar Records',
              brandConfidence: 0.6,
              weidianShopName: 'Street Archive',
              sourceUrl: 'https://weidian.com/item.html?itemID=2',
              primaryCategory: {
                id: 'cat-2',
                name: 'Hoodies',
                slug: 'hoodies',
              },
              brand: null,
            },
          },
        ]),
      };
      brandCandidateItemRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQb);

      const result = await service.getCandidateDetail('candidate-risk');

      expect(brandCandidateRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'candidate-risk' },
        relations: {
          suggestedBrand: true,
        },
      });
      expect(
        brandCandidateItemRepository.createQueryBuilder,
      ).toHaveBeenCalledWith('item');
      expect(result.averageMatchConfidence).toBe(0.595);
      expect(result.topShops).toEqual([{ label: 'Street Archive', count: 2 }]);
      expect(result.topCategories).toEqual([
        { label: 'T-Shirts', count: 1 },
        { label: 'Hoodies', count: 1 },
      ]);
      expect(result.riskFlags).toEqual(
        expect.arrayContaining([
          '疑似联名 / Collaboration',
          '疑似副线 / Project',
          '候选建议置信度偏低',
          '样本匹配置信度偏低',
        ]),
      );
      expect(result.sampleProducts).toHaveLength(2);
      expect(result.sampleProducts[0]).toEqual(
        expect.objectContaining({
          id: 'product-1',
          title: 'Hellstar Records x Hellstar Tee',
        }),
      );
    });
  });

  describe('syncProductBrandDecision', () => {
    it('should mark unresolved candidate facts as soft_hint_candidate when a suggested brand exists', async () => {
      brandCandidateRepository.findOne.mockResolvedValue({
        id: 'candidate-soft',
        reviewStatus: 'pending',
        suggestedBrandId: 'brand-soft',
      });
      brandCandidateItemRepository.findOne.mockResolvedValue({
        candidateId: 'candidate-soft',
        productId: 'product-1',
      });
      productBrandFactRepository.findOne.mockResolvedValue(null);

      await service.syncProductBrandDecision({
        productId: 'product-1',
        rawBrandName: 'Cloud',
        matchedBrandId: null,
      });

      expect(productBrandFactRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          candidateId: 'candidate-soft',
          matchedBrandId: null,
          matchMethod: 'soft_hint_candidate',
          reviewStatus: 'pending_review',
        }),
      );
    });
  });
});
