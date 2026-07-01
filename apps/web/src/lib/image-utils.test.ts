import {
  getImageVariant,
  getImageReferrerPolicy,
  getFullResolutionUrl,
  getProductListThumbnail,
  getProductCardThumbnail,
  getProductDetailMainImage,
  getProductDetailThumbnail,
  getThumbnailUrl,
  isCdnWebpEnabled,
} from './image-utils';

const WEIDIAN_URL = 'https://si.geilicdn.com/img-12345.jpg';
const OTHER_URL = 'https://cdn.example.com/photo.jpg';

describe('image-utils（WebP 模式，默认）', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_CDN_WEBP;
  });

  describe('isCdnWebpEnabled', () => {
    it('默认启用', () => {
      expect(isCdnWebpEnabled()).toBe(true);
    });

    it('显式 true 启用', () => {
      process.env.NEXT_PUBLIC_CDN_WEBP = 'true';
      expect(isCdnWebpEnabled()).toBe(true);
    });

    it('设为 false 禁用', () => {
      process.env.NEXT_PUBLIC_CDN_WEBP = 'false';
      expect(isCdnWebpEnabled()).toBe(false);
    });
  });

  describe('getImageReferrerPolicy', () => {
    it('微店 CDN URL 返回 no-referrer', () => {
      expect(getImageReferrerPolicy(WEIDIAN_URL)).toBe('no-referrer');
    });

    it('非微店 URL 不设置 referrerPolicy', () => {
      expect(getImageReferrerPolicy(OTHER_URL)).toBeUndefined();
    });
  });

  describe('getImageVariant', () => {
    it('微店 CDN URL → imageView2 WebP', () => {
      expect(getImageVariant(WEIDIAN_URL, 300)).toBe(
        'https://si.geilicdn.com/img-12345.jpg?imageView2/2/w/300/h/300/format/webp',
      );
    });

    it('已有旧格式 w/h 参数 → 替换为 imageView2 WebP', () => {
      const withParams = 'https://si.geilicdn.com/img-12345.jpg?w=600&h=600';
      expect(getImageVariant(withParams, 300)).toBe(
        'https://si.geilicdn.com/img-12345.jpg?imageView2/2/w/300/h/300/format/webp',
      );
    });

    it('已有 imageView2 参数 → 替换为新尺寸', () => {
      const withImageView2 = 'https://si.geilicdn.com/img-12345.jpg?imageView2/2/w/600/h/600/format/webp';
      expect(getImageVariant(withImageView2, 300)).toBe(
        'https://si.geilicdn.com/img-12345.jpg?imageView2/2/w/300/h/300/format/webp',
      );
    });

    it('其他 URL → 返回原 URL', () => {
      expect(getImageVariant(OTHER_URL, 300)).toBe(OTHER_URL);
    });

    it('空 URL → 返回空', () => {
      expect(getImageVariant('', 300)).toBe('');
    });
  });

  describe('getFullResolutionUrl', () => {
    it('微店 CDN 带旧格式 w/h 参数 → 还原原图', () => {
      const withParams = 'https://si.geilicdn.com/img-12345.jpg?w=600&h=600';
      expect(getFullResolutionUrl(withParams)).toBe(WEIDIAN_URL);
    });

    it('微店 CDN 带 imageView2 参数 → 还原原图', () => {
      const withImageView2 = 'https://si.geilicdn.com/img-12345.jpg?imageView2/2/w/600/h/600/format/webp';
      expect(getFullResolutionUrl(withImageView2)).toBe(WEIDIAN_URL);
    });

    it('微店 CDN 无参数 → 不变', () => {
      expect(getFullResolutionUrl(WEIDIAN_URL)).toBe(WEIDIAN_URL);
    });

    it('非微店 URL → 不变', () => {
      expect(getFullResolutionUrl(OTHER_URL)).toBe(OTHER_URL);
    });

    it('空 URL → 返回空', () => {
      expect(getFullResolutionUrl('')).toBe('');
    });
  });

  describe('便捷函数（WebP 模式）', () => {
    it('getProductListThumbnail → 80 WebP', () => {
      expect(getProductListThumbnail(WEIDIAN_URL)).toBe(
        'https://si.geilicdn.com/img-12345.jpg?imageView2/2/w/80/h/80/format/webp',
      );
    });

    it('getProductCardThumbnail → 300 WebP', () => {
      expect(getProductCardThumbnail(WEIDIAN_URL)).toBe(
        'https://si.geilicdn.com/img-12345.jpg?imageView2/2/w/300/h/300/format/webp',
      );
    });

    it('getProductDetailMainImage → 600 WebP', () => {
      expect(getProductDetailMainImage(WEIDIAN_URL)).toBe(
        'https://si.geilicdn.com/img-12345.jpg?imageView2/2/w/600/h/600/format/webp',
      );
    });

    it('getProductDetailThumbnail → 80 WebP', () => {
      expect(getProductDetailThumbnail(WEIDIAN_URL)).toBe(
        'https://si.geilicdn.com/img-12345.jpg?imageView2/2/w/80/h/80/format/webp',
      );
    });
  });

  describe('getThumbnailUrl（向后兼容）', () => {
    it('微店 URL → imageView2 WebP', () => {
      expect(getThumbnailUrl(WEIDIAN_URL, 300, 300)).toBe(
        'https://si.geilicdn.com/img-12345.jpg?imageView2/2/w/300/h/300/format/webp',
      );
    });

    it('非微店 URL → 返回原 URL', () => {
      expect(getThumbnailUrl(OTHER_URL, 300, 300)).toBe(OTHER_URL);
    });
  });

  describe('端到端场景验证', () => {
    it('ImageMagnifier 场景：详情图 → getFullResolutionUrl → 原图', () => {
      const detail = getProductDetailMainImage(WEIDIAN_URL);
      const fullRes = getFullResolutionUrl(detail);
      expect(fullRes).toBe(WEIDIAN_URL);
    });

    it('ImageMagnifier 缩略图场景：详情图 → 原图 → 缩略图', () => {
      const detail = getProductDetailMainImage(WEIDIAN_URL);
      const thumbnail = getProductDetailThumbnail(getFullResolutionUrl(detail));
      expect(thumbnail).toBe(
        'https://si.geilicdn.com/img-12345.jpg?imageView2/2/w/80/h/80/format/webp',
      );
    });

    it('MobileImageSwiper 全屏场景：原图 URL 无处理参数', () => {
      expect(WEIDIAN_URL).not.toContain('?');
    });
  });
});

