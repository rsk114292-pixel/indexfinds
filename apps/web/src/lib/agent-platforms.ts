export interface AgentPlatformDefinition {
  key: string;
  name: string;
  officialUrl: string;
}

export const AGENT_PLATFORMS: AgentPlatformDefinition[] = [
  { key: 'loongbuy', name: 'Loongbuy', officialUrl: 'https://www.loongbuy.com' },
  { key: 'kakobuy', name: 'Kakobuy', officialUrl: 'https://kakobuy.com' },
  { key: 'lovegobuy', name: 'Lovegobuy', officialUrl: 'https://www.lovegobuy.com' },
  { key: 'litbuy', name: 'Litbuy', officialUrl: 'https://litbuy.com' },
  { key: 'joyagoo', name: 'Joyagoo', officialUrl: 'https://joyagoo.com' },
  { key: 'sugargoo', name: 'Sugargoo', officialUrl: 'https://www.sugargoo.com' },
  { key: 'rizzitgo', name: 'RizzitGo', officialUrl: 'https://rizzitgo.com' },
  { key: 'oopbuy', name: 'Oopbuy', officialUrl: 'https://oopbuy.com' },
  { key: 'superbuy', name: 'Superbuy', officialUrl: 'https://www.superbuy.com' },
  { key: 'usfans', name: 'USFans', officialUrl: 'https://www.usfans.com' },
  { key: 'hipobuy', name: 'Hipobuy', officialUrl: 'https://hipobuy.com' },
  { key: 'boonbuy', name: 'Boonbuy', officialUrl: 'https://boonbuy.com' },
  { key: 'cssbuy', name: 'CSSBuy', officialUrl: 'https://www.cssbuy.com' },
  { key: 'pikobuy', name: 'Pikobuy', officialUrl: 'https://www.pikobuy.com' },
  { key: 'esgobuy', name: 'ESGOBuy', officialUrl: 'https://www.esgobuy.com' },
  { key: 'hubbuycn', name: 'HubbuyCN', officialUrl: 'https://www.hubbuycn.com' },
  { key: 'fishgoo', name: 'Fishgoo', officialUrl: 'https://www.fishgoo.com' },
  { key: 'mycnbox', name: 'MyCNBox', officialUrl: 'https://mycnbox.com' },
  { key: 'ootdbuy', name: 'OOTDBuy', officialUrl: 'https://ootdbuy.com' },
  { key: 'fansbuy', name: 'Fansbuy', officialUrl: 'https://fansbuy.com' },
  { key: 'lolobuy', name: 'Lolobuy', officialUrl: 'https://www.lolobuy.com' },
];

export function getAgentPlatform(
  key: string,
): AgentPlatformDefinition | undefined {
  return AGENT_PLATFORMS.find((platform) => platform.key === key.toLowerCase());
}
