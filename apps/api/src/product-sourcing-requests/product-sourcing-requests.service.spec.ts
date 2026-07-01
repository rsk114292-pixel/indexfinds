import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductSourcingRequestsService } from './product-sourcing-requests.service';
import {
  ProductSourcingRequest,
  ProductSourcingRequestStatus,
} from './entities/product-sourcing-request.entity';

describe('ProductSourcingRequestsService', () => {
  let service: ProductSourcingRequestsService;
  let requestRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mockQb: {
    leftJoinAndSelect: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    andWhere: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  beforeEach(async () => {
    mockQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    requestRepo = {
      create: jest.fn((input) => ({ id: 'req-1', ...input })),
      save: jest.fn((input) => Promise.resolve(input)),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductSourcingRequestsService,
        {
          provide: getRepositoryToken(ProductSourcingRequest),
          useValue: requestRepo,
        },
      ],
    }).compile();

    service = module.get<ProductSourcingRequestsService>(
      ProductSourcingRequestsService,
    );
  });

  describe('create', () => {
    it('creates a request with trimmed values and formatted budgets', async () => {
      const result = await service.create('user-1', {
        searchQuery: '  nike shox  ',
        productName: '  Nike Shox TL Black  ',
        description: '  Looking for the black pair  ',
        referenceUrl: '  https://example.com/item  ',
        imageUrls: ['', 'https://example.com/reference.jpg'],
        budgetMin: 100,
        budgetMax: 180.5,
        locale: '  en  ',
        searchLogId: 'search-log-1',
        filtersSnapshot: {
          q: 'nike shox',
          sortBy: 'popular',
        },
      });

      expect(requestRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        searchQuery: 'nike shox',
        productName: 'Nike Shox TL Black',
        description: 'Looking for the black pair',
        referenceUrl: 'https://example.com/item',
        imageUrls: ['https://example.com/reference.jpg'],
        budgetMin: '100.00',
        budgetMax: '180.50',
        locale: 'en',
        searchLogId: 'search-log-1',
        filtersSnapshot: {
          q: 'nike shox',
          sortBy: 'popular',
        },
        status: ProductSourcingRequestStatus.NEW,
      });
      expect(result.status).toBe(ProductSourcingRequestStatus.NEW);
    });

    it('rejects submissions without description and images', async () => {
      await expect(
        service.create('user-1', {
          productName: 'Nike Shox TL Black',
          description: '   ',
          imageUrls: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when budgetMin is greater than budgetMax', async () => {
      await expect(
        service.create('user-1', {
          productName: 'Nike Shox TL Black',
          description: 'Need this pair',
          budgetMin: 500,
          budgetMax: 300,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAdminList', () => {
    it('builds list query with filters and pagination', async () => {
      const items = [
        {
          id: 'req-1',
          productName: 'Balenciaga Runner White',
        },
      ];
      mockQb.getManyAndCount.mockResolvedValue([items, 1]);

      const result = await service.findAdminList({
        page: 2,
        limit: 10,
        status: ProductSourcingRequestStatus.REVIEWING,
        hasImages: true,
        search: '  balenciaga  ',
      });

      expect(requestRepo.createQueryBuilder).toHaveBeenCalledWith('request');
      expect(mockQb.leftJoinAndSelect).toHaveBeenCalledWith(
        'request.user',
        'user',
      );
      expect(mockQb.orderBy).toHaveBeenCalledWith('request.createdAt', 'DESC');
      expect(mockQb.skip).toHaveBeenCalledWith(10);
      expect(mockQb.take).toHaveBeenCalledWith(10);
      expect(mockQb.andWhere).toHaveBeenCalledWith('request.status = :status', {
        status: ProductSourcingRequestStatus.REVIEWING,
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'array_length(request.image_urls, 1) > 0',
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('request.search_query ILIKE :search'),
        { search: '%balenciaga%' },
      );
      expect(result).toEqual({ items, total: 1 });
    });
  });

  describe('findAdminOne', () => {
    it('returns the item with user relation', async () => {
      const item = { id: 'req-1', productName: 'Test request' };
      requestRepo.findOne.mockResolvedValue(item);

      await expect(service.findAdminOne('req-1')).resolves.toEqual(item);
      expect(requestRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        relations: { user: true },
      });
    });

    it('throws when the item does not exist', async () => {
      requestRepo.findOne.mockResolvedValue(null);

      await expect(service.findAdminOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateAdmin', () => {
    it('updates status, trims notes, and clears linked product when requested', async () => {
      const existing = {
        id: 'req-1',
        status: ProductSourcingRequestStatus.NEW,
        adminNotes: null,
        linkedProductId: 'prod-1',
      } as ProductSourcingRequest;
      requestRepo.findOne.mockResolvedValue(existing);

      const result = await service.updateAdmin('req-1', {
        status: ProductSourcingRequestStatus.PLANNED,
        adminNotes: '  Source next batch  ',
        linkedProductId: '',
      });

      expect(requestRepo.save).toHaveBeenCalledWith({
        ...existing,
        status: ProductSourcingRequestStatus.PLANNED,
        adminNotes: 'Source next batch',
        linkedProductId: null,
      });
      expect(result.status).toBe(ProductSourcingRequestStatus.PLANNED);
      expect(result.adminNotes).toBe('Source next batch');
      expect(result.linkedProductId).toBeNull();
    });
  });
});