describe('image-utils（降级模式，CDN_WEBP=false）', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CDN_WEBP = 'false';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_CDN_WEBP;
  });

  it('getImageVariant 降级到 ?w=&h=', () => {
    expect(getImageVariant(WEIDIAN_URL, 300)).toBe(
      'https://si.geilicdn.com/img-12345.jpg?w=300&h=300',
    );
  });

  it('getProductCardThumbnail 降级到 ?w=&h=', () => {
    expect(getProductCardThumbnail(WEIDIAN_URL)).toBe(
      'https://si.geilicdn.com/img-12345.jpg?w=300&h=300',
    );
  });

  it('已有 imageView2 参数 → 降级替换为 ?w=&h=', () => {
    const withImageView2 = 'https://si.geilicdn.com/img-12345.jpg?imageView2/2/w/600/h/600/format/webp';
    expect(getImageVariant(withImageView2, 300)).toBe(
      'https://si.geilicdn.com/img-12345.jpg?w=300&h=300',
    );
  });

  it('getFullResolutionUrl 仍能还原 imageView2 格式', () => {
    const withImageView2 = 'https://si.geilicdn.com/img-12345.jpg?imageView2/2/w/600/h/600/format/webp';
    expect(getFullResolutionUrl(withImageView2)).toBe(WEIDIAN_URL);
  });

  it('端到端：降级模式下详情图 → 原图 → 缩略图', () => {
    const detail = getProductDetailMainImage(WEIDIAN_URL);
    expect(detail).toBe('https://si.geilicdn.com/img-12345.jpg?w=600&h=600');
    const thumbnail = getProductDetailThumbnail(getFullResolutionUrl(detail));
    expect(thumbnail).toBe('https://si.geilicdn.com/img-12345.jpg?w=80&h=80');
  });
});
