import { isMeaningfulHotSearch } from "./HotSearches";

describe("isMeaningfulHotSearch", () => {
  it("keeps useful product searches", () => {
    expect(isMeaningfulHotSearch("adidas")).toBe(true);
    expect(isMeaningfulHotSearch("running shoes")).toBe(true);
  });

  it("removes numeric and placeholder searches", () => {
    expect(isMeaningfulHotSearch("1234567890")).toBe(false);
    expect(isMeaningfulHotSearch("test")).toBe(false);
    expect(isMeaningfulHotSearch("demo")).toBe(false);
  });
});
