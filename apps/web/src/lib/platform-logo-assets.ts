export interface PlatformLogoAsset {
  src: string;
  remoteSrc: string;
  faviconSrc?: string;
  remoteFaviconSrc?: string;
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
    src: "/tenants/kakobuyindex/official-app-icon.png",
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
    faviconSrc: "/images/agents/joyagoo-favicon.png",
    remoteFaviconSrc: "https://joyagoo.com/site.ico",
  },
  sugargoo: {
    src: "/images/agents/sugargoo.png",
    remoteSrc: "https://www.sugargoo.com/favicon.ico",
    faviconSrc: "/images/agents/sugargoo-favicon.png",
    remoteFaviconSrc: "https://www.sugargoo.com/favicon.ico",
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
    src: "/tenants/cssbuy/favicon-48x48.png",
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
  acbuy: {
    src: "/images/agents/acbuy.ico",
    remoteSrc: "https://www.acbuy.com/favicon1.ico",
  },
  allchinabuy: {
    src: "/images/agents/allchinabuy.ico",
    remoteSrc: "https://www.allchinabuy.com/favicon.ico",
  },
  bbdbuy: {
    src: "/images/agents/bbdbuy.ico",
    remoteSrc: "https://www.bbdbuyeu.com/favicon.ico",
  },
  cnshopper: {
    src: "/images/agents/cnshopper.png",
    remoteSrc:
      "https://api.cnshopper.com/storage/admin/20260323-LXIFltkjsB35tcs5.png",
    faviconSrc: "/images/agents/cnshopper-favicon.png",
    remoteFaviconSrc:
      "https://api.cnshopper.com/storage/admin/20260323-LXIFltkjsB35tcs5.png",
  },
  eastmallbuy: {
    src: "/images/agents/eastmallbuy.png",
    faviconSrc: "/tenants/eastmallbuy/favicon-48x48.png",
    remoteSrc: "https://eastmallbuy.com/web/favicon.jpg",
  },
  goatedbuy: {
    src: "/images/agents/goatedbuy.svg",
    remoteSrc: "https://goatedbuy.com/static/logo_white.svg?v=2",
  },
  gtbuy: {
    src: "/images/agents/gtbuy.png",
    remoteSrc: "https://gtbuy.com/static/favicon/64x64.png",
  },
  hoobuy: {
    src: "/images/agents/hoobuy.ico",
    remoteSrc: "https://cdn.static.hoobuy.com/favicon/favicon_64.ico",
  },
  itaobuy: {
    src: "/images/agents/itaobuy.ico",
    remoteSrc: "https://www.itaobuy.com/favicon.ico",
  },
  kameymall: {
    src: "/images/agents/kameymall.png",
    remoteSrc: "https://www.kameymall.com/favicon.ico",
  },
  mulebuy: {
    src: "/images/agents/mulebuy.ico",
    remoteSrc: "https://mulebuy.com/favicon.ico?v=20260114",
  },
  orientdig: {
    src: "/images/agents/orientdig.png",
    remoteSrc: "https://orientdig.com/site.ico",
  },
  parcelup: {
    src: "/images/agents/parcelup.png",
    remoteSrc: "https://parcelup.com/favicon.ico",
  },
  yoybuy: {
    src: "/images/agents/yoybuy.ico",
    remoteSrc: "https://img.yoybuy.com/v7/imgs/favicon.ico",
  },
  pantherbuy: {
    src: "/images/agents/pantherbuy.png",
    remoteSrc: "https://pantherbuy.com/favicon.ico",
  },
  ponybuy: {
    src: "/images/agents/ponybuy.png",
    remoteSrc: "https://www.ponybuy.com/favicon.ico",
  },
  ossbuy: {
    src: "/images/agents/ossbuy.png",
    remoteSrc: "https://www.ossbuy.com/favicon.ico",
  },
  okeyhaul: {
    src: "/images/agents/okeyhaul.png",
    remoteSrc: "https://www.okeyhaul.com/logo.png",
  },
  dgobuy: {
    src: "/images/agents/dgobuy.png",
    remoteSrc: "https://dgobuy.com/images/jy.ico?id=bbd0d1dde6339378b921",
  },
  hubbuy: {
    src: "/images/agents/hubbuy.png",
    remoteSrc: "https://cdn.hubbuy.app/favicon/favicon_64.ico",
  },
  tigbuy: {
    src: "/images/agents/tigbuy.png",
    remoteSrc: "https://tigbuy.com/favicon.ico",
  },
  spanbuy: {
    src: "/images/agents/spanbuy.ico",
    remoteSrc: "https://spanbuy.com/favicon.ico",
  },
  vigorbuy: {
    src: "/images/agents/vigorbuy.ico",
    remoteSrc: "https://cdn.static.vigorbuy.com/assets/favicon/favicon_64.ico",
  },
};

export function getOfficialPlatformLogo(
  platformKey: string,
): PlatformLogoAsset | undefined {
  return OFFICIAL_PLATFORM_LOGOS[platformKey.trim().toLowerCase()];
}
