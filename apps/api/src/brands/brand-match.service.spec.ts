import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { BrandMatchService } from './brand-match.service';
import { Brand } from './entities/brand.entity';
import { BrandAlias } from './entities/brand-alias.entity';
import { BrandCandidate } from './entities/brand-candidate.entity';

describe('BrandMatchService', () => {
  let service: BrandMatchService;

  const mockQb = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  };

  const mockManager = {
    createQueryBuilder: jest.fn(() => ({ ...mockQb })),
  };

  const mockFindByNameQb = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((dto: any) => dto),
    save: jest.fn((entities: any) => Promise.resolve(entities)),
    manager: mockManager,
    createQueryBuilder: jest.fn(() => ({ ...mockFindByNameQb, ...mockQb })),
  };

  const mockCandidateRepository = {
    findOne: jest.fn(),
    create: jest.fn((dto: any) => dto),
    save: jest.fn((entity: any) => Promise.resolve(entity)),
  };

  const mockAliasRepository = {
    createQueryBuilder: jest.fn(() => ({
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandMatchService,
        {
          provide: getRepositoryToken(Brand),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(BrandAlias),
          useValue: mockAliasRepository,
        },
        {
          provide: getRepositoryToken(BrandCandidate),
          useValue: mockCandidateRepository,
        },
      ],
    }).compile();

    service = module.get<BrandMatchService>(BrandMatchService);
    jest.clearAllMocks();
    mockRepository.createQueryBuilder.mockImplementation(
      () => ({ ...mockFindByNameQb, ...mockQb }) as any,
    );
    mockAliasRepository.createQueryBuilder.mockImplementation(
      () =>
        ({
          innerJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
          select: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([]),
        }) as any,
    );
  });

  describe('findByNameOrAlias', () => {
    it('should match strict alias from brand_aliases before legacy alias fallback', async () => {
      const brandByNameQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'legacy-brand', name: 'Legacy Brand' }),
      };
      const aliasQb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            aliasType: 'safe-spelling-variant',
            brand: { id: 'brand-1', name: 'Balenciaga', status: 'active' },
          },
        ]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(brandByNameQb as any);
      mockAliasRepository.createQueryBuilder.mockReturnValue(aliasQb as any);

      const result = await service.findByNameOrAlias('LENCIGA');

      expect(result).toEqual({
        id: 'brand-1',
        name: 'Balenciaga',
        status: 'active',
      });
      expect(aliasQb.where).toHaveBeenCalledWith(
        'alias."normalizedAlias" = :canonicalKey',
        { canonicalKey: 'lenciga' },
      );
    });

    it('should ignore soft alias rows and keep falling back', async () => {
      const brandByNameQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'legacy-brand', name: 'Legacy Brand' }),
      };
      const aliasQb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            aliasType: 'safe-token-variant',
            brand: { id: 'soft-brand', name: 'Soft Brand', status: 'active' },
          },
        ]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(brandByNameQb as any);
      mockAliasRepository.createQueryBuilder.mockReturnValue(aliasQb as any);

      const result = await service.findByNameOrAlias('Cloud');

      expect(result).toEqual({ id: 'legacy-brand', name: 'Legacy Brand' });
    });
  });

  describe('findAllSimple', () => {
    it('should include strict normalized aliases in AI brand context', async () => {
      mockRepository.find.mockResolvedValue([
        { id: 'brand-1', name: 'AMI Paris', aliases: ['AMI'] },
      ]);
      const aliasQb = {
        select: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            brandId: 'brand-1',
            alias: 'Ami Paris',
            aliasType: 'seed_variant',
          },
          {
            brandId: 'brand-1',
            alias: 'Paris',
            aliasType: 'safe-token-variant',
          },
        ]),
      };
      mockAliasRepository.createQueryBuilder.mockReturnValue(aliasQb as any);

      const result = await service.findAllSimple();

      expect(result).toEqual([
        {
          name: 'AMI Paris',
          aliases: ['AMI', 'Ami Paris'],
        },
      ]);
    });
  });

  describe('merge', () => {
    it('should reject merging brand into itself', async () => {
      await expect(service.merge('same-id', 'same-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject merging already-merged source brand', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce({
          id: 'src',
          name: 'OldBrand',
          status: 'merged',
        })
        .mockResolvedValueOnce({ id: 'tgt', name: 'Target', status: 'active' });

      await expect(service.merge('src', 'tgt')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject merging into non-active target brand', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce({ id: 'src', name: 'Source', status: 'active' })
        .mockResolvedValueOnce({
          id: 'tgt',
          name: 'Target',
          status: 'inactive',
        });

      await expect(service.merge('src', 'tgt')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject merging child brand into parent brand', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce({
          id: 'child',
          name: 'Air Jordan',
          status: 'active',
          parentId: 'parent',
        })
        .mockResolvedValueOnce({
          id: 'parent',
          name: 'Nike',
          status: 'active',
        });

      await expect(service.merge('child', 'parent')).rejects.toThrow(
        /父子关系/,
      );
    });

    it('should reject merging parent brand into child brand', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce({ id: 'parent', name: 'Nike', status: 'active' })
        .mockResolvedValueOnce({
          id: 'child',
          name: 'Air Jordan',
          status: 'active',
          parentId: 'parent',
        });

      await expect(service.merge('parent', 'child')).rejects.toThrow(
        /父子关系/,
      );
    });

    it('should successfully merge valid brands (no parent-child relationship)', async () => {
      const source = {
        id: 'src',
        name: 'OldNike',
        status: 'active',
        aliases: ['old-nike'],
      };
      const target = {
        id: 'tgt',
        name: 'Nike',
        status: 'active',
        aliases: ['耐克'],
      };

      mockRepository.findOne
        .mockResolvedValueOnce({ ...source })
        .mockResolvedValueOnce({ ...target });
      mockRepository.save.mockImplementation((entities) =>
        Promise.resolve(entities),
      );

      const result = await service.merge('src', 'tgt');

      expect(result.status).toBe('merged');
      expect(result.mergedIntoId).toBe('tgt');
    });

    it('should reassign child brands from source to target on merge', async () => {
      const source = {
        id: 'src',
        name: 'OldNike',
        status: 'active',
        aliases: [],
      };
      const target = { id: 'tgt', name: 'Nike', status: 'active', aliases: [] };

      mockRepository.findOne
        .mockResolvedValueOnce({ ...source })
        .mockResolvedValueOnce({ ...target });
      mockRepository.save.mockImplementation((entities) =>
        Promise.resolve(entities),
      );

      // Track the QueryBuilder calls on the repository (child brand reassignment)
      const childQb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
        getOne: jest.fn().mockResolvedValue(null),
      };
      // Track the QueryBuilder calls on the manager (product reassignment)
      const productQb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };
      mockRepository.createQueryBuilder.mockReturnValue(childQb as any);
      mockManager.createQueryBuilder.mockReturnValue(productQb as any);

      await service.merge('src', 'tgt');

      // Verify child brands were reassigned
      expect(childQb.set).toHaveBeenCalledWith({ parentId: 'tgt' });
      expect(childQb.where).toHaveBeenCalledWith('"parentId" = :sourceId', {
        sourceId: 'src',
      });
      expect(childQb.execute).toHaveBeenCalled();

      // Verify products were also reassigned
      expect(productQb.set).toHaveBeenCalledWith({ brandId: 'tgt' });
      expect(productQb.where).toHaveBeenCalledWith('"brandId" = :sourceId', {
        sourceId: 'src',
      });
    });
  });

  describe('findOrCreateByName', () => {
    it('should follow merged brand to target', async () => {
      const mergedBrand = {
        id: 'old-id',
        name: 'Ralph Lauren',
        status: 'merged',
        mergedIntoId: 'target-id',
      };
      const targetBrand = {
        id: 'target-id',
        name: 'Polo Ralph Lauren',
        status: 'active',
      };

      // findByNameOrAlias returns the merged brand
      const nameQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(mergedBrand),
      };
      mockRepository.createQueryBuilder.mockReturnValue(nameQb as any);

      // findOneById for the target brand
      mockRepository.findOne.mockResolvedValueOnce(targetBrand);

      const result = await service.findOrCreateByName('Ralph Lauren');

      expect(result).toEqual(targetBrand);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'target-id' },
      });
    });

    it('should write unknown brands into candidate queue instead of creating a brand', async () => {
      const nameQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
      };
      mockRepository.createQueryBuilder.mockReturnValue(nameQb as any);
      mockCandidateRepository.findOne.mockResolvedValue(null);

      const result = await service.findOrCreateByName('Unknown Brand', 0.42);

      expect(result).toBeNull();
      expect(mockRepository.save).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' }),
      );
      expect(mockCandidateRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          rawBrandName: 'Unknown Brand',
          candidateKey: 'unknownbrand',
          hitCount: 1,
        }),
      );
    });

    it('should persist a soft hint suggestion without auto-binding the brand', async () => {
      const brandByNameQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
      };
      const strictAliasQb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      const softAliasQb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            brandId: 'brand-soft-1',
            aliasType: 'safe-token-variant',
            brand: { id: 'brand-soft-1', name: 'On', status: 'active' },
          },
        ]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(brandByNameQb as any);
      mockAliasRepository.createQueryBuilder
        .mockReturnValueOnce(strictAliasQb as any)
        .mockReturnValueOnce(softAliasQb as any);
      mockCandidateRepository.findOne.mockResolvedValue(null);

      const result = await service.findOrCreateByName('Cloud');

      expect(result).toBeNull();
      expect(mockCandidateRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          rawBrandName: 'Cloud',
          suggestedBrandId: 'brand-soft-1',
          suggestedRelationType: 'soft_hint',
        }),
      );
    });
  });
});
