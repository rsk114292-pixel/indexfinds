import { BadRequestException } from '@nestjs/common';
import {
  assertProductPublicationQuality,
  getProductPublicationIssues,
} from './product-publication-quality';

const validProduct = {
  title: 'Classic Track Jacket',
  description: 'A complete product description generated after AI analysis.',
  primaryCategoryId: 'category-id',
  priceMin: 199,
  priceMax: 299,
  mainImage: 'https://cdn.example.com/product.jpg',
};

describe('product publication quality', () => {
  it('allows a complete product', () => {
    expect(getProductPublicationIssues(validProduct)).toEqual([]);
    expect(() => assertProductPublicationQuality(validProduct)).not.toThrow();
  });

  it.each([
    [{ priceMin: 0 }, 'invalid_price'],
    [{ priceMin: null }, 'invalid_price'],
    [{ mainImage: '', images: [] }, 'missing_image'],
    [{ description: '' }, 'missing_ai_description'],
    [{ potentialMixedProduct: true }, 'mixed_product'],
  ])('blocks incomplete automatic publication', (override, expectedCode) => {
    const issues = getProductPublicationIssues({
      ...validProduct,
      ...override,
    });
    expect(issues.map((issue) => issue.code)).toContain(expectedCode);
  });

  it.each(['replica', 'FAKE', '高仿', '复刻'])(
    'requires manual review for high-risk term %s',
    (term) => {
      const product = {
        ...validProduct,
        description: `Product marked ${term}`,
      };
      expect(getProductPublicationIssues(product)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'high_risk_content' }),
        ]),
      );
      expect(() => assertProductPublicationQuality(product)).toThrow(
        BadRequestException,
      );
    },
  );

  it.each([
    'Design Unknown Product Clothing',
    'Design Contact Information Card Electronics',
    'Design QR Code Contact Card Electronics',
    'Design Customer Service Headset Illustration Electronics',
    'Design Product Link Instruction Electronics',
    'Purchase at the new link',
    'Design First Supplet Promotional Poster Electronics',
    '扫码联系客服',
  ])('blocks seller contact or redirect content: %s', (title) => {
    expect(
      getProductPublicationIssues({ ...validProduct, title }).map(
        (issue) => issue.code,
      ),
    ).toContain('seller_contact_content');
  });
});
