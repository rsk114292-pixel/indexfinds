import { fireEvent, render, screen } from "@testing-library/react";
import SearchQuickFilters from "./SearchQuickFilters";

const mockPush = jest.fn();
let mockParams = new URLSearchParams("q=shoes&page=3");

jest.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/search",
}));

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockParams,
}));

jest.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: { value?: string }) =>
    key === "quickFilters" ? "Quick filters" : `Filter by ${values?.value}`,
}));

const categories = [
  { id: "1", name: "Sneakers", slug: "sneakers", level: 0, count: 42 },
];

describe("SearchQuickFilters", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockParams = new URLSearchParams("q=shoes&page=3");
  });

  it("adds a quick filter and resets pagination", () => {
    render(<SearchQuickFilters categories={categories} />);

    fireEvent.click(screen.getByRole("button", { name: "Filter by Sneakers" }));

    expect(mockPush).toHaveBeenCalledWith(
      "/search?q=shoes&categories=sneakers",
    );
  });

  it("removes an already selected quick filter", () => {
    mockParams = new URLSearchParams("q=shoes&categories=sneakers");
    render(<SearchQuickFilters categories={categories} />);

    fireEvent.click(screen.getByRole("button", { name: "Filter by Sneakers" }));

    expect(mockPush).toHaveBeenCalledWith("/search?q=shoes");
  });
});
