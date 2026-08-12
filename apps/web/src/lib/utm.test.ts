import { appendUTMParams } from './utm';

describe('appendUTMParams', () => {
  it('defaults ordinary page links to product_share', () => {
    expect(appendUTMParams('https://indexfinds.com/en/products', 'copy')).toBe(
      'https://indexfinds.com/en/products?utm_source=copy_link&utm_medium=referral&utm_campaign=product_share',
    );
  });

  it('defaults referral-wrapped page links to referral_page_share', () => {
    expect(
      appendUTMParams(
        'https://indexfinds.com/r/CAHXBV?redirect=%2Fen%2Fproducts',
        'copy',
      ),
    ).toBe(
      'https://indexfinds.com/r/CAHXBV?redirect=%2Fen%2Fproducts&utm_source=copy_link&utm_medium=referral&utm_campaign=referral_page_share',
    );
  });

  it('preserves an explicit campaign when provided', () => {
    expect(
      appendUTMParams('https://indexfinds.com/r/CAHXBV', 'telegram', {
        campaign: 'referral_invite',
      }),
    ).toBe(
      'https://indexfinds.com/r/CAHXBV?utm_source=telegram&utm_medium=social&utm_campaign=referral_invite',
    );
  });
});
