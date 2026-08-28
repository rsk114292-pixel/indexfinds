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

  it('uses the EastMallBuy shortlist triage sequence', () => {
    render(
      <TenantProvider tenant={getTenantConfigByHost('eastmallbuyindex.com')}>
        <UsfansQuickStart />
      </TenantProvider>,
    );

    expect(screen.getByText('Score the shortlist')).toBeInTheDocument();
    expect(screen.getByText('Separate platform evidence')).toBeInTheDocument();
    expect(screen.getByText('Verify campaign terms')).toBeInTheDocument();
    expect(screen.getByText('Open the shortlist worksheet')).toHaveAttribute(
      'href',
      '/spreadsheet',
    );
    expect(screen.queryByText('Browse all products')).not.toBeInTheDocument();
  });

  it('uses the Fishgoo search-mode and evidence sequence', () => {
    render(
      <TenantProvider tenant={getTenantConfigByHost('fishgooindex.com')}>
        <UsfansQuickStart />
      </TenantProvider>,
    );

    expect(screen.getByText('Choose the query mode')).toBeInTheDocument();
    expect(screen.getByText('Inspect visible evidence')).toBeInTheDocument();
    expect(screen.getByText('Separate parcel inputs')).toBeInTheDocument();
    expect(screen.getByText('Open the evidence checklist')).toHaveAttribute(
      'href',
      '/fishgoo-checklist',
    );
    expect(screen.queryByText('Browse all products')).not.toBeInTheDocument();
  });

  it('uses the KameyMall category and QC comparison sequence', () => {
    render(
      <TenantProvider tenant={getTenantConfigByHost('kameymallindex.com')}>
        <UsfansQuickStart />
      </TenantProvider>,
    );

    expect(screen.getByText('Map category fields')).toBeInTheDocument();
    expect(screen.getByText('Compare historical and current QC')).toBeInTheDocument();
    expect(screen.getByText('Use actual parcel measurements')).toBeInTheDocument();
    expect(screen.getByText('Compare the QC record')).toHaveAttribute(
      'href',
      '/review',
    );
    expect(screen.queryByText('Browse all products')).not.toBeInTheDocument();
  });
});
