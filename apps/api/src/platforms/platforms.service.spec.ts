import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { PlatformsService } from './platforms.service';
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
