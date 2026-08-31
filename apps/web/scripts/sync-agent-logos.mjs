import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(SCRIPT_DIR, "../public/images/agents");

// Keep these sources on the platforms' own domains. The UI serves local copies
// so opening the agent picker never depends on third-party requests.
const LOGO_SOURCES = {
  loongbuy: {
    source: "https://www.loongbuy.com/favicon.ico",
    filename: "loongbuy.ico",
  },
  kakobuy: {
    source: "https://kakobuy.com/favicon.ico",
    filename: "kakobuy.ico",
  },
  lovegobuy: {
    source: "https://www.lovegobuy.com/favicon.ico",
    filename: "lovegobuy.ico",
  },
  litbuy: {
    source: "https://litbuy.com/favicon-new.ico",
    filename: "litbuy.png",
  },
  joyagoo: {
    source:
      "https://mgt.joyagoo.com/wp-content/themes/joyabuy/assets/img/joyagoo-logo.png",
    filename: "joyagoo.png",
  },
  sugargoo: {
    source: "https://www.sugargoo.com/favicon.ico",
    filename: "sugargoo.png",
  },
  rizzitgo: {
    source: "https://rizzitgo.com/favicon.png",
    filename: "rizzitgo.png",
  },
  oopbuy: {
    source: "https://oopbuy.com/favicon.png",
    filename: "oopbuy.png",
  },
  superbuy: {
    source:
      "https://cdn.superbuy.com/starit-superbuy/dist/img/favicon/favicon.svg",
    filename: "superbuy.svg",
  },
  usfans: {
    source: "https://www.usfans.com/favicon.png",
    filename: "usfans.png",
  },
  hipobuy: {
    source: "https://hipobuy.com/static/favicon/64x64.png",
    filename: "hipobuy.png",
  },
  boonbuy: {
    source: "https://boonbuy.com/favicon.ico",
    filename: "boonbuy.png",
  },
  cssbuy: {
    source: "https://www.cssbuy.com/favicon.ico",
    filename: "cssbuy.ico",
  },
  pikobuy: {
    source: "https://www.pikobuy.com/favicon.ico",
    filename: "pikobuy.ico",
  },
  esgobuy: {
    source: "https://www.esgobuy.com/img/es-logo-white.DWuBym1F.svg",
    filename: "esgobuy.svg",
  },
  hubbuycn: {
    source: "https://www.hubbuycn.com/favicon.ico",
    filename: "hubbuycn.png",
  },
  fishgoo: {
    source: "https://www.fishgoo.com/favicon.ico",
    filename: "fishgoo.ico",
  },
  mycnbox: {
    source: "https://mycnbox.com/logo.ico",
    filename: "mycnbox.ico",
  },
  ootdbuy: {
    source: "https://ootdbuy.com/favicon.ico",
    filename: "ootdbuy.ico",
  },
  fansbuy: {
    source: "https://fansbuy.com/favicon2.ico",
    filename: "fansbuy.png",
  },
  lolobuy: {
    source: "https://www.lolobuy.com/loloBuyIcon.png",
    filename: "lolobuy.png",
  },
  acbuy: {
    source: "https://www.acbuy.com/favicon1.ico",
    filename: "acbuy.ico",
  },
  allchinabuy: {
    source: "https://www.allchinabuy.com/favicon.ico",
    filename: "allchinabuy.ico",
  },
  bbdbuy: {
    source: "https://www.bbdbuyeu.com/favicon.ico",
    filename: "bbdbuy.ico",
  },
  cnshopper: {
    source:
      "https://api.cnshopper.com/storage/admin/20260323-LXIFltkjsB35tcs5.png",
    filename: "cnshopper.png",
  },
  eastmallbuy: {
    source: "https://eastmallbuy.com/web/favicon.jpg",
    filename: "eastmallbuy.png",
  },
  goatedbuy: {
    source: "https://goatedbuy.com/static/logo_white.svg?v=2",
    filename: "goatedbuy.svg",
  },
  gtbuy: {
    source: "https://gtbuy.com/static/favicon/64x64.png",
    filename: "gtbuy.png",
  },
  hoobuy: {
    source: "https://cdn.static.hoobuy.com/favicon/favicon_64.ico",
    filename: "hoobuy.ico",
  },
  itaobuy: {
    source: "https://www.itaobuy.com/favicon.ico",
    filename: "itaobuy.ico",
  },
  kameymall: {
    source: "https://www.kameymall.com/favicon.ico",
    filename: "kameymall.png",
  },
  mulebuy: {
    source: "https://mulebuy.com/favicon.ico?v=20260114",
    filename: "mulebuy.ico",
  },
  orientdig: {
    source: "https://orientdig.com/site.ico",
    filename: "orientdig.png",
  },
  parcelup: {
    source: "https://parcelup.com/favicon.ico",
    filename: "parcelup.png",
  },
  yoybuy: {
    source: "https://img.yoybuy.com/v7/imgs/favicon.ico",
    filename: "yoybuy.ico",
  },
};

