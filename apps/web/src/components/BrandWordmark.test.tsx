import { render, screen } from '@testing-library/react';
import BrandWordmark from './BrandWordmark';
import TenantProvider from './TenantProvider';
import { getTenantConfigByHost } from '@/lib/tenant-config';

describe('BrandWordmark', () => {
  it('uses the same vector mark as the site favicon family', () => {
    const { container } = render(<BrandWordmark />);
    const image = container.querySelector('img');

    expect(image).toHaveAttribute('src', '/icons/logo.svg');
    expect(image).toHaveAttribute('width', '32');
    expect(image).toHaveAttribute('height', '32');
    expect(image).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders USFans without an IndexFinds ownership label', () => {
    render(
      <TenantProvider tenant={getTenantConfigByHost('usfansindex.net')}>
        <BrandWordmark />
      </TenantProvider>,
    );

    expect(screen.getByText('USFans Index')).toBeInTheDocument();
    expect(screen.queryByText(/by IndexFinds/i)).not.toBeInTheDocument();
  });
});
