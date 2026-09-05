import { fireEvent, render, screen } from '@testing-library/react';
import BrandLogo from './BrandLogo';

describe('BrandLogo', () => {
  it('keeps a remote logo hidden until it loads without inventing a badge', () => {
    render(
      <BrandLogo
        name="Air Jordan"
        logoUrl="https://example.com/air-jordan.png"
      />,
    );

    const image = screen.getByAltText('Air Jordan');
    expect(image.parentElement).toHaveClass('opacity-0');
    expect(screen.queryByText('AJ')).not.toBeInTheDocument();
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

    expect(image.parentElement).toHaveClass('opacity-100');
  });

  it('removes a remote logo when it fails', () => {
    render(
      <BrandLogo
        name="Air Jordan"
        logoUrl="https://example.com/missing.png"
      />,
    );

    fireEvent.error(screen.getByAltText('Air Jordan'));

    expect(screen.queryByAltText('Air Jordan')).not.toBeInTheDocument();
    expect(screen.queryByText('AJ')).not.toBeInTheDocument();
  });

  it('renders nothing when no verified logo exists', () => {
    const { container } = render(<BrandLogo name="Air Jordan" />);

    expect(container).toBeEmptyDOMElement();
  });
});
