import { render, screen } from "@testing-library/react";
import ItaobuyOfficialPromotion from "./ItaobuyOfficialPromotion";

describe("ItaobuyOfficialPromotion", () => {
  it("links the current campaign to the official detail page", () => {
    render(<ItaobuyOfficialPromotion />);

    const link = screen.getByRole("link", { name: /daily 8kg\/5kg/i });
    expect(link).toHaveAttribute(
      "href",
      "https://www.itaobuy.com/help/detail?namespaceCode=advertise&articleCode=order_giveaway_8_23",
    );
    expect(link).toHaveAttribute(
      "rel",
      "nofollow sponsored noopener noreferrer",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });
});
