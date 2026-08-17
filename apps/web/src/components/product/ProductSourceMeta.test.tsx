import { render, screen } from '@testing-library/react';
import ProductSourceMeta from './ProductSourceMeta';

jest.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () =>
    (key: string, values?: Record<string, string>) => {
      if (key === 'updatedValue') return `Updated ${values?.date}`;
      if (key === 'reportProduct') return 'Report product';
      if (key === 'sourceMissing') return 'Source unavailable';
      return key;
    },
}));

describe('ProductSourceMeta', () => {
  it('formats the updated date in UTC so SSR and hydration stay identical', () => {
    render(
      <ProductSourceMeta
        updatedAt="2026-08-17T23:30:00.000Z"
        productId="product-1"
        productTitle="Test product"
      />,
    );

    expect(screen.getByText('Updated Aug 17, 2026')).toBeInTheDocument();
    expect(screen.queryByText('Updated Aug 18, 2026')).not.toBeInTheDocument();
  });
});
