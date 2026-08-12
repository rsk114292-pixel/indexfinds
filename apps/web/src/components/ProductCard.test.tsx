import { render, screen, fireEvent } from "@testing-library/react";
import ProductCard from "./ProductCard";
import type { ProductListItem } from "@/types";

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

// Mock dependencies
jest.mock("./FavoriteButton", () => ({
  __esModule: true,
  default: ({
    productId,
    variant,
  }: {
    productId: string;
    variant?: string;
  }) => (
    <button data-testid="favorite-btn" data-variant={variant}>
      {productId}
    </button>
  ),
}));

jest.mock("@/lib/image-utils", () => ({
  getProductCardThumbnail: (url: string) => url,
  getImageReferrerPolicy: () => "no-referrer",
}));

jest.mock("@/lib/search-tracking", () => ({
  recordSearchClick: jest.fn().mockResolvedValue(null),
  getCurrentTrackingIdentity: jest.fn(() => ({
    deviceId: "sess_test_device",
    visitId: "visit_test_123",
  })),
  setPageSource: jest.fn(),
  OutboundSource: {
    SEARCH: "search",
    DIRECT: "direct",
    HOME: "home",
    CATEGORY: "category",
    IMAGE_SEARCH: "image_search",
    RECOMMENDATION: "recommendation",
  },
}));

jest.mock("@/stores/useCurrencyStore", () => ({
  useCurrencyStore: () => ({
    currency: "CNY",
    rates: {},
  }),
}));

jest.mock("@/lib/ga-events", () => ({
  trackGA4Event: jest.fn(),
}));

const mockFavorites: Record<string, boolean> = {};
jest.mock("@/stores/useFavoriteStore", () => ({
  useFavoriteStore: (
    selector: (s: { favorites: Record<string, boolean> }) => boolean,
  ) => selector({ favorites: mockFavorites }),
}));

jest.mock("@/lib/utils", () => ({
  formatPriceRange: (min: number, max: number) =>
    min === max ? `¥${min}` : `¥${min} - ¥${max}`,
  convertPrice: (amount: number) => amount,
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(" "),
  getLocalizedName: (obj: { name?: string } | null | undefined) =>
    obj?.name || "",
}));

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({ ok: true });

const mockProduct: ProductListItem = {
  id: "prod-1",
  title: "Test Product Title",
  slug: "test-product-title",
  price: { min: 100, max: 200, currency: "CNY" },
  mainImage: "https://example.com/image.jpg",
  brand: { id: "b1", name: "TestBrand", slug: "testbrand" },
  primaryCategory: { id: "c1", name: "Shoes", slug: "shoes" },
};

