import { render, waitFor } from '@testing-library/react';
import DocumentLocaleSync from './DocumentLocaleSync';

describe('DocumentLocaleSync', () => {
  it('keeps the document language in sync after a client-side locale change', async () => {
    const { rerender } = render(<DocumentLocaleSync locale="zh" />);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('lang', 'zh');
      expect(document.documentElement).toHaveAttribute('dir', 'ltr');
    });

    rerender(<DocumentLocaleSync locale="ar" />);

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('lang', 'ar');
      expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    });
  });
});
