import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import axios from 'axios';
import { EmbeddingGenerationService } from './embedding-generation.service';
import { ProductQueryFacadeService } from '../products/product-query-facade.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EmbeddingGenerationService', () => {
  let service: EmbeddingGenerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingGenerationService,
        {
          provide: DataSource,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) =>
              key === 'EMBEDDING_SERVICE_URL'
                ? 'http://localhost:18001'
                : fallback,
            ),
          },
        },
        {
          provide: ProductQueryFacadeService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(EmbeddingGenerationService);
    service.setAvailable(true);
    jest.clearAllMocks();
  });

  it('chunks large text batches to respect embedding-service limits', async () => {
    mockedAxios.post.mockImplementation((_url, body) => {
      const texts = (body as { texts: string[] }).texts;
      return Promise.resolve({
        data: {
          embeddings: texts.map((_, index) => [index + 1]),
        },
      } as never);
    });

    const texts = Array.from({ length: 120 }, (_, index) => `text-${index}`);
    const embeddings = await service.batchGenerateTextEmbeddings(texts);

    expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      1,
      'http://localhost:18001/embed/text/batch',
      { texts: texts.slice(0, 50) },
      { timeout: 30000 },
    );
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      2,
      'http://localhost:18001/embed/text/batch',
      { texts: texts.slice(50, 100) },
      { timeout: 30000 },
    );
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      3,
      'http://localhost:18001/embed/text/batch',
      { texts: texts.slice(100, 120) },
      { timeout: 30000 },
    );
    expect(embeddings).toHaveLength(120);
  });
});