describe("ProductCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders product title", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("Test Product Title")).toBeInTheDocument();
  });

  it("renders formatted price range", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("¥100 - ¥200")).toBeInTheDocument();
  });

  it("renders single price when min equals max", () => {
    const product = {
      ...mockProduct,
      price: { min: 150, max: 150, currency: "CNY" },
    };
    render(<ProductCard product={product} />);
    expect(screen.getByText("¥150")).toBeInTheDocument();
  });

  it("renders brand tag when brand exists", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("TestBrand")).toBeInTheDocument();
  });

  it("renders aiBrandName when no brand relation", () => {
    const product = {
      ...mockProduct,
      brand: undefined,
      aiBrandName: "AIBrand",
    };
    render(<ProductCard product={product} />);
    expect(screen.getByText("AIBrand")).toBeInTheDocument();
  });

  it("does not render brand tag when no brand info", () => {
    const product = {
      ...mockProduct,
      brand: undefined,
      aiBrandName: undefined,
    };
    render(<ProductCard product={product} />);
    expect(screen.queryByText("TestBrand")).not.toBeInTheDocument();
  });

  it("不渲染分类标签（即使产品有 primaryCategory）", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("Shoes")).toBeInTheDocument();
  });

  it("links to product detail page", () => {
    render(<ProductCard product={mockProduct} />);
    const link = screen.getAllByRole("link")[0];
    expect(link).toHaveAttribute(
      "href",
      "/products/test-product-title?from=%2F",
    );
  });

  it("prefers explicit returnTo when provided", () => {
    render(
      <ProductCard product={mockProduct} returnTo="/en/search?q=sneaker" />,
    );
    const link = screen.getAllByRole("link")[0];
    expect(link).toHaveAttribute(
      "href",
      "/products/test-product-title?from=%2Fen%2Fsearch%3Fq%3Dsneaker",
    );
  });

  it("renders product image with correct src", () => {
    render(<ProductCard product={mockProduct} />);
    const img = screen.getAllByAltText("Test Product Title")[0];
    expect(img).toHaveAttribute("src", "https://example.com/image.jpg");
  });

  it("uses the shared placeholder when all product images fail", () => {
    render(<ProductCard product={mockProduct} />);
    fireEvent.error(screen.getAllByAltText("Test Product Title")[0]);
    expect(screen.getAllByAltText("Test Product Title")[0]).toHaveAttribute(
      "src",
      "/images/product-placeholder.svg",
    );
  });

  it("renders FavoriteButton with product id and icon variant", () => {
    render(<ProductCard product={mockProduct} />);
    const favBtn = screen.getByTestId("favorite-btn");
    expect(favBtn).toHaveTextContent("prod-1");
    expect(favBtn).toHaveAttribute("data-variant", "icon");
  });

  it("records click on product card click", () => {
    render(<ProductCard product={mockProduct} />);
    const link = screen.getAllByRole("link")[0];
    fireEvent.click(link);
    expect(global.fetch).toHaveBeenCalledWith("/api/products/prod-1/click", {
      method: "POST",
    });
  });

  it("records search click when search tracking props provided", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { recordSearchClick } = require("@/lib/search-tracking");
    render(
      <ProductCard
        product={mockProduct}
        searchLogId="log-1"
        searchQuery="test"
        position={0}
        page={1}
      />,
    );
    const link = screen.getAllByRole("link")[0];
    fireEvent.click(link);
    expect(recordSearchClick).toHaveBeenCalledWith({
      searchLogId: "log-1",
      query: "test",
      productId: "prod-1",
      position: 0,
      page: 1,
      sessionId: "sess_test_device",
      deviceId: "sess_test_device",
      visitId: "visit_test_123",
    });
  });

  it("applies custom className", () => {
    render(<ProductCard product={mockProduct} className="custom-class" />);
    const card = screen.getByRole("article");
    expect(card).toHaveClass("custom-class");
  });

  it("isHot 为 true 时显示 Hot badge", () => {
    render(<ProductCard product={mockProduct} isHot />);
    expect(screen.getByText("hot")).toBeInTheDocument();
  });

  it("isHot 为 false 时不显示 Hot badge", () => {
    render(<ProductCard product={mockProduct} isHot={false} />);
    expect(screen.queryByText("hot")).not.toBeInTheDocument();
  });

  it("有 secondImage 时渲染两张图片", () => {
    const product = {
      ...mockProduct,
      secondImage: "https://example.com/image2.jpg",
    };
    render(<ProductCard product={product} />);
    const images = screen.getAllByAltText("Test Product Title");
    expect(images).toHaveLength(2);
  });

  it("无 secondImage 时只渲染一张图片", () => {
    render(<ProductCard product={mockProduct} />);
    const images = screen.getAllByAltText("Test Product Title");
    expect(images).toHaveLength(1);
  });

  it("已收藏时收藏按钮始终可见", () => {
    mockFavorites["prod-1"] = true;
    render(<ProductCard product={mockProduct} />);
    const favBtn = screen.getByTestId("favorite-btn");
    // 父级 div 应包含 opacity-100，不包含 opacity-0
    const wrapper = favBtn.parentElement!;
    expect(wrapper.className).toContain("opacity-100");
    expect(wrapper.className).not.toContain("opacity-0");
    delete mockFavorites["prod-1"];
  });

  it("未收藏时收藏按钮默认隐藏，hover 显示", () => {
    delete mockFavorites["prod-1"];
    render(<ProductCard product={mockProduct} />);
    const favBtn = screen.getByTestId("favorite-btn");
    const wrapper = favBtn.parentElement!;
    expect(wrapper.className).toContain("opacity-0");
    expect(wrapper.className).toContain("group-hover:opacity-100");
  });
});
