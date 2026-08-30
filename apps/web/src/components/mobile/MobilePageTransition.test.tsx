import { render, screen } from '@testing-library/react';
import MobilePageTransition from './MobilePageTransition';

const mockUseReducedMotion = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => '/en',
}));

jest.mock('framer-motion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
  motion: {
    div: ({
      children,
      initial,
      animate,
    }: {
      children: React.ReactNode;
      initial: unknown;
      animate: unknown;
    }) => (
      <div
        data-testid="page-transition"
        data-initial={JSON.stringify(initial)}
        data-animate={JSON.stringify(animate)}
      >
        {children}
      </div>
    ),
  },
}));

describe('MobilePageTransition', () => {
  it('restores visible content when reduced motion is enabled', () => {
    mockUseReducedMotion.mockReturnValue(true);

    render(
      <MobilePageTransition>
        <p>Page content</p>
      </MobilePageTransition>,
    );

    expect(screen.getByTestId('page-transition')).toHaveAttribute(
      'data-animate',
      JSON.stringify({ opacity: 1, transition: { duration: 0 } }),
    );
    expect(screen.getByText('Page content')).toBeVisible();
  });
});
