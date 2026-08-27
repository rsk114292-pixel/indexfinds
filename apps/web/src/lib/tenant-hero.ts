export interface TenantHeroVisual {
  desktopPath: string;
  mobilePath: string;
  alt: string;
  backgroundColor: string;
  accentColor: string;
  desktopObjectPosition: string;
  mobileObjectPosition: string;
  desktopOverlay: string;
  mobileOverlay: string;
}

const TENANT_HERO_VISUALS: Record<string, TenantHeroVisual> = {
  "acbuyindex.com": {
    desktopPath: "/tenants/acbuy/hero-desktop.webp",
    mobilePath: "/tenants/acbuy/hero-mobile.webp",
    alt: "ACBuy dragon flying above clouds on an airplane",
    backgroundColor: "#0b2d3a",
    accentColor: "#78e2c4",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(5,31,43,0.96) 0%, rgba(5,31,43,0.88) 38%, rgba(5,31,43,0.36) 68%, rgba(5,31,43,0.08) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(5,31,43,0.98) 0%, rgba(5,31,43,0.9) 50%, rgba(5,31,43,0.16) 100%)",
  },
  "allchinabuyindex.com": {
    desktopPath: "/tenants/allchinabuy/hero-desktop.webp",
    mobilePath: "/tenants/allchinabuy/hero-mobile.webp",
    alt: "AllChinaBuy branded aircraft above clouds",
    backgroundColor: "#123c50",
    accentColor: "#66e0c0",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(8,35,47,0.94) 0%, rgba(8,35,47,0.82) 42%, rgba(8,35,47,0.26) 72%, rgba(8,35,47,0.06) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(8,35,47,0.98) 0%, rgba(8,35,47,0.88) 54%, rgba(8,35,47,0.12) 100%)",
  },
  "allchinabuyfinder.com": {
    desktopPath: "/tenants/allchinabuyfinder/hero-desktop.webp",
    mobilePath: "/tenants/allchinabuyfinder/hero-mobile.webp",
    alt: "AllChinaBuy branded aircraft crossing a sunset cloudscape",
    backgroundColor: "#102f42",
    accentColor: "#ffd39a",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(9,34,47,0.96) 0%, rgba(9,34,47,0.86) 42%, rgba(9,34,47,0.2) 72%, rgba(9,34,47,0.03) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(9,34,47,0.98) 0%, rgba(9,34,47,0.88) 55%, rgba(9,34,47,0.08) 100%)",
  },
  "bbdbuyeufinds.com": {
    desktopPath: "/tenants/bbdbuyeufinds/hero-desktop.webp",
    mobilePath: "/tenants/bbdbuyeufinds/hero-mobile.webp",
    alt: "BBDbuy branded aircraft crossing a cloudscape used for EU product research",
    backgroundColor: "#10243a",
    accentColor: "#8fdcf4",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(10,31,51,0.98) 0%, rgba(10,31,51,0.88) 40%, rgba(10,31,51,0.24) 68%, rgba(10,31,51,0.04) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(10,31,51,0.99) 0%, rgba(10,31,51,0.93) 57%, rgba(10,31,51,0.28) 100%)",
  },
  "bbdbuyeus.com": {
    desktopPath: "/tenants/bbdbuyeus/hero-desktop.webp",
    mobilePath: "/tenants/bbdbuyeus/hero-mobile.webp",
    alt: "BBDbuy branded aircraft flying above clouds at sunset",
    backgroundColor: "#111b29",
    accentColor: "#ffbd73",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(12,24,39,0.98) 0%, rgba(12,24,39,0.9) 42%, rgba(12,24,39,0.3) 68%, rgba(12,24,39,0.05) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(12,24,39,0.99) 0%, rgba(12,24,39,0.93) 57%, rgba(12,24,39,0.3) 100%)",
  },
  "bbdbuyeusheet.com": {
    desktopPath: "/tenants/bbdbuyeusheet/hero-desktop.webp",
    mobilePath: "/tenants/bbdbuyeusheet/hero-mobile.webp",
    alt: "BBDbuy branded aircraft above clouds used for an EU product research sheet",
    backgroundColor: "#251d15",
    accentColor: "#f6cd78",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(37,29,21,0.98) 0%, rgba(37,29,21,0.9) 42%, rgba(37,29,21,0.3) 70%, rgba(37,29,21,0.06) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(37,29,21,0.99) 0%, rgba(37,29,21,0.94) 58%, rgba(37,29,21,0.28) 100%)",
  },
  "boonbuyfind.net": {
    desktopPath: "/tenants/boonbuyfind/hero-desktop.webp",
    mobilePath: "/tenants/boonbuyfind/hero-mobile.webp",
    alt: "BoonBuy otter character holding a phone and shopping bag beside a global delivery illustration",
    backgroundColor: "#20150d",
    accentColor: "#71e3dc",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(270deg, rgba(32,21,13,0.98) 0%, rgba(32,21,13,0.93) 43%, rgba(32,21,13,0.46) 67%, rgba(32,21,13,0.04) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(32,21,13,0.99) 0%, rgba(32,21,13,0.94) 56%, rgba(32,21,13,0.28) 100%)",
  },
  "cnshopperindex.com": {
    desktopPath: "/tenants/cnshopper/hero.jpg",
    mobilePath: "/tenants/cnshopper/hero.jpg",
    alt: "CNShopper product discovery banner with a mobile catalog, shopping bag and parcels",
    backgroundColor: "#071a39",
    accentColor: "#ffb25f",
    desktopObjectPosition: "66% center",
    mobileObjectPosition: "66% center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(7,26,57,0.99) 0%, rgba(7,26,57,0.93) 43%, rgba(7,26,57,0.48) 68%, rgba(7,26,57,0.12) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(7,26,57,0.99) 0%, rgba(7,26,57,0.95) 58%, rgba(7,26,57,0.38) 100%)",
  },
  "eastmallbuyindex.com": {
    desktopPath: "/tenants/eastmallbuy/hero-desktop.webp",
    mobilePath: "/tenants/eastmallbuy/hero-mobile.webp",
    alt: "Sunrise above a winding river and mountain landscape",
    backgroundColor: "#0d2d4a",
    accentColor: "#f4c675",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(7,31,54,0.98) 0%, rgba(7,31,54,0.9) 42%, rgba(7,31,54,0.27) 72%, rgba(7,31,54,0.04) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(7,31,54,0.99) 0%, rgba(7,31,54,0.92) 57%, rgba(7,31,54,0.22) 100%)",
  },
  "fishgooindex.com": {
    desktopPath: "/tenants/fishgoo/hero-desktop.webp",
    mobilePath: "/tenants/fishgoo/hero-mobile.webp",
    alt: "Blue ocean horizon beneath a star-filled night sky",
    backgroundColor: "#061326",
    accentColor: "#8fdcf1",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(4,17,34,0.98) 0%, rgba(4,17,34,0.91) 42%, rgba(4,17,34,0.34) 70%, rgba(4,17,34,0.08) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(4,17,34,0.99) 0%, rgba(4,17,34,0.92) 55%, rgba(4,17,34,0.2) 100%)",
  },
  "goatedbuyindex.com": {
    desktopPath: "/tenants/goatedbuy/hero-desktop.webp",
    mobilePath: "/tenants/goatedbuy/hero-mobile.webp",
    alt: "Morning light over a forest lake surrounded by mountains",
    backgroundColor: "#102219",
    accentColor: "#f4d38a",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(12,31,21,0.98) 0%, rgba(12,31,21,0.9) 42%, rgba(12,31,21,0.3) 70%, rgba(12,31,21,0.06) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(12,31,21,0.99) 0%, rgba(12,31,21,0.92) 56%, rgba(12,31,21,0.2) 100%)",
  },
  "gtbuyindex.com": {
    desktopPath: "/tenants/gtbuy/hero-desktop.webp",
    mobilePath: "/tenants/gtbuy/hero-mobile.webp",
    alt: "Sunrise above the curved horizon of Earth",
    backgroundColor: "#071322",
    accentColor: "#ffb07d",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center bottom",
    desktopOverlay:
      "linear-gradient(90deg, rgba(3,11,22,0.98) 0%, rgba(3,14,28,0.91) 42%, rgba(3,15,30,0.38) 70%, rgba(3,15,30,0.08) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(3,11,22,0.99) 0%, rgba(3,14,28,0.93) 58%, rgba(3,15,30,0.25) 100%)",
  },
  "hipobuyindex.com": {
    desktopPath: "/tenants/hipobuy/hero-desktop.webp",
    mobilePath: "/tenants/hipobuy/hero-mobile.webp",
    alt: "Violet twilight over a mountain lake beneath a planet",
    backgroundColor: "#080f28",
    accentColor: "#ec9cff",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(5,9,31,0.97) 0%, rgba(5,9,31,0.88) 43%, rgba(5,9,31,0.32) 71%, rgba(5,9,31,0.05) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(5,9,31,0.99) 0%, rgba(5,9,31,0.91) 58%, rgba(5,9,31,0.22) 100%)",
  },
  "hoobuyindex.net": {
    desktopPath: "/tenants/hoobuy/hero-desktop.webp",
    mobilePath: "/tenants/hoobuy/hero-mobile.webp",
    alt: "Golden sunrise over a mountain lake and meadow",
    backgroundColor: "#101722",
    accentColor: "#ffc86e",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(9,15,25,0.98) 0%, rgba(9,15,25,0.9) 42%, rgba(9,15,25,0.3) 70%, rgba(9,15,25,0.04) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(9,15,25,0.99) 0%, rgba(9,15,25,0.91) 58%, rgba(9,15,25,0.18) 100%)",
  },
  "joyabuyfinds.com": {
    desktopPath: "/tenants/joyabuyfinds/hero-desktop.webp",
    mobilePath: "/tenants/joyabuyfinds/hero-mobile.webp",
    alt: "Twilight world representing open-ended JoyaGoo product discovery",
    backgroundColor: "#170b2d", accentColor: "#80ddcf",
    desktopObjectPosition: "center", mobileObjectPosition: "center",
    desktopOverlay: "linear-gradient(90deg, rgba(19,7,39,0.98) 0%, rgba(27,10,49,0.88) 43%, rgba(24,10,47,0.28) 72%, rgba(24,10,47,0.04) 100%)",
    mobileOverlay: "linear-gradient(0deg, rgba(19,7,39,0.99) 0%, rgba(27,10,49,0.92) 58%, rgba(24,10,47,0.18) 100%)",
  },
  "joyagooindex.com": {
    desktopPath: "/tenants/joyagoo/hero-desktop.webp",
    mobilePath: "/tenants/joyagoo/hero-mobile.webp",
    alt: "Cosmic horizon representing a staged JoyaGoo product evidence record",
    backgroundColor: "#071529", accentColor: "#f0c15b",
    desktopObjectPosition: "center", mobileObjectPosition: "center",
    desktopOverlay: "linear-gradient(90deg, rgba(4,15,31,0.98) 0%, rgba(5,22,43,0.9) 43%, rgba(8,29,54,0.3) 72%, rgba(8,29,54,0.04) 100%)",
    mobileOverlay: "linear-gradient(0deg, rgba(4,15,31,0.99) 0%, rgba(5,22,43,0.93) 58%, rgba(8,29,54,0.2) 100%)",
  },
  "kameymallindex.com": {
    desktopPath: "/tenants/kameymall/hero-desktop.webp",
    mobilePath: "/tenants/kameymall/hero-mobile.webp",
    alt: "Colorful world representing KameyMall category-to-product research",
    backgroundColor: "#1f0d24", accentColor: "#f6c44a",
    desktopObjectPosition: "center", mobileObjectPosition: "center",
    desktopOverlay: "linear-gradient(90deg, rgba(29,9,34,0.98) 0%, rgba(38,12,42,0.9) 43%, rgba(49,15,50,0.31) 72%, rgba(49,15,50,0.04) 100%)",
    mobileOverlay: "linear-gradient(0deg, rgba(29,9,34,0.99) 0%, rgba(38,12,42,0.93) 58%, rgba(49,15,50,0.2) 100%)",
  },
  "itaobuyindex.com": {
    desktopPath: "/tenants/itaobuy/hero-desktop.webp",
    mobilePath: "/tenants/itaobuy/hero-mobile.webp",
    alt: "Dark mountain archive landscape crossed by a warm orange horizon",
    backgroundColor: "#0b1727",
    accentColor: "#ffb44a",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(7,18,32,0.99) 0%, rgba(7,18,32,0.91) 43%, rgba(7,18,32,0.36) 70%, rgba(7,18,32,0.06) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(7,18,32,0.99) 0%, rgba(7,18,32,0.92) 57%, rgba(7,18,32,0.20) 100%)",
  },
  "cssbuyindex.com": {
    desktopPath: "/tenants/cssbuy/hero-desktop.webp",
    mobilePath: "/tenants/cssbuy/hero-mobile.webp",
    alt: "Emerald planet horizon in space",
    backgroundColor: "#010c09",
    accentColor: "#a9e47a",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(1,12,9,0.97) 0%, rgba(1,12,9,0.88) 40%, rgba(1,12,9,0.28) 70%, rgba(1,12,9,0.05) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(1,12,9,0.98) 0%, rgba(1,12,9,0.9) 56%, rgba(1,12,9,0.18) 100%)",
  },
  "cssbuycatalog.com": {
    desktopPath: "/tenants/cssbuycatalog/hero-desktop.webp",
    mobilePath: "/tenants/cssbuycatalog/hero-mobile.webp",
    alt: "Blue worldscape viewed from above the horizon",
    backgroundColor: "#041424",
    accentColor: "#7de5f3",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(3,18,33,0.97) 0%, rgba(3,18,33,0.86) 40%, rgba(3,18,33,0.22) 70%, rgba(3,18,33,0.04) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(3,18,33,0.98) 0%, rgba(3,18,33,0.9) 55%, rgba(3,18,33,0.12) 100%)",
  },
  "cssbuyitems.com": {
    desktopPath: "/tenants/cssbuyitems/hero-desktop.webp",
    mobilePath: "/tenants/cssbuyitems/hero-mobile.webp",
    alt: "Green mountain valley with a river beneath a clear sky",
    backgroundColor: "#102315",
    accentColor: "#c8f3a6",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(7,25,13,0.96) 0%, rgba(7,25,13,0.84) 40%, rgba(7,25,13,0.22) 70%, rgba(7,25,13,0.03) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(7,25,13,0.98) 0%, rgba(7,25,13,0.9) 54%, rgba(7,25,13,0.12) 100%)",
  },
  "kakobuyindex.net": {
    desktopPath: "/tenants/kakobuyindex/hero-desktop.webp",
    mobilePath: "/tenants/kakobuyindex/hero-mobile.webp",
    alt: "Purple planet above a dark mountain lake",
    backgroundColor: "#080d1e",
    accentColor: "#ff526a",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(8,13,30,0.98) 0%, rgba(8,13,30,0.9) 43%, rgba(8,13,30,0.3) 72%, rgba(8,13,30,0.08) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(8,13,30,0.99) 0%, rgba(8,13,30,0.91) 58%, rgba(8,13,30,0.22) 100%)",
  },
  "kakobuyitems.com": {
    desktopPath: "/tenants/kakobuyitems/hero-desktop.webp",
    mobilePath: "/tenants/kakobuyitems/hero-mobile.webp",
    alt: "Sunrise reflected across a mountain lake beneath a pale moon",
    backgroundColor: "#071523",
    accentColor: "#ffb2c0",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(5,17,30,0.97) 0%, rgba(5,17,30,0.87) 43%, rgba(5,17,30,0.28) 72%, rgba(5,17,30,0.08) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(5,17,30,0.98) 0%, rgba(5,17,30,0.88) 57%, rgba(5,17,30,0.24) 100%)",
  },
  "litbuyindex.com": {
    desktopPath: "/tenants/litbuyindex/hero-index.svg",
    mobilePath: "/tenants/litbuyindex/hero-index.svg",
    alt: "Structured LitBuy query index with evidence rows and review states",
    backgroundColor: "#11100c",
    accentColor: "#ffd400",
    desktopObjectPosition: "right center",
    mobileObjectPosition: "67% center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(17,16,12,0.99) 0%, rgba(17,16,12,0.93) 42%, rgba(17,16,12,0.36) 69%, rgba(17,16,12,0.08) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(17,16,12,0.99) 0%, rgba(17,16,12,0.92) 61%, rgba(17,16,12,0.22) 100%)",
  },
  "litbuyitems.com": {
    desktopPath: "/tenants/litbuyitems/hero-jacket.webp",
    mobilePath: "/tenants/litbuyitems/hero-jacket.webp",
    alt: "Yellow and black jacket used as a LitBuy item-category visual",
    backgroundColor: "#16130d",
    accentColor: "#ffd400",
    desktopObjectPosition: "right center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(22,19,13,0.99) 0%, rgba(22,19,13,0.94) 45%, rgba(22,19,13,0.52) 68%, rgba(22,19,13,0.1) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(22,19,13,0.99) 0%, rgba(22,19,13,0.94) 58%, rgba(22,19,13,0.28) 100%)",
  },
  "litbuyproducts.com": {
    desktopPath: "/tenants/litbuyproducts/hero-electronics.webp",
    mobilePath: "/tenants/litbuyproducts/hero-electronics.webp",
    alt: "Headphones, game controller and mobile device representing LitBuy electronics research",
    backgroundColor: "#0d1520",
    accentColor: "#29b6f6",
    desktopObjectPosition: "right center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(13,21,32,0.99) 0%, rgba(13,21,32,0.93) 44%, rgba(13,21,32,0.42) 69%, rgba(13,21,32,0.08) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(13,21,32,0.99) 0%, rgba(13,21,32,0.92) 58%, rgba(13,21,32,0.22) 100%)",
  },
  "loongbuys.net": {
    desktopPath: "/tenants/loongbuys/hero-route.svg",
    mobilePath: "/tenants/loongbuys/hero-route.svg",
    alt: "LoongBuy evidence route from product link through QC and parcel checks",
    backgroundColor: "#17120e",
    accentColor: "#ffba52",
    desktopObjectPosition: "right center",
    mobileObjectPosition: "66% center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(23,18,14,0.99) 0%, rgba(23,18,14,0.94) 44%, rgba(23,18,14,0.38) 70%, rgba(23,18,14,0.08) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(23,18,14,0.99) 0%, rgba(23,18,14,0.93) 61%, rgba(23,18,14,0.22) 100%)",
  },
  "lovegobuyindex.com": {
    desktopPath: "/tenants/lovegobuy/hero-order-board.svg",
    mobilePath: "/tenants/lovegobuy/hero-order-board.svg",
    alt: "LoveGoBuy product directory and current order stage board",
    backgroundColor: "#24131f",
    accentColor: "#ffb4ce",
    desktopObjectPosition: "right center",
    mobileObjectPosition: "66% center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(36,19,31,0.99) 0%, rgba(36,19,31,0.94) 44%, rgba(36,19,31,0.39) 70%, rgba(36,19,31,0.08) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(36,19,31,0.99) 0%, rgba(36,19,31,0.93) 61%, rgba(36,19,31,0.24) 100%)",
  },
  "mulebuyindex.net": {
    desktopPath: "/tenants/mulebuyindex/hero-shoes.webp",
    mobilePath: "/tenants/mulebuyindex/hero-shoes.webp",
    alt: "Purple shoes used to frame a MuleBuy category query and row review",
    backgroundColor: "#161022",
    accentColor: "#d6a8ff",
    desktopObjectPosition: "right center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(22,16,34,0.99) 0%, rgba(22,16,34,0.94) 45%, rgba(22,16,34,0.46) 69%, rgba(22,16,34,0.09) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(22,16,34,0.99) 0%, rgba(22,16,34,0.93) 58%, rgba(22,16,34,0.3) 100%)",
  },
  "mulebuyitems.com": {
    desktopPath: "/tenants/mulebuyitems/hero-outerwear.webp",
    mobilePath: "/tenants/mulebuyitems/hero-outerwear.webp",
    alt: "Illustrated shopper examining the construction of an outerwear item",
    backgroundColor: "#160c26",
    accentColor: "#c4a1ff",
    desktopObjectPosition: "right center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(22,12,38,0.99) 0%, rgba(22,12,38,0.92) 44%, rgba(22,12,38,0.4) 69%, rgba(22,12,38,0.1) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(22,12,38,0.99) 0%, rgba(22,12,38,0.92) 58%, rgba(22,12,38,0.3) 100%)",
  },
  "oopbuyindex.net": {
    desktopPath: "/tenants/oopbuyindex/hero-score.svg",
    mobilePath: "/tenants/oopbuyindex/hero-score.svg",
    alt: "Oopbuy product link scorecard with source and evidence review states",
    backgroundColor: "#091927",
    accentColor: "#73efe4",
    desktopObjectPosition: "right center",
    mobileObjectPosition: "72% center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(9,25,39,0.99) 0%, rgba(9,25,39,0.94) 44%, rgba(9,25,39,0.36) 70%, rgba(9,25,39,0.08) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(9,25,39,0.99) 0%, rgba(9,25,39,0.93) 61%, rgba(9,25,39,0.24) 100%)",
  },
  "orientdigindex.com": {
    desktopPath: "/tenants/orientdigindex/hero-category.webp",
    mobilePath: "/tenants/orientdigindex/hero-category.webp",
    alt: "Shoes, bag and hoodie arranged for product-specific evidence comparison",
    backgroundColor: "#111315",
    accentColor: "#ff9c61",
    desktopObjectPosition: "right center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(17,19,21,0.99) 0%, rgba(17,19,21,0.94) 44%, rgba(17,19,21,0.45) 70%, rgba(17,19,21,0.1) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(17,19,21,0.99) 0%, rgba(17,19,21,0.93) 59%, rgba(17,19,21,0.28) 100%)",
  },
  "parcelupindex.com": {
    desktopPath: "/tenants/parcelupindex/hero-packages.webp",
    mobilePath: "/tenants/parcelupindex/hero-packages.webp",
    alt: "Parcel boxes framing a product-to-parcel evidence record",
    backgroundColor: "#15110d",
    accentColor: "#ffc166",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(21,17,13,0.99) 0%, rgba(21,17,13,0.93) 46%, rgba(21,17,13,0.64) 73%, rgba(21,17,13,0.32) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(21,17,13,0.99) 0%, rgba(21,17,13,0.93) 60%, rgba(21,17,13,0.5) 100%)",
  },
  "sugargooindex.net": {
    desktopPath: "/tenants/sugargooindex/hero-shoes.webp",
    mobilePath: "/tenants/sugargooindex/hero-shoes.webp",
    alt: "Footwear used for a category-specific Sugargoo product and QC review",
    backgroundColor: "#24120d",
    accentColor: "#ffc266",
    desktopObjectPosition: "right center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(36,18,13,0.99) 0%, rgba(36,18,13,0.94) 48%, rgba(36,18,13,0.58) 74%, rgba(36,18,13,0.18) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(36,18,13,0.99) 0%, rgba(36,18,13,0.94) 62%, rgba(36,18,13,0.42) 100%)",
  },
  "superbuydeals.com": {
    desktopPath: "/tenants/superbuydeals/hero-offers.webp",
    mobilePath: "/tenants/superbuydeals/hero-offers.webp",
    alt: "Product category grid behind a Superbuy offer verification ledger",
    backgroundColor: "#240c0a",
    accentColor: "#ffc24c",
    desktopObjectPosition: "right center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(36,12,10,0.99) 0%, rgba(36,12,10,0.94) 46%, rgba(36,12,10,0.54) 72%, rgba(36,12,10,0.18) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(36,12,10,0.99) 0%, rgba(36,12,10,0.94) 60%, rgba(36,12,10,0.4) 100%)",
  },
  "superbuyindex.com": {
    desktopPath: "/tenants/superbuyindex/hero-query.webp",
    mobilePath: "/tenants/superbuyindex/hero-query.webp",
    alt: "Superbuy category sprite organized as a structured query index",
    backgroundColor: "#111722",
    accentColor: "#f29b38",
    desktopObjectPosition: "right center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(17,23,34,0.99) 0%, rgba(17,23,34,0.94) 46%, rgba(17,23,34,0.55) 72%, rgba(17,23,34,0.2) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(17,23,34,0.99) 0%, rgba(17,23,34,0.94) 60%, rgba(17,23,34,0.42) 100%)",
  },
  "superbuyitems.com": {
    desktopPath: "/tenants/superbuyitems/hero-categories.webp",
    mobilePath: "/tenants/superbuyitems/hero-categories.webp",
    alt: "Blue, white and coral product-category illustrations",
    backgroundColor: "#052e5f",
    accentColor: "#ff765f",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(3,31,67,0.99) 0%, rgba(3,31,67,0.92) 44%, rgba(3,31,67,0.4) 70%, rgba(3,31,67,0.12) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(3,31,67,0.99) 0%, rgba(3,31,67,0.93) 58%, rgba(3,31,67,0.36) 100%)",
  },
  "ydaexpress.net": {
    desktopPath: "/tenants/ydaexpress-net/hero-parcel.svg",
    mobilePath: "/tenants/ydaexpress-net/hero-parcel.svg",
    alt: "Parcel preparation board with measurement and handoff markers",
    backgroundColor: "#041a23",
    accentColor: "#58dfcc",
    desktopObjectPosition: "center",
    mobileObjectPosition: "72% center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(4,26,35,0.99) 0%, rgba(4,26,35,0.94) 46%, rgba(4,26,35,0.52) 72%, rgba(4,26,35,0.12) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(4,26,35,0.99) 0%, rgba(4,26,35,0.94) 62%, rgba(4,26,35,0.4) 100%)",
  },
  "ydaexpress.org": {
    desktopPath: "/tenants/ydaexpress-org/hero-sources.svg",
    mobilePath: "/tenants/ydaexpress-org/hero-sources.svg",
    alt: "Dated source review ledger with a document verification mark",
    backgroundColor: "#17120f",
    accentColor: "#ef934f",
    desktopObjectPosition: "center",
    mobileObjectPosition: "78% center",
    desktopOverlay:
      "linear-gradient(270deg, rgba(23,18,15,0.99) 0%, rgba(23,18,15,0.95) 46%, rgba(23,18,15,0.55) 72%, rgba(23,18,15,0.16) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(23,18,15,0.99) 0%, rgba(23,18,15,0.95) 62%, rgba(23,18,15,0.42) 100%)",
  },
  "yoybuyindex.com": {
    desktopPath: "/tenants/yoybuy/hero-desktop.webp",
    mobilePath: "/tenants/yoybuy/hero-mobile.webp",
    alt: "Warehouse conveyor and parcels representing a YoyBuy source-to-shipping research record",
    backgroundColor: "#081321",
    accentColor: "#f0b45d",
    desktopObjectPosition: "center",
    mobileObjectPosition: "center",
    desktopOverlay:
      "linear-gradient(90deg, rgba(8,19,33,0.99) 0%, rgba(8,19,33,0.93) 45%, rgba(8,19,33,0.45) 72%, rgba(8,19,33,0.12) 100%)",
    mobileOverlay:
      "linear-gradient(0deg, rgba(8,19,33,0.99) 0%, rgba(8,19,33,0.94) 60%, rgba(8,19,33,0.34) 100%)",
  },
};

export function getTenantHeroVisual(
  domain?: string | null,
): TenantHeroVisual | null {
  return domain ? TENANT_HERO_VISUALS[domain] || null : null;
}
