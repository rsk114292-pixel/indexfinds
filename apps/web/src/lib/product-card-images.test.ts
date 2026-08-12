import {
  getProductCardImageCandidates,
  getProductSourceLabel,
} from './product-card-images';

describe('product card image helpers', () => {
  it('builds a unique ordered fallback list', () => {
    expect(
      getProductCardImageCandidates({
        mainImage: ' main.jpg ',
        secondImage: 'second.jpg',
        images: ['main.jpg', '', 'third.jpg'],
      }),
    ).toEqual(['main.jpg', 'second.jpg', 'third.jpg']);
  });

  it('recognizes supported source marketplaces', () => {
    expect(getProductSourceLabel('https://shop123.v.weidian.com/item.html')).toBe(
      'Weidian',
    );
    expect(getProductSourceLabel('https://detail.1688.com/offer/1.html')).toBe('1688');
    expect(getProductSourceLabel('not-a-url')).toBeNull();
  });
});
