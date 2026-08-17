import { render, screen } from '@testing-library/react';
import FavoriteButton from './FavoriteButton';
import { useAuthStore } from '@/stores/useAuthStore';

describe('FavoriteButton', () => {
  beforeEach(() => {
    useAuthStore.setState({
      _hasHydrated: true,
      isAuthenticated: false,
      token: null,
      user: null,
    });
  });

  it('does not show a dead favorite action while public login is disabled', () => {
    render(
      <FavoriteButton
        productId="product-1"
        loginHref="/en/login?redirect=%2Fen"
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
