import { render, screen, fireEvent } from '@testing-library/react';
import ProductTabs from './ProductTabs';

describe('ProductTabs', () => {
  it('renders all three tabs', () => {
    render(<ProductTabs />);

    expect(screen.getByRole('tab', { name: 'tabDescription' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'tabAttributes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'tabQcPhotos' })).toBeInTheDocument();
  });

  it('shows tab labels', () => {
    render(<ProductTabs />);

    expect(screen.getByText('tabDescription')).toBeInTheDocument();
    expect(screen.getByText('tabAttributes')).toBeInTheDocument();
    expect(screen.getByText('tabQcPhotos')).toBeInTheDocument();
  });

  it('shows description content when provided', () => {
    const description = '<p>Test product description</p>';
    render(<ProductTabs description={description} />);

    fireEvent.click(screen.getByRole('tab', { name: 'tabDescription' }));

    expect(screen.getByText('Test product description')).toBeInTheDocument();
  });

  it('shows "No description available" when description is empty', () => {
    render(<ProductTabs description={null} />);

    fireEvent.click(screen.getByRole('tab', { name: 'tabDescription' }));

    expect(screen.getByText('noDescription')).toBeInTheDocument();
  });

  it('renders attributes when provided', () => {
    const attributes = {
      Material: 'Leather',
      Color: 'Black',
    };
    render(<ProductTabs attributes={attributes} />);

    // Switch to attributes tab
    fireEvent.click(screen.getByRole('tab', { name: 'tabAttributes' }));

    expect(screen.getByText('Material:')).toBeInTheDocument();
    expect(screen.getByText('Leather')).toBeInTheDocument();
    expect(screen.getByText('Color:')).toBeInTheDocument();
    expect(screen.getByText('Black')).toBeInTheDocument();
  });

  it('sanitizes HTML description before rendering', () => {
    const maliciousHtml = '<p>Safe</p><script>alert("xss")</script>';
    render(<ProductTabs description={maliciousHtml} />);

    fireEvent.click(screen.getByRole('tab', { name: 'tabDescription' }));

    expect(screen.getByText('Safe')).toBeInTheDocument();
    // script 标签应被移除
    expect(screen.queryByText('alert("xss")')).not.toBeInTheDocument();
  });

  it('DOMPurify 加载失败时 fallback 到原始内容', () => {
    jest.mock('isomorphic-dompurify', () => {
      throw new Error('SSR: jsdom stylesheet not found');
    });

    const description = '<p>Fallback content</p>';
    render(<ProductTabs description={description} />);

    fireEvent.click(screen.getByRole('tab', { name: 'tabDescription' }));

    expect(screen.getByText('Fallback content')).toBeInTheDocument();

    jest.unmock('isomorphic-dompurify');
  });

  it('renders QC photos empty state', () => {
    render(<ProductTabs />);

    // Switch to QC tab
    fireEvent.click(screen.getByRole('tab', { name: 'tabQcPhotos' }));

    expect(screen.getByText('qcPhotosPlaceholder')).toBeInTheDocument();
  });

  it('renders QC photos when provided', () => {
    render(
      <ProductTabs
        qcPhotos={[
          { type: 'image', url: 'https://example.com/qc-2.jpg', sortOrder: 1 },
          { type: 'image', url: 'https://example.com/qc-1.jpg', sortOrder: 0 },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'tabQcPhotos' }));

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('src', 'https://example.com/qc-1.jpg');
  });

  it('shows a 5-photo QC gallery preview with view-all entry', () => {
    render(
      <ProductTabs
        qcPhotos={Array.from({ length: 8 }, (_, index) => ({
          type: 'image' as const,
          url: `https://example.com/qc-${index}.jpg`,
          sortOrder: index,
        }))}
      />,
    );

    expect(screen.getAllByRole('img')).toHaveLength(5);
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /viewAll/i })).toHaveLength(2);
  });

  it('opens QC preview overlay from view-all entry', () => {
    render(
      <ProductTabs
        qcPhotos={Array.from({ length: 6 }, (_, index) => ({
          type: 'image' as const,
          url: `https://example.com/qc-${index}.jpg`,
          sortOrder: index,
        }))}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'viewAll 6' }));

    expect(screen.getByRole('button', { name: 'Close QC preview' })).toBeInTheDocument();
    expect(screen.getByText('6 / 6')).toBeInTheDocument();
  });

  it('opens QC preview overlay when image is clicked', () => {
    render(
      <ProductTabs
        qcPhotos={[
          { type: 'image', url: 'https://example.com/qc-1.jpg', sortOrder: 0 },
          { type: 'image', url: 'https://example.com/qc-2.jpg', sortOrder: 1 },
        ]}
      />,
    );

    fireEvent.click(screen.getAllByRole('img')[0]);

    expect(screen.getByRole('button', { name: 'Close QC preview' })).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('renders thumbnail strip inside QC preview overlay', () => {
    render(
      <ProductTabs
        qcPhotos={[
          { type: 'image', url: 'https://example.com/qc-1.jpg', sortOrder: 0 },
          { type: 'image', url: 'https://example.com/qc-2.jpg', sortOrder: 1 },
          { type: 'image', url: 'https://example.com/qc-3.jpg', sortOrder: 2 },
        ]}
      />,
    );

    fireEvent.click(screen.getAllByRole('img')[0]);

    expect(screen.getByRole('button', { name: 'QC thumbnail 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'QC thumbnail 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'QC thumbnail 3' })).toBeInTheDocument();
  });

  it('supports swipe gestures inside QC preview overlay', () => {
    render(
      <ProductTabs
        qcPhotos={[
          { type: 'image', url: 'https://example.com/qc-1.jpg', sortOrder: 0 },
          { type: 'image', url: 'https://example.com/qc-2.jpg', sortOrder: 1 },
          { type: 'image', url: 'https://example.com/qc-3.jpg', sortOrder: 2 },
        ]}
      />,
    );

    fireEvent.click(screen.getAllByRole('img')[0]);

    const previewImage = screen.getAllByAltText('QC Photo 1').at(-1)!;
    fireEvent.touchStart(previewImage, {
      touches: [{ clientX: 220, clientY: 120 }],
    });
    fireEvent.touchEnd(previewImage, {
      changedTouches: [{ clientX: 120, clientY: 126 }],
    });

    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });
});
