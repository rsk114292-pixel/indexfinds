import { extractProductLinkSearchTerm } from './product-link';

describe('extractProductLinkSearchTerm', () => {
  it('extracts common query-string product ids', () => {
    expect(
      extractProductLinkSearchTerm('https://weidian.com/item.html?itemID=1234567890'),
    ).toBe('1234567890');
    expect(
      extractProductLinkSearchTerm('https://item.taobao.com/item.htm?id=987654321'),
    ).toBe('987654321');
  });

  it('extracts ids from common product paths', () => {
    expect(
      extractProductLinkSearchTerm('https://detail.1688.com/offer/123456789.html'),
    ).toBe('123456789');
  });

  it('rejects non-http and unidentifiable links', () => {
    expect(extractProductLinkSearchTerm('not a link')).toBeNull();
    expect(extractProductLinkSearchTerm('javascript:alert(1)')).toBeNull();
    expect(extractProductLinkSearchTerm('https://example.com/products/shoes')).toBeNull();
  });
});
