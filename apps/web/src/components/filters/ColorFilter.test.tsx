import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { ColorFilter } from './ColorFilter';

const colors = Array.from({ length: 20 }, (_, index) => ({
  label: `Color ${index}`,
  value: `color-${index}`,
  count: 20 - index,
}));

function ControlledColorFilter() {
  const [expanded, setExpanded] = useState(false);

  return (
    <ColorFilter
      colors={colors}
      selectedColors={[]}
      onChange={jest.fn()}
      expanded={expanded}
      onToggleExpand={() => setExpanded((value) => !value)}
      showCount={6}
    />
  );
}

describe('ColorFilter', () => {
  it('expands inside a bounded scroll region instead of stretching the page', () => {
    render(<ControlledColorFilter />);

    expect(screen.queryByLabelText('Filter by color Color 19')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show more colors' }));

    const lastColor = screen.getByLabelText('Filter by color Color 19');
    expect(lastColor).toBeInTheDocument();
    expect(lastColor.closest('div')).toHaveClass('max-h-72', 'overflow-y-auto');
    expect(screen.getByRole('button', { name: 'Show less colors' })).toBeInTheDocument();
  });
});
