import { render, screen } from '@testing-library/react';
import TenantProvider from '@/components/TenantProvider';
import { getTenantConfigByHost } from '@/lib/tenant-config';
import UsfansQuickStart from './UsfansQuickStart';

jest.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<'a'>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

describe('UsfansQuickStart', () => {
  it('uses USFans source-record links instead of the generic product feed', () => {
    render(
      <TenantProvider tenant={getTenantConfigByHost('usfansindex.net')}>
        <UsfansQuickStart />
      </TenantProvider>,
    );

    expect(screen.getByText('Define the source record')).toBeInTheDocument();
    expect(screen.getByText('Set category-specific checks')).toBeInTheDocument();
    expect(screen.queryByText('Browse all products')).not.toBeInTheDocument();
    expect(screen.getByText('Review product check fields')).toHaveAttribute(
      'href',
      '/categories',
    );
  });

  it('uses the YoyBuy spreadsheet, QC and parcel sequence', () => {
    render(
      <TenantProvider tenant={getTenantConfigByHost('yoybuyindex.com')}>
        <UsfansQuickStart />
      </TenantProvider>,
    );

    expect(screen.getByText('Build the research row')).toBeInTheDocument();
    expect(screen.getByText('Prepare the QC handoff')).toBeInTheDocument();
    expect(screen.getByText('Add parcel facts when measured')).toBeInTheDocument();
    expect(screen.getByText('Open the QC checklist')).toHaveAttribute(
      'href',
      '/qc-checklist',
    );
  });
});
