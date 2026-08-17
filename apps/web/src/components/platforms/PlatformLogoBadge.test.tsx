import { fireEvent, render, screen } from "@testing-library/react";
import PlatformLogoBadge from "./PlatformLogoBadge";

describe("PlatformLogoBadge", () => {
  it("uses the bundled official logo when no managed logo is configured", () => {
    render(<PlatformLogoBadge platformKey="loongbuy" name="Loongbuy" />);

    expect(screen.getByRole("img", { name: "Loongbuy" })).toHaveAttribute(
      "src",
      "/images/agents/loongbuy.ico",
    );
  });

  it("prefers the bundled official logo over an uploaded managed logo", () => {
    render(
      <PlatformLogoBadge
        platformKey="loongbuy"
        name="Loongbuy"
        logoUrl="/uploads/platform-loongbuy.webp"
      />,
    );

    expect(screen.getByRole("img", { name: "Loongbuy" })).toHaveAttribute(
      "src",
      "/images/agents/loongbuy.ico",
    );
  });

  it("falls back from a missing bundled logo to the managed logo", () => {
    render(
      <PlatformLogoBadge
        platformKey="loongbuy"
        name="Loongbuy"
        logoUrl="/uploads/platform-loongbuy.webp"
      />,
    );

    fireEvent.error(screen.getByRole("img", { name: "Loongbuy" }));

    expect(screen.getByRole("img", { name: "Loongbuy" })).toHaveAttribute(
      "src",
      "/uploads/platform-loongbuy.webp",
    );
  });

  it("uses a managed logo for a platform without a bundled asset", () => {
    render(
      <PlatformLogoBadge
        platformKey="custom-platform"
        name="Custom Platform"
        logoUrl="/uploads/custom-platform.webp"
      />,
    );

    expect(screen.getByRole("img", { name: "Custom Platform" })).toHaveAttribute(
      "src",
      "/uploads/custom-platform.webp",
    );
  });

  it("skips an insecure cross-origin managed logo blocked by the image CSP", () => {
    render(
      <PlatformLogoBadge
        platformKey="loongbuy"
        name="Loongbuy"
        logoUrl="http://localhost:4101/uploads/platform-loongbuy.webp"
      />,
    );

    expect(screen.getByRole("img", { name: "Loongbuy" })).toHaveAttribute(
      "src",
      "/images/agents/loongbuy.ico",
    );
  });

  it("falls back from a missing bundled logo to the official website", () => {
    render(<PlatformLogoBadge platformKey="loongbuy" name="Loongbuy" />);

    fireEvent.error(screen.getByRole("img", { name: "Loongbuy" }));

    expect(screen.getByRole("img", { name: "Loongbuy" })).toHaveAttribute(
      "src",
      "https://www.loongbuy.com/favicon.ico",
    );
  });

  it("uses the letter badge only after every official image source fails", () => {
    render(<PlatformLogoBadge platformKey="loongbuy" name="Loongbuy" />);

    fireEvent.error(screen.getByRole("img", { name: "Loongbuy" }));
    fireEvent.error(screen.getByRole("img", { name: "Loongbuy" }));

    expect(screen.queryByRole("img", { name: "Loongbuy" })).not.toBeInTheDocument();
    expect(screen.getByText("L")).toBeInTheDocument();
  });

  it("uses the official background for a white logo", () => {
    render(<PlatformLogoBadge platformKey="esgobuy" name="ESGOBuy" />);

    expect(screen.getByTitle("ESGOBuy")).toHaveStyle({
      background: "#0065cc",
    });
  });
});
