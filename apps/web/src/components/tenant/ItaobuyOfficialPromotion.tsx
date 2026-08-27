const PROMOTION_URL =
  "https://www.itaobuy.com/help/detail?namespaceCode=advertise&articleCode=order_giveaway_8_23";

export default function ItaobuyOfficialPromotion() {
  return (
    <aside
      aria-label="iTaoBuy official promotion"
      className="border-b border-[#ffb35f] bg-[linear-gradient(90deg,#fb7d38,#ff641e_52%,#fd9c36)] px-4 text-white"
    >
      <a
        href={PROMOTION_URL}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        className="mx-auto flex min-h-11 max-w-7xl items-center justify-center gap-3 py-2 text-center font-bold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white sm:min-h-[52px]"
      >
        <span className="hidden rounded-full bg-white px-3 py-1 text-sm font-extrabold text-[#f15b24] sm:inline">
          Free
        </span>
        <span className="text-sm leading-5 sm:text-base">
          Daily 8kg/5kg Free Shipping - 7 Days in a Row!
        </span>
        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#f15b24] sm:text-sm">
          Learn More
        </span>
      </a>
    </aside>
  );
}
