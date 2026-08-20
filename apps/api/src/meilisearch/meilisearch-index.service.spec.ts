import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MeilisearchIndexService } from './meilisearch-index.service';
import { MeilisearchService } from './meilisearch.service';
import { SynonymGroup } from '../search/entities/synonym-group.entity';

describe('MeilisearchIndexService', () => {
  let service: MeilisearchIndexService;
  let client: {
    createIndex: jest.Mock;
    index: jest.Mock;
    deleteIndexIfExists: jest.Mock;
  };
  let indexApi: {
    updateSettings: jest.Mock;
    updateStopWords: jest.Mock;
    updateSynonyms: jest.Mock;
  };
  let synonymRepository: { find: jest.Mock };

  beforeEach(async () => {
    indexApi = {
      updateSettings: jest
        .fn()
        .mockReturnValue({ waitTask: jest.fn().mockResolvedValue({}) }),
      updateStopWords: jest
        .fn()
        .mockReturnValue({ waitTask: jest.fn().mockResolvedValue({}) }),
      updateSynonyms: jest
        .fn()
        .mockReturnValue({ waitTask: jest.fn().mockResolvedValue({}) }),
    };

    client = {
      createIndex: jest
        .fn()
        .mockReturnValue({ waitTask: jest.fn().mockResolvedValue({}) }),
      index: jest.fn().mockReturnValue(indexApi),
      deleteIndexIfExists: jest.fn().mockResolvedValue(false),
    };

    synonymRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeilisearchIndexService,
        {
          provide: MeilisearchService,
          useValue: {
            getClient: jest.fn().mockReturnValue(client),
          },
        },
        {
          provide: getRepositoryToken(SynonymGroup),
          useValue: synonymRepository,
        },
      ],
    }).compile();

    service = module.get<MeilisearchIndexService>(MeilisearchIndexService);
  });

  it('applies settings when creating a fresh index', async () => {
    await service.ensureIndex();

    expect(client.createIndex).toHaveBeenCalledWith('products', {
      primaryKey: 'id',
    });
    expect(indexApi.updateSettings).toHaveBeenCalledTimes(1);
    expect(indexApi.updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        filterableAttributes: expect.arrayContaining(['productGroupId']),
      }),
    );
    expect(indexApi.updateStopWords).toHaveBeenCalledTimes(1);
    expect(indexApi.updateSynonyms).toHaveBeenCalledTimes(1);
  });

  it('still reapplies settings when the index already exists', async () => {
    client.createIndex.mockImplementation(() => ({
      waitTask: jest.fn().mockRejectedValue({
        code: 'index_already_exists',
        message: 'Index already exists',
      }),
    }));

    await service.ensureIndex();

    expect(indexApi.updateSettings).toHaveBeenCalledTimes(1);
    expect(indexApi.updateStopWords).toHaveBeenCalledTimes(1);
    expect(indexApi.updateSynonyms).toHaveBeenCalledTimes(1);
  });
});
