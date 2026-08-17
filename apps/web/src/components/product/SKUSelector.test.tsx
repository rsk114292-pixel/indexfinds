import { fireEvent, render, screen } from "@testing-library/react";
import SKUSelector from "./SKUSelector";
import type { SKU } from "@/types";

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { n?: number }) =>
    values?.n ? `${key}-${values.n}` : key,
}));

const createSku = (attributes: Record<string, string> = {}): SKU => ({
  id: "sku-1",
  name: "Default",
  price: 100,
  currency: "CNY",
  stock: 10,
  attributes,
});

const defaultProps = {
  selectedAttributes: {},
  onAttributeChange: jest.fn(),
  onImageSelect: jest.fn(),
  currentImageIndex: 0,
  selectedSku: null,
};

describe("SKUSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not show an error for a single SKU without selectable attributes", () => {
    const { container } = render(
      <SKUSelector
        {...defaultProps}
        skus={[createSku()]}
        productImages={["https://example.com/product.jpg"]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("skuNotAvailable")).not.toBeInTheDocument();
  });

  it("uses product images as style options when SKU rows are absent", () => {
    render(
      <SKUSelector
        {...defaultProps}
        skus={[]}
        productImages={[
          "https://example.com/style-1.jpg",
          "https://example.com/style-2.jpg",
        ]}
      />,
    );

    const styleButtons = screen.getAllByRole("button", { name: /styleN-/ });
    expect(styleButtons).toHaveLength(2);

    fireEvent.click(styleButtons[1]);
    expect(defaultProps.onImageSelect).toHaveBeenCalledWith(1);
  });

  it("does not add image styles in size-only mode", () => {
    const { container } = render(
      <SKUSelector
        {...defaultProps}
        skus={[createSku()]}
        productImages={[
          "https://example.com/style-1.jpg",
          "https://example.com/style-2.jpg",
        ]}
        sizeOnly
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("continues to render real SKU attributes", () => {
    render(
      <SKUSelector
        {...defaultProps}
        skus={[createSku({ Size: "M" }), createSku({ Size: "L" })]}
        productImages={["https://example.com/product.jpg"]}
      />,
    );

    expect(screen.getByRole("button", { name: "M" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "L" })).toBeInTheDocument();
  });
});
