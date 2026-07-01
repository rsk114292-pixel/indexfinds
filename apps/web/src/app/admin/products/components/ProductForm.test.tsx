import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProductForm } from './ProductForm';

const mockMessage = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
};

jest.mock('@/app/admin/useAdminAuthReady', () => ({
  useAdminAuthReady: jest.fn(() => ({ token: 'test-token' })),
}));

jest.mock('@/lib/api', () => ({
  get: jest.fn(),
  request: jest.fn(),
  API_BASE_URL: 'http://localhost:4101',
}));

jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PointerSensor: function PointerSensor() {},
  useSensor: jest.fn(() => ({})),
  useSensors: jest.fn(() => []),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSortable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
  horizontalListSortingStrategy: {},
  arrayMove: <T,>(array: T[]) => array,
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Translate: {
      toString: () => undefined,
    },
  },
}));

jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  const React = jest.requireActual('react');

  const Upload = ({
    fileList = [],
    itemRender,
    children,
  }: {
    fileList?: Array<{ uid: string; name: string }>;
    itemRender?: (
      originNode: React.ReactElement,
      file: { uid: string; name: string },
    ) => React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div data-testid="mock-upload">
      {fileList.map((file) => {
        const originNode = <div key={file.uid}>{file.name}</div>;
        return (
          <div key={file.uid} data-testid={`upload-item-${file.uid}`}>
            {itemRender ? itemRender(originNode, file) : originNode}
          </div>
        );
      })}
      {children}
    </div>
  );

  Upload.Dragger = function MockUploadDragger({
    children,
  }: { children?: React.ReactNode }) {
    return (
      <div data-testid="mock-upload-dragger">
        {children}
      </div>
    );
  };

  return {
    ...actual,
    Upload,
    App: {
      useApp: () => ({ message: mockMessage }),
    },
  };
});

const { get, request } = jest.requireMock('@/lib/api') as {
  get: jest.Mock;
  request: jest.Mock;
};

const baseInitialData = {
  id: 'product-1',
  title: 'Test Product',
  description: 'Test description',
  images: [],
  qcMedia: [
    { id: 'qc-1', type: 'image' as const, url: 'https://example.com/qc-1.jpg', sortOrder: 0 },
    { id: 'qc-2', type: 'image' as const, url: 'https://example.com/qc-2.jpg', sortOrder: 1 },
  ],
  priceMin: 100,
  priceMax: 120,
  status: 'draft',
};

describe('ProductForm', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
    Object.defineProperty(window, 'scrollTo', {
      writable: true,
      value: jest.fn(),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockImplementation(async (url: string) => {
      if (url === '/categories') return [];
      if (url === '/brands') return { data: [] };
      return [];
    });
  });

  it('supports batch deletion for selected QC media', async () => {
    render(
      <ProductForm
        initialData={{ ...baseInitialData }}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />,
    );

    await screen.findByDisplayValue('Test Product');

    fireEvent.click(screen.getByLabelText('选择 qc-photo-0'));
    expect(screen.getByText('已选中 1 项')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /批量删除/i }));

    await waitFor(() => {
      expect(screen.queryByText('qc-photo-0')).not.toBeInTheDocument();
    });

    expect(screen.getByText('qc-photo-1')).toBeInTheDocument();
    expect(mockMessage.success).toHaveBeenCalledWith('已删除 1 项 QC 媒体');
  }, 15000);

  it('appends pasted clipboard images to the QC list', async () => {
    request.mockResolvedValueOnce({ url: 'https://example.com/pasted-qc.jpg' });

    render(
      <ProductForm
        initialData={{ ...baseInitialData, qcMedia: [] }}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />,
    );

    await screen.findByDisplayValue('Test Product');

    const pasteZone = screen.getByRole('button', { name: /粘贴上传 QC 图片/i });
    const pastedFile = new File(['image-binary'], 'clipboard.png', { type: 'image/png' });

    fireEvent.paste(pasteZone, {
      clipboardData: {
        items: [
          {
            type: 'image/png',
            getAsFile: () => pastedFile,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith(
        'http://localhost:4101/upload/image',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        }),
      );
    });

    expect(await screen.findByText('clipboard.png')).toBeInTheDocument();
    expect(mockMessage.success).toHaveBeenCalledWith('已追加 1 张 QC 图');
  });
});