// Some official wordmarks are rectangular and work well in the header badge,
// but Google requires a square favicon. Keep a separate source-backed favicon
// for those platforms instead of stretching or replacing the visible logo.
const FAVICON_SOURCES = {
  joyagoo: {
    source: "https://joyagoo.com/site.ico",
    filename: "joyagoo-favicon.png",
  },
  cnshopper: {
    source:
      "https://api.cnshopper.com/storage/admin/20260323-LXIFltkjsB35tcs5.png",
    filename: "cnshopper-favicon.png",
  },
  sugargoo: {
    source: "https://www.sugargoo.com/favicon.ico",
    filename: "sugargoo-favicon.png",
    padToSquare: true,
  },
};

function detectExtension(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    return ".png";
  }
  if (bytes.subarray(0, 4).equals(Buffer.from("00000100", "hex"))) {
    return ".ico";
  }
  if (bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"))) {
    return ".jpg";
  }
  if (bytes.subarray(0, 512).toString("utf8").includes("<svg")) {
    return ".svg";
  }
  return undefined;
}

async function downloadOfficialAsset(platformKey, source) {
  const response = await fetch(source, {
    headers: {
      Accept: "image/avif,image/webp,image/svg+xml,image/png,image/*,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/127 Safari/537.36",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`${platformKey}: ${response.status} ${response.statusText}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const detectedExtension = detectExtension(bytes);
  if (!detectedExtension) {
    throw new Error(`${platformKey}: official URL did not return a supported image`);
  }

  return { bytes, detectedExtension };
}

await mkdir(OUTPUT_DIR, { recursive: true });

const requestedPlatformKeys = new Set(process.argv.slice(2));
const logoEntries = Object.entries(LOGO_SOURCES).filter(
  ([platformKey]) =>
    requestedPlatformKeys.size === 0 || requestedPlatformKeys.has(platformKey),
);

if (
  requestedPlatformKeys.size > 0 &&
  logoEntries.length !== requestedPlatformKeys.size
) {
  const knownKeys = new Set(Object.keys(LOGO_SOURCES));
  const unknownKeys = [...requestedPlatformKeys].filter((key) => !knownKeys.has(key));
  throw new Error(`Unknown platform key(s): ${unknownKeys.join(", ")}`);
}

for (const [platformKey, { source, filename }] of logoEntries) {
  let { bytes, detectedExtension } = await downloadOfficialAsset(
    platformKey,
    source,
  );

  if (platformKey === "joyagoo") {
    // The official file includes large decorative arrows on both sides. Keep
    // the central official wordmark so it remains legible inside a square badge.
    bytes = await sharp(bytes)
      .extract({ left: 480, top: 0, width: 640, height: 320 })
      .png()
      .toBuffer();
  } else if (platformKey === "cnshopper") {
    // The official square brand asset has substantial white padding. Trim it
    // so the official mark remains legible inside the compact agent badge.
    bytes = await sharp(bytes)
      .extract({ left: 280, top: 746, width: 1740, height: 961 })
      .png()
      .toBuffer();
  } else if (detectedExtension === ".jpg" && path.extname(filename) === ".png") {
    bytes = await sharp(bytes).png().toBuffer();
  } else if (path.extname(filename) !== detectedExtension) {
    throw new Error(
      `${platformKey}: expected ${path.extname(filename)}, received ${detectedExtension}`,
    );
  }

  await writeFile(path.join(OUTPUT_DIR, filename), bytes);
  console.log(`${filename} <- ${source}`);
}

const faviconEntries = Object.entries(FAVICON_SOURCES).filter(
  ([platformKey]) =>
    requestedPlatformKeys.size === 0 || requestedPlatformKeys.has(platformKey),
);

for (const [platformKey, { source, filename, padToSquare }] of faviconEntries) {
  let { bytes, detectedExtension } = await downloadOfficialAsset(
    platformKey,
    source,
  );

  if (padToSquare) {
    const metadata = await sharp(bytes).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error(`${platformKey}: favicon dimensions are unavailable`);
    }
    const size = Math.max(48, metadata.width, metadata.height);
    const horizontal = size - metadata.width;
    const vertical = size - metadata.height;
    bytes = await sharp(bytes)
      .extend({
        top: Math.floor(vertical / 2),
        bottom: Math.ceil(vertical / 2),
        left: Math.floor(horizontal / 2),
        right: Math.ceil(horizontal / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    detectedExtension = ".png";
  }

  if (path.extname(filename) !== detectedExtension) {
    throw new Error(
      `${platformKey}: expected ${path.extname(filename)}, received ${detectedExtension}`,
    );
  }

  await writeFile(path.join(OUTPUT_DIR, filename), bytes);
  console.log(`${filename} <- ${source}`);
}
