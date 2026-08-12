import { fireEvent, render, screen } from "@testing-library/react";
import ImageWithFallback, { PRODUCT_IMAGE_FALLBACK } from "./ImageWithFallback";

describe("ImageWithFallback", () => {
  it("replaces a failed remote image with the shared placeholder", () => {
    render(
      <ImageWithFallback
        src="https://example.com/missing.jpg"
        alt="Missing product"
        width={200}
        height={200}
      />,
    );

    fireEvent.error(screen.getByAltText("Missing product"));

    expect(screen.getByAltText("Missing product")).toHaveAttribute(
      "src",
      PRODUCT_IMAGE_FALLBACK,
    );
  });
});
