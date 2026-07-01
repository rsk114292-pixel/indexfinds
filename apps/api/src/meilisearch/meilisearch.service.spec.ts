import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MeilisearchService } from './meilisearch.service';

describe('MeilisearchService', () => {
  let service: MeilisearchService;
  let configService: any;

  const mockIndex = {
    search: jest.fn(),
    addDocuments: jest
      .fn()
      .mockReturnValue({ waitTask: jest.fn().mockResolvedValue({}) }),
    updateDocuments: jest
      .fn()
      .mockReturnValue({ waitTask: jest.fn().mockResolvedValue({}) }),
    deleteDocument: jest
      .fn()
      .mockReturnValue({ waitTask: jest.fn().mockResolvedValue({}) }),
    deleteDocuments: jest
      .fn()
      .mockReturnValue({ waitTask: jest.fn().mockResolvedValue({}) }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const map: Record<string, string> = {
          MEILISEARCH_HOST: 'http://localhost:17700',
          MEILISEARCH_API_KEY: 'test-key',
        };
        return map[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeilisearchService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<MeilisearchService>(MeilisearchService);
    service.onModuleInit();

    // Replace the internal client's index method to return our mock
    jest.spyOn(service, 'getIndex').mockReturnValue(mockIndex as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize client on module init', () => {
    expect(service.getClient()).toBeDefined();
  });

  describe('search', () => {
    it('should delegate to index.search', async () => {
      const mockResult = { hits: [], totalHits: 0 };
      mockIndex.search.mockResolvedValue(mockResult);

      const result = await service.search('nike', { page: 1, hitsPerPage: 10 });

      expect(mockIndex.search).toHaveBeenCalledWith('nike', {
        page: 1,
        hitsPerPage: 10,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('addDocuments', () => {
    it('should add documents and wait for task', async () => {
      const docs = [{ id: '1', title: 'Test' }];
      await service.addDocuments(docs);

      expect(mockIndex.addDocuments).toHaveBeenCalledWith(docs);
    });

    it('should skip when documents array is empty', async () => {
      await service.addDocuments([]);
      expect(mockIndex.addDocuments).not.toHaveBeenCalled();
    });
  });

  describe('updateDocuments', () => {
    it('should update documents and wait for task', async () => {
      const docs = [{ id: '1', title: 'Updated' }];
      await service.updateDocuments(docs);

      expect(mockIndex.updateDocuments).toHaveBeenCalledWith(docs);
    });

    it('should skip when documents array is empty', async () => {
      await service.updateDocuments([]);
      expect(mockIndex.updateDocuments).not.toHaveBeenCalled();
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document and wait for task', async () => {
      await service.deleteDocument('prod-1');
      expect(mockIndex.deleteDocument).toHaveBeenCalledWith('prod-1');
    });
  });

  describe('deleteDocuments', () => {
    it('should delete multiple documents', async () => {
      await service.deleteDocuments(['prod-1', 'prod-2']);
      expect(mockIndex.deleteDocuments).toHaveBeenCalledWith([
        'prod-1',
        'prod-2',
      ]);
    });

    it('should skip when ids array is empty', async () => {
      await service.deleteDocuments([]);
      expect(mockIndex.deleteDocuments).not.toHaveBeenCalled();
    });
  });

  describe('isHealthy', () => {
    it('should return true when healthy', async () => {
      jest
        .spyOn(service.getClient(), 'health')
        .mockResolvedValue({ status: 'available' });
      expect(await service.isHealthy()).toBe(true);
    });

    it('should return false when unhealthy', async () => {
      jest
        .spyOn(service.getClient(), 'health')
        .mockRejectedValue(new Error('connection refused'));
      expect(await service.isHealthy()).toBe(false);
    });
  });
});
