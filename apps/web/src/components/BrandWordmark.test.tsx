import { render } from '@testing-library/react';
import BrandWordmark from './BrandWordmark';

describe('BrandWordmark', () => {
  it('uses the same vector mark as the site favicon family', () => {
    const { container } = render(<BrandWordmark />);
    const image = container.querySelector('img');

    expect(image).toHaveAttribute('src', '/icons/logo.svg');
    expect(image).toHaveAttribute('width', '32');
    expect(image).toHaveAttribute('height', '32');
    expect(image).toHaveAttribute('aria-hidden', 'true');
  });
});
