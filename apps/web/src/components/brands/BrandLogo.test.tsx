import { fireEvent, render, screen } from '@testing-library/react';
import BrandLogo from './BrandLogo';

describe('BrandLogo', () => {
  it('shows meaningful initials while a remote logo is loading', () => {
    render(
      <BrandLogo
        name="Air Jordan"
        logoUrl="https://example.com/air-jordan.png"
      />,
    );

    expect(screen.getByText('AJ')).toBeInTheDocument();
    expect(screen.getByAltText('Air Jordan')).toHaveClass('opacity-0');
  });

  it('reveals a successfully loaded remote logo', () => {
    render(
      <BrandLogo
        name="Balenciaga"
        logoUrl="https://example.com/balenciaga.png"
      />,
    );

    const image = screen.getByAltText('Balenciaga');
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 200 });
    fireEvent.load(image);

    expect(image).toHaveClass('opacity-100');
  });

  it('keeps a branded fallback when a remote logo fails', () => {
    render(
      <BrandLogo
        name="Air Jordan"
        logoUrl="https://example.com/missing.png"
      />,
    );

    fireEvent.error(screen.getByAltText('Air Jordan'));

    expect(screen.queryByAltText('Air Jordan')).not.toBeInTheDocument();
    expect(screen.getByText('AJ')).toBeInTheDocument();
  });
});
