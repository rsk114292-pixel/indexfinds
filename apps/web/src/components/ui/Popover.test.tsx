import { render, screen } from '@testing-library/react';
import Popover from './Popover';

describe('Popover', () => {
  it('only links the trigger to a panel while the panel is mounted', () => {
    const renderPopover = (open: boolean) => (
      <Popover
        open={open}
        onOpenChange={jest.fn()}
        trigger={({ controls, expanded }) => (
          <button aria-controls={controls} aria-expanded={expanded}>
            Toggle
          </button>
        )}
      >
        Panel content
      </Popover>
    );

    const { rerender } = render(renderPopover(false));
    const trigger = screen.getByRole('button', { name: 'Toggle' });

    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(screen.queryByText('Panel content')).not.toBeInTheDocument();

    rerender(renderPopover(true));
    const panel = screen.getByRole('dialog');

    expect(trigger).toHaveAttribute('aria-controls', panel.id);
    expect(panel.id).not.toBe('');
  });
});
