const KNOWN_BOT_PATTERNS = [
  'bot',
  'crawl',
  'crawler',
  'spider',
  'slurp',
  'preview',
  'headless',
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'linkedinbot',
  'slackbot',
  'discordbot',
  'telegrambot',
  'whatsapp',
  'pinterest',
  'curl',
  'wget',
  'python',
  'node-fetch',
  'go-http-client',
  'axios',
  'uptime',
  'healthcheck',
  'monitor',
];

export function isLikelyBotUserAgent(userAgent?: string | null): boolean {
  if (!userAgent) return false;

  const ua = userAgent.toLowerCase();
  return KNOWN_BOT_PATTERNS.some((pattern) => ua.includes(pattern));
}
