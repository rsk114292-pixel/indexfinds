import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { BrandFilter } from './BrandFilter';

const brands = Array.from({ length: 20 }, (_, index) => ({
  label: `Brand ${index}`,
  value: `brand-${index}`,
  count: 20 - index,
}));

function ControlledBrandFilter() {
  const [expanded, setExpanded] = useState(false);

  return (
    <BrandFilter
      brands={brands}
      selectedBrands={[]}
      onChange={jest.fn()}
      expanded={expanded}
      onToggleExpand={() => setExpanded((value) => !value)}
      showCount={6}
    />
  );
}

describe('BrandFilter', () => {
  it('expands inside a bounded scroll region instead of stretching the page', () => {
    render(<ControlledBrandFilter />);

    expect(screen.queryByLabelText('Filter by brand Brand 19')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show more brands' }));

    const lastBrand = screen.getByLabelText('Filter by brand Brand 19');
    expect(lastBrand).toBeInTheDocument();
    expect(lastBrand.closest('div')).toHaveClass('max-h-72', 'overflow-y-auto');
    expect(screen.getByRole('button', { name: 'Show less brands' })).toBeInTheDocument();
  });

  it('shows every matching search result inside the bounded region', () => {
    render(
      <BrandFilter
        brands={brands}
        selectedBrands={[]}
        onChange={jest.fn()}
        showCount={2}
      />,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Brand 1' } });

    const lastMatch = screen.getByLabelText('Filter by brand Brand 19');
    expect(lastMatch).toBeInTheDocument();
    expect(lastMatch.closest('div')).toHaveClass('max-h-72', 'overflow-y-auto');
  });
});
