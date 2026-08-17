import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DEFAULT_PLATFORMS, PlatformsService } from './platforms.service';
import { Platform } from './entities/platform.entity';
import { UploadService } from '../upload/upload.service';

describe('PlatformsService', () => {
  let service: PlatformsService;
  let platformRepo: any;
  let uploadService: any;

  beforeEach(async () => {
    platformRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((data) => ({ id: 'platform-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    uploadService = {
      downloadRemoteImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformsService,
        { provide: getRepositoryToken(Platform), useValue: platformRepo },
        { provide: UploadService, useValue: uploadService },
      ],
    }).compile();

    service = module.get<PlatformsService>(PlatformsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('includes every agent restored from the subsite network', () => {
    const keys = new Set(DEFAULT_PLATFORMS.map((platform) => platform.key));

    expect(DEFAULT_PLATFORMS).toHaveLength(35);
    expect(keys.size).toBe(35);
    expect([...keys]).toEqual(
      expect.arrayContaining([
        'acbuy',
        'allchinabuy',
        'bbdbuy',
        'cnshopper',
        'eastmallbuy',
        'goatedbuy',
        'gtbuy',
        'hoobuy',
        'itaobuy',
        'kameymall',
        'mulebuy',
        'orientdig',
        'parcelup',
        'yoybuy',
      ]),
    );
  });

  it('upgrades stale built-in homepage routes without replacing invite codes', async () => {
    const storedPlatforms = new Map(
      DEFAULT_PLATFORMS.map((platform) => [
        platform.key,
        {
          id: `platform-${platform.key}`,
          ...platform,
          logoUrl: `/uploads/platform-${platform.key}.png`,
          inviteCode: 'affiliate-123',
        },
      ]),
    );
    const orientDig = storedPlatforms.get('orientdig') as Platform;
    orientDig.baseUrl = 'https://orientdig.com/';
    orientDig.urlTemplate = '{baseUrl}';

    platformRepo.findOne.mockImplementation(({ where }: any) =>
      Promise.resolve(storedPlatforms.get(where.key)),
    );

    await service.onModuleInit();

    expect(platformRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'orientdig',
        baseUrl: 'https://orientdig.com/product',
        urlTemplate:
          '{baseUrl}?id={weidianItemId}&platform=WEIDIAN&inviteCode={inviteCode}',
        inviteCode: 'affiliate-123',
      }),
    );
  });

  describe('generateBuyLink()', () => {
    it('builds a verified ACBuy Weidian product route', () => {
      const platform = DEFAULT_PLATFORMS.find(
        (item) => item.key === 'acbuy',
      ) as Platform;

      expect(
        service.generateBuyLink(platform, { weidianItemId: '7488920869' }),
      ).toBe('https://www.acbuy.com/product?id=7488920869&platform=WEIDIAN');
    });

    it('builds an AllChinaBuy paste-link route containing the source product', () => {
      const platform = DEFAULT_PLATFORMS.find(
        (item) => item.key === 'allchinabuy',
      ) as Platform;

      expect(
        service.generateBuyLink(platform, { weidianItemId: '7488920869' }),
      ).toBe(
        'https://www.allchinabuy.com/en/page/buy/?nTag=Home-search&from=search-input&_search=url&url=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7488920869&partnercode=',
      );
    });

    it('builds an OrientDig product route instead of its homepage', () => {
      const platform = DEFAULT_PLATFORMS.find(
        (item) => item.key === 'orientdig',
      ) as Platform;

      expect(
        service.generateBuyLink(platform, { weidianItemId: '7488920869' }),
      ).toBe(
        'https://orientdig.com/product?id=7488920869&platform=WEIDIAN&inviteCode=',
      );
    });

    it('double-encodes source URLs for hash-router product import pages', () => {
      const platform = DEFAULT_PLATFORMS.find(
        (item) => item.key === 'sugargoo',
      ) as Platform;

      expect(
        service.generateBuyLink(platform, { weidianItemId: '7488920869' }),
      ).toContain(
        'productLink=https%253A%252F%252Fweidian.com%252Fitem.html%253FitemID%253D7488920869',
      );
    });

    it.each(DEFAULT_PLATFORMS.map((platform) => [platform.key, platform]))(
      '%s generates a product-aware route with no unresolved placeholders',
      (_key, platform) => {
        const url = service.generateBuyLink(platform as Platform, {
          weidianItemId: '7488920869',
        });

        expect(url).not.toBe((platform as Platform).baseUrl);
        expect(url).toContain('7488920869');
        expect(url).not.toMatch(/\{[^}]+\}/);
      },
    );
  });

  describe('generateBuyLink() custom platforms', () => {
    it('keeps supporting custom product templates', () => {
      const platform = {
        baseUrl: 'https://agent.example/items',
        inviteCode: 'ref-1',
        urlTemplate:
          '{baseUrl}/{productId}?source={encodedWeidianUrl}&ref={inviteCode}',
      } as Platform;

      expect(
        service.generateBuyLink(platform, {
          productId: 'product-1',
          weidianItemId: '7488920869',
        }),
      ).toBe(
        'https://agent.example/items/product-1?source=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7488920869&ref=ref-1',
      );
    });
  });

  describe('create()', () => {
    const baseDto = {
      key: 'loongbuy',
      name: 'Loongbuy',
      baseUrl: 'https://www.loongbuy.com/product-details',
    };

    it('throws when key already exists', async () => {
      platformRepo.findOne.mockResolvedValue({
        id: 'exists-1',
        key: 'loongbuy',
      });

      await expect(service.create(baseDto as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws when creating active platform without English description', async () => {
      platformRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          ...baseDto,
          isActive: true,
          translations: { zh: { description: '龙购代购平台' } },
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when translations contains unsupported locale key', async () => {
      platformRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          ...baseDto,
          isActive: false,
          translations: {
            en: { description: 'Loongbuy proxy purchase platform' },
            ja: { description: 'ロングバイ購入代行プラットフォーム' },
          },
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows creating inactive platform without English description', async () => {
      platformRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          ...baseDto,
          isActive: false,
          translations: { zh: { description: '龙购代购平台' } },
        } as any),
      ).resolves.toEqual(
        expect.objectContaining({
          key: 'loongbuy',
          isActive: false,
        }),
      );
    });

    it('allows creating active platform with English description', async () => {
      platformRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          ...baseDto,
          isActive: true,
          translations: {
            en: { description: 'Loongbuy proxy purchase platform' },
          },
        } as any),
      ).resolves.toEqual(
        expect.objectContaining({
          key: 'loongbuy',
          isActive: true,
        }),
      );
    });

    it('downloads remote logo into managed storage on create', async () => {
      platformRepo.findOne.mockResolvedValue(null);
      uploadService.downloadRemoteImage.mockResolvedValue(
        'http://localhost:4101/uploads/platform-loongbuy-logo.png',
      );

      await expect(
        service.create({
          ...baseDto,
          logoUrl: 'https://www.loongbuy.com/favicon.ico',
          isActive: false,
        } as any),
      ).resolves.toEqual(
        expect.objectContaining({
          logoUrl: 'http://localhost:4101/uploads/platform-loongbuy-logo.png',
        }),
      );

      expect(uploadService.downloadRemoteImage).toHaveBeenCalledWith(
        'https://www.loongbuy.com/favicon.ico',
        { prefix: 'platform-loongbuy' },
      );
    });
  });

  describe('update()', () => {
    const existingInactive = {
      id: 'platform-1',
      key: 'loongbuy',
      name: 'Loongbuy',
      baseUrl: 'https://www.loongbuy.com/product-details',
      isActive: false,
      translations: { zh: { description: '龙购代购平台' } },
    };

    const existingActiveWithEn = {
      ...existingInactive,
      isActive: true,
      translations: { en: { description: 'Loongbuy proxy purchase platform' } },
    };

    it('throws when enabling platform without English description', async () => {
      platformRepo.findOne.mockResolvedValueOnce(existingInactive);

      await expect(
        service.update(existingInactive.id, { isActive: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows enabling platform when English description already exists', async () => {
      platformRepo.findOne.mockResolvedValueOnce(existingActiveWithEn);

      await expect(
        service.update(existingActiveWithEn.id, { sortOrder: 3 }),
      ).resolves.toEqual(expect.objectContaining({ sortOrder: 3 }));
    });

    it('preserves existing en.description for partial translation update', async () => {
      platformRepo.findOne.mockResolvedValueOnce(existingActiveWithEn);

      await expect(
        service.update(existingActiveWithEn.id, {
          translations: { en: { name: 'Loongbuy EN' } },
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          translations: {
            en: {
              name: 'Loongbuy EN',
              description: 'Loongbuy proxy purchase platform',
            },
          },
        }),
      );
    });

    it('throws when clearing en.description while active', async () => {
      platformRepo.findOne.mockResolvedValueOnce(existingActiveWithEn);

      await expect(
        service.update(existingActiveWithEn.id, {
          translations: { en: { description: '   ' } },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when update payload contains unsupported translation field', async () => {
      platformRepo.findOne.mockResolvedValueOnce(existingActiveWithEn);

      await expect(
        service.update(existingActiveWithEn.id, {
          translations: {
            en: {
              description: 'Loongbuy proxy purchase platform',
              extra: 'x',
            } as any,
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('downloads remote logo into managed storage on update', async () => {
      platformRepo.findOne.mockResolvedValueOnce(existingActiveWithEn);
      uploadService.downloadRemoteImage.mockResolvedValue(
        'http://localhost:4101/uploads/platform-loongbuy-logo.png',
      );

      await expect(
        service.update(existingActiveWithEn.id, {
          logoUrl: 'https://www.loongbuy.com/favicon.ico',
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          logoUrl: 'http://localhost:4101/uploads/platform-loongbuy-logo.png',
        }),
      );
    });
  });
});
