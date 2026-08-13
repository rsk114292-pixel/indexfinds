export interface PlatformLogoAsset {
  src: string;
  remoteSrc: string;
  background?: string;
}

export const OFFICIAL_PLATFORM_LOGOS: Readonly<
  Record<string, PlatformLogoAsset>
> = {
  loongbuy: {
    src: "/images/agents/loongbuy.ico",
    remoteSrc: "https://www.loongbuy.com/favicon.ico",
  },
  kakobuy: {
    src: "/images/agents/kakobuy.ico",
    remoteSrc: "https://kakobuy.com/favicon.ico",
  },
  lovegobuy: {
    src: "/images/agents/lovegobuy.ico",
    remoteSrc: "https://www.lovegobuy.com/favicon.ico",
  },
  litbuy: {
    src: "/images/agents/litbuy.png",
    remoteSrc: "https://litbuy.com/favicon-new.ico",
  },
  joyagoo: {
    src: "/images/agents/joyagoo.png",
    remoteSrc:
      "https://mgt.joyagoo.com/wp-content/themes/joyabuy/assets/img/joyagoo-logo.png",
  },
  sugargoo: {
    src: "/images/agents/sugargoo.png",
    remoteSrc: "https://www.sugargoo.com/favicon.ico",
  },
  rizzitgo: {
    src: "/images/agents/rizzitgo.png",
    remoteSrc: "https://rizzitgo.com/favicon.png",
  },
  oopbuy: {
    src: "/images/agents/oopbuy.png",
    remoteSrc: "https://oopbuy.com/favicon.png",
  },
  superbuy: {
    src: "/images/agents/superbuy.svg",
    remoteSrc:
      "https://cdn.superbuy.com/starit-superbuy/dist/img/favicon/favicon.svg",
  },
  usfans: {
    src: "/images/agents/usfans.png",
    remoteSrc: "https://www.usfans.com/favicon.png",
  },
  hipobuy: {
    src: "/images/agents/hipobuy.png",
    remoteSrc: "https://hipobuy.com/static/favicon/64x64.png",
  },
  boonbuy: {
    src: "/images/agents/boonbuy.png",
    remoteSrc: "https://boonbuy.com/favicon.ico",
  },
  cssbuy: {
    src: "/images/agents/cssbuy.ico",
    remoteSrc: "https://www.cssbuy.com/favicon.ico",
  },
  pikobuy: {
    src: "/images/agents/pikobuy.ico",
    remoteSrc: "https://www.pikobuy.com/favicon.ico",
  },
  esgobuy: {
    src: "/images/agents/esgobuy.svg",
    remoteSrc: "https://www.esgobuy.com/img/es-logo-white.DWuBym1F.svg",
    background: "#0065cc",
  },
  hubbuycn: {
    src: "/images/agents/hubbuycn.png",
    remoteSrc: "https://www.hubbuycn.com/favicon.ico",
  },
  fishgoo: {
    src: "/images/agents/fishgoo.ico",
    remoteSrc: "https://www.fishgoo.com/favicon.ico",
  },
  mycnbox: {
    src: "/images/agents/mycnbox.ico",
    remoteSrc: "https://mycnbox.com/logo.ico",
  },
  ootdbuy: {
    src: "/images/agents/ootdbuy.ico",
    remoteSrc: "https://ootdbuy.com/favicon.ico",
  },
  fansbuy: {
    src: "/images/agents/fansbuy.png",
    remoteSrc: "https://fansbuy.com/favicon2.ico",
  },
  lolobuy: {
    src: "/images/agents/lolobuy.png",
    remoteSrc: "https://www.lolobuy.com/loloBuyIcon.png",
  },
};

export function getOfficialPlatformLogo(
  platformKey: string,
): PlatformLogoAsset | undefined {
  return OFFICIAL_PLATFORM_LOGOS[platformKey.trim().toLowerCase()];
}
